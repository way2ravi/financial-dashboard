"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/modules/institutional-intelligence/server/auth";
import { passwordIsValid } from "@/modules/institutional-intelligence/auth/recovery";

export async function updateResearchPassword(form: FormData) {
  const owner = await requireOwner().catch(() => null);
  if (!owner)
    redirect("/institutional-intelligence/forgot-password?error=session");
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmation") ?? "");
  if (!passwordIsValid(password, confirmation))
    redirect("/institutional-intelligence/reset-password?error=validation");
  const { error } = await owner.client.auth.updateUser({ password });
  if (error)
    redirect("/institutional-intelligence/reset-password?error=update");
  const signedOut = await owner.client.auth.signOut({ scope: "global" });
  if (signedOut.error) {
    await owner.client.auth.signOut({ scope: "local" });
    redirect(
      "/institutional-intelligence/login?notice=password-updated-sessions",
    );
  }
  redirect("/institutional-intelligence/login?notice=password-updated");
}
