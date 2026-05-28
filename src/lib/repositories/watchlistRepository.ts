import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { WatchlistItem } from "@/lib/types/market";
import { mapTicker, mapWatchlistItem } from "./mappers";

type DbClient = SupabaseClient<Database>;

const TICKER_COLUMNS = "id,symbol,exchange,name,sector,industry,currency,is_active,created_at,updated_at";

export async function getUserWatchlist(
  supabase: DbClient,
  userId: string
): Promise<WatchlistItem[]> {
  const { data: rows, error: rowsError } = await supabase
    .from("user_watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (rowsError) {
    throw rowsError;
  }

  const watchlistRows = rows ?? [];
  const tickerIds = watchlistRows.map((row) => row.ticker_id);

  if (tickerIds.length === 0) {
    return [];
  }

  const { data: tickerRows, error: tickersError } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .in("id", tickerIds);

  if (tickersError) {
    throw tickersError;
  }

  const tickersById = new Map((tickerRows ?? []).map((row) => [row.id, mapTicker(row)]));

  return watchlistRows.flatMap((row) => {
    const ticker = tickersById.get(row.ticker_id);
    return ticker ? [mapWatchlistItem(row, ticker)] : [];
  });
}

export async function addWatchlistItem(
  supabase: DbClient,
  userId: string,
  tickerId: number
): Promise<void> {
  const { error } = await supabase
    .from("user_watchlist")
    .upsert(
      {
        user_id: userId,
        ticker_id: tickerId,
      },
      {
        onConflict: "user_id,ticker_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw error;
  }
}

export async function removeWatchlistItem(
  supabase: DbClient,
  userId: string,
  tickerId: number
): Promise<void> {
  const { error } = await supabase
    .from("user_watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("ticker_id", tickerId);

  if (error) {
    throw error;
  }
}

