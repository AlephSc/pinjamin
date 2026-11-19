import { NextResponse } from "next/server";
import { ApiError } from "@/lib/server/api/errors";
import { api, assertSameOrigin, readJson } from "@/lib/server/api/http";
import { sessionCookie, signIn, LOGIN_CSRF_COOKIE, validLoginCsrf } from "@/lib/server/auth";

export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    if (!validLoginCsrf(request)) throw new ApiError(403, "CSRF_FAILED", "Permintaan masuk tidak valid. Muat ulang halaman.");
    const input = await readJson(request);
    if (typeof input.email !== "string" || typeof input.password !== "string" || input.email.length > 254 || input.password.length > 1024) {
      throw new ApiError(400, "INVALID_INPUT", "Email atau kata sandi tidak valid.");
    }
    const { token: sessionToken, user } = await signIn(input.email.trim(), input.password);
    const response = NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
    const cookie = sessionCookie(sessionToken);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    response.cookies.set(LOGIN_CSRF_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 0 });
    return response;
  });
}
