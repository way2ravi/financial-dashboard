"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/auth/siteOrigin";

export async function signIn(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");

  if (!email || !password) {
    redirect(loginMessageUrl("error", "Email and password are required"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(loginMessageUrl("error", error.message));
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");
  const displayName = getFormString(formData, "display_name");

  if (!email || !password) {
    redirect(loginMessageUrl("error", "Email and password are required"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: await confirmationRedirectUrl(),
      data: { display_name: displayName || email },
    },
  });

  if (error) {
    redirect(loginMessageUrl("error", error.message));
  }

  if (data.user) {
    const untypedSupabase = supabase as SupabaseClient;

    await untypedSupabase.from("users_profile").upsert({
      id: data.user.id,
      display_name: displayName || email,
      role: "user",
    });
  }

  redirect(
    loginMessageUrl(
      "notice",
      "Account created. Check your email if confirmation is enabled, then sign in."
    )
  );
}

export async function resendConfirmation(formData: FormData) {
  const email = getFormString(formData, "email");

  if (!email) {
    redirect(loginMessageUrl("error", "Enter your email address to request a new confirmation link."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: await confirmationRedirectUrl() },
  });

  if (error) {
    redirect(loginMessageUrl("error", error.message));
  }

  redirect(loginMessageUrl("notice", "If your account needs confirmation, a new link has been sent. Use the latest email."));
}

async function confirmationRedirectUrl() {
  const origin = getSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, (await headers()).get("origin"));
  return `${origin}/auth/callback`;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect(loginMessageUrl("notice", "Signed out"));
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function loginMessageUrl(type: "error" | "notice", message: string) {
  return `/login?${new URLSearchParams({ [type]: message }).toString()}`;
}
