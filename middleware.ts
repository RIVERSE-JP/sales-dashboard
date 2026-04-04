import { NextRequest, NextResponse } from "next/server";

const REFRESH_COOKIE = "X-REFRESH-TOKEN";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasRefreshCookie = Boolean(req.cookies.get(REFRESH_COOKIE)?.value);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasRefreshCookie ? "/dashboard" : "/login", req.url),
    );
  }

  if (pathname === "/login" && hasRefreshCookie) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname === "/login" || pathname.startsWith("/health")) {
    return NextResponse.next();
  }

  if (!hasRefreshCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|health).*)"],
};
