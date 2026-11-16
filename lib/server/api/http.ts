import type { Role, SessionUser } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown): Response {
  const known = error instanceof ApiError ? error : null;
  if (!known) console.error("API request failed", error);
  return Response.json(
    { error: { code: known?.code ?? "INTERNAL_ERROR", message: known?.message ?? "Terjadi kesalahan pada server." } },
    { status: known?.status ?? 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function api<T>(work: () => Promise<T>, status = 200): Promise<Response> {
  try {
    return Response.json(await work(), { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}

/** Auth seam: replace with the application's verified server session resolver. Never trust client-supplied role/ID headers. */
async function getSessionUser(): Promise<SessionUser | null> {
  // No session/auth implementation exists yet. Deliberately fail closed until one is wired here.
  return null;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "SESSION_REQUIRED", "Authentication required; no server session is configured.");
  if (!roles.includes(user.role)) throw new ApiError(403, "FORBIDDEN", "Role is not permitted for this operation.");
  return user;
}

export function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_BODY", "Request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return objectBody(await request.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "Request body must contain valid JSON.");
  }
}

export function positiveInt(value: unknown, name: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new ApiError(400, "INVALID_INPUT", `${name} must be a positive integer.`);
  return n;
}

export function text(value: unknown, name: string, max: number, optional = false): string | null {
  if (optional && value == null) return null;
  if (typeof value !== "string") throw new ApiError(400, "INVALID_INPUT", `${name} must be text.`);
  const result = value.trim();
  if (!result || result.length > max) throw new ApiError(400, "INVALID_INPUT", `${name} must contain 1-${max} characters.`);
  return result;
}

export function isoDate(value: unknown, name: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, "INVALID_INPUT", `${name} must use YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, "INVALID_INPUT", `${name} must be a valid calendar date.`);
  }
  return value;
}
