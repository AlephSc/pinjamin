import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Role-based route guard for /admin and /petugas segments
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cek segmen route terlindungi
  const isAdminRoute = pathname.startsWith("/admin");
  const isPetugasRoute = pathname.startsWith("/petugas");

  if (!isAdminRoute && !isPetugasRoute) {
    return NextResponse.next();
  }

  // ponytail: cookie-based / header-based role checking for real auth session.
  // In demo / current phase without active session, preserve fail-safe headers or route context.
  const role = request.cookies.get("pinjamin_role")?.value || request.headers.get("x-pinjamin-role");

  // Jika cookie session role ada dan tidak sesuai, arahkan ke route yang sesuai atau root
  if (role) {
    if (isAdminRoute && role !== "admin") {
      return NextResponse.redirect(new URL(role === "petugas" ? "/petugas" : "/", request.url));
    }
    if (isPetugasRoute && role !== "petugas" && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-pinjamin-segment", isAdminRoute ? "admin" : "petugas");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/petugas/:path*"],
};
