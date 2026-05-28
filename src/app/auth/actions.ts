"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");

  if (!email || !password) {
    redirect("/login?message=Email%20and%20password%20are%20required");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard?symbol=AAPL");
}

export async function signUp(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");
  const displayName = getFormString(formData, "display_name");

  if (!email || !password) {
    redirect("/login?message=Email%20and%20password%20are%20required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
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
    "/login?message=Account%20created.%20Check%20your%20email%20if%20confirmation%20is%20enabled,%20then%20sign%20in."
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/login?message=Signed%20out");
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
