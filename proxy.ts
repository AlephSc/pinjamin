import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/server/auth";

export async function proxy(request: NextRequest) {
  let user;
  try {
    user = await getSessionUserFromRequest(request);
  } catch {
    return new NextResponse("Authentication service unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/masuk", request.url));
    if (user.role !== "admin") return NextResponse.redirect(new URL(user.role === "petugas" ? "/petugas" : "/", request.url));
  }
  if (path.startsWith("/petugas")) {
    if (!user) return NextResponse.redirect(new URL("/masuk", request.url));
    if (user.role === "peminjam") return NextResponse.redirect(new URL("/", request.url));
  }
  if (path === "/masuk" && user) return NextResponse.redirect(new URL(user.role === "admin" ? "/admin" : user.role === "petugas" ? "/petugas" : "/", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/petugas/:path*", "/masuk"] };
