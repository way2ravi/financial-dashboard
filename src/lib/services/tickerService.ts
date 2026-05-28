import type { SupabaseClient } from "@supabase/supabase-js";
import { findTickerBySymbol, searchTickers } from "@/lib/repositories";
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

  return searchTickers(supabase, normalizedQuery, normalizeLimit(limit));
}

function normalizeLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 25);
}
