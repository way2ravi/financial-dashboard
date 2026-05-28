"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addSymbolToWatchlist, isAppError, removeSymbolFromWatchlist } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export async function addCurrentSymbolToWatchlist(formData: FormData) {
  const symbol = getSymbol(formData);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await addSymbolToWatchlist(supabase, user, symbol);
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(dashboardMessageUrl(symbol, "error", getActionErrorMessage(error)));
  }

  redirect(dashboardMessageUrl(symbol, "notice", `${symbol} added to watchlist`));
}

export async function removeCurrentSymbolFromWatchlist(formData: FormData) {
  const symbol = getSymbol(formData);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await removeSymbolFromWatchlist(supabase, user, symbol);
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(dashboardMessageUrl(symbol, "error", getActionErrorMessage(error)));
  }

  redirect(dashboardMessageUrl(symbol, "notice", `${symbol} removed from watchlist`));
}

function getSymbol(formData: FormData) {
  const value = formData.get("symbol");
  return typeof value === "string" ? value.trim().toUpperCase() : "";
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

function dashboardMessageUrl(
  symbol: string,
  type: "error" | "notice",
  message: string
) {
  const params = new URLSearchParams({
    symbol,
    [type]: message,
  });

  return `/dashboard?${params.toString()}`;
}
