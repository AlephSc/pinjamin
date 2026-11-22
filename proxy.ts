import { NextResponse, type NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/server/auth";
import { requestOrigin } from "@/lib/server/api/http";

function appPath(request: NextRequest, path: string) {
  return new URL(path, `${requestOrigin(request)}/`);
}

export async function proxy(request: NextRequest) {
  let user;
  try {
    user = await getSessionUserFromRequest(request);
  } catch {
    return new NextResponse("Authentication service unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(appPath(request, "/masuk"));
    if (user.role !== "admin") return NextResponse.redirect(appPath(request, user.role === "petugas" ? "/petugas" : "/"));
  }
  if (path.startsWith("/petugas")) {
    if (!user) return NextResponse.redirect(appPath(request, "/masuk"));
    if (user.role === "peminjam") return NextResponse.redirect(appPath(request, "/"));
  }
  if (path === "/masuk" && user) return NextResponse.redirect(appPath(request, user.role === "admin" ? "/admin" : user.role === "petugas" ? "/petugas" : "/"));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/petugas/:path*", "/masuk"] };
