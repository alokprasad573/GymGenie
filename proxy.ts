import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/workout",
  "/history",
  "/analytics",
  "/profile",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Proxy provides early navigation redirect only.
  // Every Server Component and API Route Handler independently verifies the JWT signature.
  const hasAccessCookie = Boolean(request.cookies.get("gg_access")?.value);
  if (!hasAccessCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workout/:path*",
    "/history/:path*",
    "/analytics/:path*",
    "/profile/:path*",
  ],
};
