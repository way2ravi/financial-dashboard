import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { isComingSoonMode } from "@/lib/launch";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const privateResearch=pathname==="/institutional-intelligence" || pathname.startsWith("/institutional-intelligence/") || pathname==="/api/institutional-intelligence" || pathname.startsWith("/api/institutional-intelligence/");
  request.headers.set("x-way2-private-research",privateResearch ? "1" : "0");

  if (!privateResearch && isComingSoonMode(request.headers.get("host") ?? request.nextUrl.hostname)) {
    // Keep launch assets and the authenticated scheduled refresh available.
    if (
      pathname === "/coming-soon" ||
      pathname === "/manifest.webmanifest" ||
      pathname === "/robots.txt" ||
      pathname === "/api/cron/refresh"
    ) {
      return NextResponse.next();
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Way2Investing is coming soon. Testing and analysis are in progress." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const destination = request.nextUrl.clone();
    destination.pathname = "/coming-soon";
    destination.search = "";
    const redirect = NextResponse.redirect(destination, 307);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  if (pathname === "/coming-soon") {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  if(privateResearch) {
    response.headers.set("X-Robots-Tag","noindex, nofollow, noarchive");
    response.headers.set("Cache-Control","private, no-store, max-age=0");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

