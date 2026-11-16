"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/modules/institutional-intelligence/server/auth";
export async function researchSignIn(form: FormData) {
  const email = String(form.get("email") ?? "")
      .trim()
      .slice(0, 320),
    password = String(form.get("password") ?? "").slice(0, 2048);
  const client = await createClient();
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error) redirect("/institutional-intelligence/login?error=1");
  try {
    await requireOwner();
  } catch {
    await client.auth.signOut();
    redirect("/institutional-intelligence/login?error=1");
  }
  redirect("/institutional-intelligence");
}
export async function researchSignOut() {
  const client = await createClient();
  await client.auth.signOut();
  redirect("/institutional-intelligence/login");
}
