import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedDashboardData } from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type { DashboardData } from "@/lib/types/market";
import { getTickerBySymbol } from "./tickerService";

type DbClient = SupabaseClient<Database>;

export async function getDashboardBySymbol(
  supabase: DbClient,
  symbol: string
): Promise<DashboardData> {
  const ticker = await getTickerBySymbol(supabase, symbol);

  return getCachedDashboardData(supabase, ticker, {
    earningsLimit: 4,
    ohlcLimit: 180,
  });
}

