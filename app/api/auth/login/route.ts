import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/server/api/errors";
import { api, assertSameOrigin, readJson } from "@/lib/server/api/http";
import { sessionCookie, signIn, LOGIN_CSRF_COOKIE, validLoginCsrf } from "@/lib/server/auth";
import { clientIp, consumeRateLimit } from "@/lib/server/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254).email(),
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    if (!validLoginCsrf(request)) throw new ApiError(403, "CSRF_FAILED", "Permintaan masuk tidak valid. Muat ulang halaman.");
    const input = loginSchema.safeParse(await readJson(request));
    if (!input.success) throw new ApiError(400, "INVALID_INPUT", "Email atau kata sandi tidak valid.");
    await consumeRateLimit(`login:ip:${clientIp(request)}`, 10, 60_000);
    await consumeRateLimit(`login:email:${input.data.email.toLowerCase()}`, 5, 60_000);
    const { token: sessionToken, user } = await signIn(input.data.email, input.data.password);
    const response = NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
    const cookie = sessionCookie(sessionToken);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    response.cookies.set(LOGIN_CSRF_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", maxAge: 0 });
    return response;
  });
}
