import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { Ticker } from "@/lib/types/market";
import { mapTicker } from "./mappers";

type DbClient = SupabaseClient<Database>;

const TICKER_COLUMNS = "id,symbol,exchange,name,sector,industry,currency,is_active,created_at,updated_at";

export async function findTickerBySymbol(
  supabase: DbClient,
  symbol: string
): Promise<Ticker | null> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    return null;
  }

  const { data, error } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .eq("symbol", normalizedSymbol)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapTicker(data) : null;
}

export async function searchTickers(
  supabase: DbClient,
  query: string,
  limit = 10
): Promise<Ticker[]> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 1) {
    return [];
  }

  const pattern = `%${normalizedQuery.replaceAll(",", " ")}%`;

  const { data, error } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .eq("is_active", true)
    .or(`symbol.ilike.${pattern},name.ilike.${pattern}`)
    .order("symbol", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTicker);
}

export async function getActiveTickers(
  supabase: DbClient,
  limit = 10
): Promise<Ticker[]> {
  const { data, error } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .eq("is_active", true)
    .order("symbol", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapTicker);
}
