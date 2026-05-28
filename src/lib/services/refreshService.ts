import type { SupabaseClient } from "@supabase/supabase-js";
import { getFinnhubQuote } from "@/lib/providers";
import {
  findTickerBySymbol,
  logProviderFetch,
  upsertLatestQuote,
} from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type { ProviderQuote } from "@/lib/types/market";
import { AppError } from "./errors";

type DbClient = SupabaseClient<Database>;

export async function refreshQuoteForSymbol(
  supabase: DbClient,
  symbol: string
): Promise<ProviderQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const ticker = await findTickerBySymbol(supabase, normalizedSymbol);

  if (!ticker) {
    throw new AppError(`Ticker ${normalizedSymbol} was not found`, 404);
  }

  try {
    const quote = await getFinnhubQuote(normalizedSymbol);
    await upsertLatestQuote(supabase, ticker, quote);
    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: "quote",
      symbol: normalizedSymbol,
      status: "success",
    });

    return quote;
  } catch (error) {
    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: "quote",
      symbol: normalizedSymbol,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown provider error",
    });

    throw error;
  }
}

export async function requireAdmin(supabase: DbClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError("You must be signed in", 401);
  }

  const { data: profile, error } = await supabase
    .from("users_profile")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile?.role !== "admin") {
    throw new AppError("Admin access is required", 403);
  }

  return user;
}

