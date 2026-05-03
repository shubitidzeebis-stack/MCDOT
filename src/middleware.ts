import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Forwards the request pathname as a header so the root layout can read
// it server-side and emit the right `<html lang>` per locale. Cheap; runs
// on every request and just appends a header.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-pathname", req.nextUrl.pathname);
  return res;
}

// Exclude obvious static assets so we don't run middleware on every img/CSS.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|icon|apple-icon|.*\\..*).*)",
  ],
};
