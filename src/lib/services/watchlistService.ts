import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  addWatchlistItem,
  findTickerBySymbol,
  getUserWatchlist,
  removeWatchlistItem,
} from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type { WatchlistItem } from "@/lib/types/market";
import { AppError } from "./errors";

type DbClient = SupabaseClient<Database>;

export async function getWatchlistForUser(
  supabase: DbClient,
  user: User | null
): Promise<WatchlistItem[]> {
  if (!user) {
    return [];
  }

  return getUserWatchlist(supabase, user.id);
}

export async function addSymbolToWatchlist(
  supabase: DbClient,
  user: User | null,
  symbol: string
): Promise<void> {
  if (!user) {
    throw new AppError("You must be signed in to update your watchlist", 401);
  }

  const ticker = await findTickerBySymbol(supabase, symbol);

  if (!ticker) {
    throw new AppError(`Ticker ${symbol.toUpperCase()} was not found`, 404);
  }

  await addWatchlistItem(supabase, user.id, ticker.id);
}

export async function removeSymbolFromWatchlist(
  supabase: DbClient,
  user: User | null,
  symbol: string
): Promise<void> {
  if (!user) {
    throw new AppError("You must be signed in to update your watchlist", 401);
  }

  const ticker = await findTickerBySymbol(supabase, symbol);

  if (!ticker) {
    throw new AppError(`Ticker ${symbol.toUpperCase()} was not found`, 404);
  }

  await removeWatchlistItem(supabase, user.id, ticker.id);
}

