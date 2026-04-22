import { NextResponse } from "next/server";

const AUTH_COOKIE = "marketing_auth";
const PUBLIC_PATHS = ["/auth"];
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/api", "/images"];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isStaticPath(pathname) {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const onAuthPage = isPublicPath(pathname);

  if (!hasSessionCookie && !onAuthPage) {
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSessionCookie && onAuthPage) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
