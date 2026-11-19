import { NextResponse } from "next/server";
import { api, assertSameOrigin } from "@/lib/server/api/http";
import { SESSION_COOKIE } from "@/lib/server/auth";

export async function POST(request: Request) {
  return api(async () => {
    assertSameOrigin(request);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  });
}
