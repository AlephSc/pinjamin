import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
export async function GET() {
  const user = await getSessionUser();
  if (user) return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  const csrf = crypto.randomUUID().replaceAll("-", "");
  const response = NextResponse.json({ user: null, csrf }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("pinjamin_login_csrf", csrf, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}

