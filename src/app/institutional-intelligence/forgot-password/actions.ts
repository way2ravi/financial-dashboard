"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  recoveryOrigin,
  recoveryCallbackPath,
} from "@/modules/institutional-intelligence/auth/recovery";

export async function requestResearchPasswordReset(form: FormData) {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const ownerEmail =
    process.env.INSTITUTIONAL_OWNER_EMAIL?.trim().toLowerCase();
  // Never use submitted identity or host headers to choose another recipient/origin.
  if (ownerEmail && email === ownerEmail && email.length <= 320) {
    let failed = false;
    try {
      const origin = recoveryOrigin(process.env.INSTITUTIONAL_AUTH_ORIGIN);
      const client = await createClient();
      const { error } = await client.auth.resetPasswordForEmail(ownerEmail, {
        redirectTo: new URL(recoveryCallbackPath, origin).href,
      });
      failed = Boolean(error);
    } catch {
      failed = true;
    }
    if (failed)
      redirect("/institutional-intelligence/forgot-password?error=send");
  }
  // Same response for non-owner addresses; no account details are disclosed.
  redirect("/institutional-intelligence/forgot-password?sent=1");
}
