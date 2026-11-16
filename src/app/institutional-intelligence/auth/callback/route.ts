import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/modules/institutional-intelligence/server/auth";
import { recoveryOrigin } from "@/modules/institutional-intelligence/auth/recovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let origin: string;
  try {
    origin = recoveryOrigin(process.env.INSTITUTIONAL_AUTH_ORIGIN);
  } catch {
    return new Response("Password recovery is not configured.", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  let destination = "/institutional-intelligence/forgot-password?error=link";
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const recoveryToken =
    url.searchParams.get("type") === "recovery" && tokenHash;
  if (
    url.origin === origin &&
    !url.searchParams.has("error") &&
    ((code && code.length <= 4096) ||
      (recoveryToken && recoveryToken.length <= 4096))
  ) {
    try {
      const client = await createClient();
      const result = recoveryToken
        ? await client.auth.verifyOtp({
            token_hash: recoveryToken,
            type: "recovery",
          })
        : await client.auth.exchangeCodeForSession(code!);
      if (!result.error) {
        try {
          await requireOwner();
          destination = "/institutional-intelligence/reset-password";
        } catch {
          await client.auth.signOut();
        }
      }
    } catch {
      // Do not log recovery codes, tokens, user identities or auth response bodies.
    }
  }
  const response = NextResponse.redirect(new URL(destination, origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
