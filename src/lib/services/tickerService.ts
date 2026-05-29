import type { SupabaseClient } from "@supabase/supabase-js";
import {
  searchAlphaVantageSymbols,
  searchFinnhubSymbols,
  searchTwelveDataSymbols,
} from "@/lib/providers";
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

  const providerResults = await searchTickerProviders(
    supabase,
    normalizedQuery,
    normalizedLimit
  );

  if (providerResults.length === 0) {
    return cachedResults;
  }

  const tickers = await upsertTickerSearchResults(supabase, providerResults);

  return tickers.slice(0, normalizedLimit);
}

async function searchTickerProviders(
  supabase: DbClient,
  query: string,
  limit: number
) {
  const providers = [
    { provider: "finnhub", run: () => searchFinnhubSymbols(query, limit) },
    { provider: "twelve_data", run: () => searchTwelveDataSymbols(query, limit) },
    { provider: "alpha_vantage", run: () => searchAlphaVantageSymbols(query, limit) },
  ];

  for (const provider of providers) {
    try {
      const results = await provider.run();

      if (results.length > 0) {
        await logSymbolSearch(supabase, query, "success", undefined, provider.provider);
        return results;
      }
    } catch (error) {
      await logSymbolSearch(supabase, query, "error", error, provider.provider);
    }
  }

  return [];
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
  error?: unknown,
  provider = "provider_fallback"
) {
  try {
    await logProviderFetch(supabase, {
      provider,
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
