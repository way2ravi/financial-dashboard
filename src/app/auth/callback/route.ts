import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/auth/siteOrigin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, url.origin);
  const destination = new URL("/login", origin);
  destination.searchParams.set("error", "This confirmation link is invalid or has expired. Try signing in if you already confirmed, or request a new confirmation email below.");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (!url.searchParams.has("error") && (code || (tokenHash && (type === "email" || type === "signup")))) {
    try {
      const supabase = await createClient();
      const { error } = tokenHash && (type === "email" || type === "signup")
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : await supabase.auth.exchangeCodeForSession(code!);

      if (!error) {
        destination.searchParams.delete("error");
        destination.searchParams.set("notice", "Email confirmed. Your account is ready.");
      }
    } catch {
      destination.searchParams.set("error", "We could not complete email confirmation. Try signing in, or request a new confirmation email below.");
    }
  }

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
