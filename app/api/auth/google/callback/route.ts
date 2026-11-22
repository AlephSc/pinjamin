import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/server/api/errors";
import { requestOrigin } from "@/lib/server/api/http";
import { withTransaction, query } from "@/lib/server/db";
import { issueToken, sessionCookie } from "@/lib/server/auth";
import { clearGoogleCookies, exchangeGoogleCode, googleOAuthConfig } from "@/lib/server/google-auth";
import type { Role, SessionUser } from "@/lib/types";
import type { QueryResultRow } from "pg";

const callbackSchema = z.object({
  code: z.string().trim().min(1).max(2048),
  state: z.string().trim().min(1).max(1024),
});

const roles: Role[] = ["admin", "petugas", "peminjam"];
type UserRow = SessionUser & { token_version: number };
type UserQueryResultRow = UserRow & QueryResultRow;

async function recordLog(actor: { id: number; name: string }, action: string, target: string) {
  await query("INSERT INTO activity_logs(actor_id,actor_name,action,target) VALUES($1,$2,$3,$4)", [actor.id, actor.name, action, target]);
}

function appOrigin(request: Request) {
  const origin = requestOrigin(request);
  const host = new URL(origin).hostname;
  if (!host || host === "0.0.0.0" || host === "::") throw new ApiError(400, "INVALID_ORIGIN", "Origin callback tidak valid.");
  return origin;
}

function safeRelativeRedirect(request: Request, path: string) {
  const origin = appOrigin(request);
  const target = new URL(path, `${origin}/`);
  if (target.origin !== origin) throw new ApiError(400, "INVALID_REDIRECT", "Tujuan redirect tidak valid.");
  return target;
}

export async function GET(request: Request) {
  try {
    const config = googleOAuthConfig();
    if (!config?.redirectUri) throw new ApiError(409, "GOOGLE_NOT_CONFIGURED", "Login Google belum diaktifkan.");
    const home = safeRelativeRedirect(request, "/");
    const params = new URL(request.url).searchParams;
    const input = callbackSchema.safeParse({ code: params.get("code") ?? "", state: params.get("state") ?? "" });
    if (!input.success) {
      const response = NextResponse.redirect(safeRelativeRedirect(request, "/masuk"), 303);
      clearGoogleCookies(response);
      return response;
    }
    const identity = await exchangeGoogleCode(request, input.data.code, input.data.state);

    const user = await withTransaction(async (client) => {
      const google = await client.query<UserQueryResultRow>(
        "SELECT id,name,email,role,active,token_version FROM users WHERE google_id=$1 LIMIT 1 FOR UPDATE",
        [identity.sub],
      );
      if (google.rows[0]?.active && roles.includes(google.rows[0].role)) return google.rows[0];

      const email = await client.query<UserQueryResultRow>(
        "SELECT id,name,email,role,active,token_version,provider,google_id FROM users WHERE lower(email)=lower($1) LIMIT 1 FOR UPDATE",
        [identity.email],
      );
      const owner = email.rows[0];
      if (owner?.active && roles.includes(owner.role)) {
        if (owner.provider === "password" || owner.google_id) return owner;
        const linked = await client.query<UserQueryResultRow>(
          "UPDATE users SET google_id=$1,email_verified=true WHERE id=$2 RETURNING id,name,email,role,active,token_version",
          [identity.sub, owner.id],
        );
        return linked.rows[0];
      }
      const created = await client.query<UserQueryResultRow>(
        "INSERT INTO users(name,email,role,password_hash,provider,google_id,email_verified) VALUES($1,$2,$3,NULL,'google',$4,true) RETURNING id,name,email,role,active,token_version",
        [identity.name, identity.email, config.defaultRole, identity.sub],
      );
      return created.rows[0];
    }).catch((reason) => {
      if ((reason as { code?: string }).code === "23505") throw new ApiError(409, "GOOGLE_ACCOUNT_CONFLICT", "Email Google sudah terdaftar dengan metode lain.");
      throw reason;
    });

    if (!user?.active || !roles.includes(user.role)) throw new ApiError(403, "GOOGLE_ACCOUNT_DISABLED", "Akun ini tidak aktif.");
    const token = issueToken(user, Number(user.token_version));
    await recordLog({ id: Number(user.id), name: user.name }, "Masuk dengan Google", user.email);
    const response = NextResponse.redirect(home, 303);
    const cookie = sessionCookie(token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    clearGoogleCookies(response);
    return response;
  } catch (error) {
    const known = error instanceof ApiError ? error : null;
    if (known) console.error("Google login failed", known.code);
    else console.error("Google login failed", error);
    const response = NextResponse.redirect(safeRelativeRedirect(request, "/masuk"), 303);
    clearGoogleCookies(response);
    return response;
  }
}
