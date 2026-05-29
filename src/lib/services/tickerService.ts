import type { SupabaseClient } from "@supabase/supabase-js";
import { searchFinnhubSymbols } from "@/lib/providers";
import {
  findTickerBySymbol,
  logProviderFetch,
  searchTickers,
  upsertTickerSearchResults,
} from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type { Ticker } from "@/lib/types/market";
import { AppError } from "./errors";

type DbClient = SupabaseClient<Database>;

export async function getTickerBySymbol(
  supabase: DbClient,
  symbol: string
): Promise<Ticker> {
  const ticker = await findTickerBySymbol(supabase, symbol);

  if (!ticker) {
    throw new AppError(`Ticker ${symbol.toUpperCase()} was not found`, 404);
  }

  return ticker;
}

export async function searchTickerDirectory(
  supabase: DbClient,
  query: string,
  limit = 10
): Promise<Ticker[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 1) {
    return [];
  }

  const normalizedLimit = normalizeLimit(limit);
  const cachedResults = await searchTickers(supabase, normalizedQuery, normalizedLimit);

  if (cachedResults.length > 0) {
    return cachedResults;
  }

  let providerResults = [];

  try {
    providerResults = await searchFinnhubSymbols(normalizedQuery, normalizedLimit);
  } catch (error) {
    await logSymbolSearch(supabase, normalizedQuery, "error", error);

    return cachedResults;
  }

  const tickers = await upsertTickerSearchResults(supabase, providerResults);
  await logSymbolSearch(supabase, normalizedQuery, "success");

  return tickers.slice(0, normalizedLimit);
}

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 25);
}

async function logSymbolSearch(
  supabase: DbClient,
  symbol: string,
  status: "success" | "error",
  error?: unknown
) {
  try {
    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: "symbol-search",
      symbol,
      status,
      errorMessage:
        status === "error"
          ? error instanceof Error
            ? error.message
            : "Unknown symbol search error"
          : undefined,
    });
  } catch {
    // Search should not fail just because provider log writes are unavailable.
  }
}
