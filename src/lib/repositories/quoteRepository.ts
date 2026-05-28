import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { ProviderQuote, Ticker } from "@/lib/types/market";

type DbClient = SupabaseClient<Database>;

export async function upsertLatestQuote(
  supabase: DbClient,
  ticker: Ticker,
  quote: ProviderQuote
): Promise<void> {
  const { error } = await supabase.from("quotes_latest").upsert(
    {
      ticker_id: ticker.id,
      price: quote.price,
      change: quote.change,
      change_percent: quote.changePercent,
      previous_close: quote.previousClose,
      open: quote.open,
      day_high: quote.dayHigh,
      day_low: quote.dayLow,
      volume: quote.volume,
      source: quote.source,
      source_updated_at: quote.sourceUpdatedAt,
      fetched_at: new Date().toISOString(),
    },
    {
      onConflict: "ticker_id",
    }
  );

  if (error) {
    throw error;
  }
}

