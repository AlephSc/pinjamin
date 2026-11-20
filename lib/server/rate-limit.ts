import { query } from "@/lib/server/db";
import { ApiError } from "@/lib/server/api/errors";

// Persistent token-bucket rate limiter. Counters live in PostgreSQL so they are
// shared across serverless instances (in-memory would reset per invocation).
// Each call consumes one token; refill is continuous at limit/windowMs per ms.
export async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const rate = limit / windowMs;
  const { rows } = await query<{ allowed: boolean; retry_ms: number }>(
    `INSERT INTO rate_limits (key, tokens, updated_at)
     VALUES ($1, $2 - 1, now())
     ON CONFLICT (key) DO UPDATE SET
       tokens = GREATEST(0, LEAST($2, rate_limits.tokens + $3 * EXTRACT(EPOCH FROM (now() - rate_limits.updated_at)) * 1000)) - 1,
       updated_at = now()
     RETURNING (tokens >= 0) AS allowed,
               CASE WHEN tokens >= 0 THEN 0 ELSE CEIL((0 - tokens) / $3)::bigint END AS retry_ms`,
    [key, limit, rate],
  );
  const row = rows[0];
  if (!row || !row.allowed) {
    const retryAfter = Math.max(1, Math.ceil((row?.retry_ms ?? windowMs) / 1000));
    throw new ApiError(429, "RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.", { "Retry-After": String(retryAfter) });
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return request.headers.get("x-real-ip")?.slice(0, 64) || "unknown";
}
