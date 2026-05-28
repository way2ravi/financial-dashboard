"use server";

import { revalidatePath } from "next/cache";
import { addSymbolToWatchlist, removeSymbolFromWatchlist } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export async function addCurrentSymbolToWatchlist(formData: FormData) {
  const symbol = getSymbol(formData);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await addSymbolToWatchlist(supabase, user, symbol);
  revalidatePath("/dashboard");
}

export async function removeCurrentSymbolFromWatchlist(formData: FormData) {
  const symbol = getSymbol(formData);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await removeSymbolFromWatchlist(supabase, user, symbol);
  revalidatePath("/dashboard");
}

function getSymbol(formData: FormData) {
  const value = formData.get("symbol");
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

