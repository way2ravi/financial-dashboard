import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, validSession } from "./lib/password-session";

export function proxy(request: NextRequest) {
  const signedIn = validSession(request.cookies.get(SESSION_COOKIE)?.value);
  let response: NextResponse;
  if (request.nextUrl.pathname === "/login") {
    response = signedIn && request.method === "GET"
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  } else if (!signedIn) {
    response = request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Authentication required" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url), 303);
  } else {
    response = NextResponse.next();
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
