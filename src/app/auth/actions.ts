"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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

  redirect("/dashboard?symbol=AAPL");
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
