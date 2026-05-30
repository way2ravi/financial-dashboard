"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addSymbolToWatchlist, isAppError, removeSymbolFromWatchlist } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export async function addCurrentSymbolToWatchlist(formData: FormData) {
  const symbol = getSymbol(formData);
  const returnTo = getReturnTo(formData);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await addSymbolToWatchlist(supabase, user, symbol);
    revalidatePath("/dashboard");
    revalidatePath("/watchlist");
  } catch (error) {
    redirect(messageUrl(symbol, "error", getActionErrorMessage(error), returnTo));
  }

  redirect(messageUrl(symbol, "notice", `${symbol} added to watchlist`, returnTo));
}

export async function removeCurrentSymbolFromWatchlist(formData: FormData) {
  const symbol = getSymbol(formData);
  const returnTo = getReturnTo(formData);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await removeSymbolFromWatchlist(supabase, user, symbol);
    revalidatePath("/dashboard");
    revalidatePath("/watchlist");
  } catch (error) {
    redirect(messageUrl(symbol, "error", getActionErrorMessage(error), returnTo));
  }

  redirect(messageUrl(symbol, "notice", `${symbol} removed from watchlist`, returnTo));
}

function getSymbol(formData: FormData) {
  const value = formData.get("symbol");
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getReturnTo(formData: FormData) {
  const value = formData.get("return_to");

  return value === "/watchlist" ? value : "/dashboard";
}

function getActionErrorMessage(error: unknown) {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.includes("duplicate key")) {
    return "That ticker is already in your watchlist";
  }

  return "Something went wrong. Please try again.";
}

function messageUrl(
  symbol: string,
  type: "error" | "notice",
  message: string,
  returnTo: "/dashboard" | "/watchlist"
) {
  const params = new URLSearchParams({
    [type]: message,
  });

  if (returnTo === "/watchlist") {
    return `/watchlist?${params.toString()}`;
  }

  params.set("symbol", symbol);

  return `/dashboard?${params.toString()}`;
}
