import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const PROTECTED = [/^\/dashboard(\/|$)/, /^\/admin(\/|$)/, /^\/set-pin(\/|$)/];

export default function proxy(request: NextRequest) {
  if (!PROTECTED.some((re) => re.test(request.nextUrl.pathname))) {
    return NextResponse.next();
  }

  const memberId = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!memberId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
