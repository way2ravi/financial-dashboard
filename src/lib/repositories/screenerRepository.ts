import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { ScreenerResult } from "@/lib/types";

type DbClient = SupabaseClient<Database>;

type CachedScreenerRow = {
  ticker_id: number;
  symbol: string;
  name: string | null;
  exchange: string | null;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  volume: number | null;
  market_cap: number | null;
  pe: number | null;
  year_high: number | null;
  year_low: number | null;
};

export async function getCachedScreenerRows(
  supabase: DbClient
): Promise<ScreenerResult[]> {
  const { data, error } = await supabase.rpc("get_cached_screener_rows");

  if (error) {
    if (isMissingScreenerRpc(error)) {
      return getCachedScreenerRowsFallback(supabase);
    }

    throw error;
  }

  return ((data ?? []) as CachedScreenerRow[]).map(mapCachedScreenerRow);
}

async function getCachedScreenerRowsFallback(
  supabase: DbClient
): Promise<ScreenerResult[]> {
  const { data: quoteRows, error: quoteError } = await supabase
    .from("quotes_latest")
    .select("*");

  if (quoteError) {
    throw quoteError;
  }

  const tickerIds = [...new Set((quoteRows ?? []).map((row) => row.ticker_id))];

  if (tickerIds.length === 0) {
    return [];
  }

  const [tickersResult, fundamentalsResult, ohlcResult] = await Promise.all([
    supabase
      .from("tickers")
      .select("id,symbol,exchange,name")
      .in("id", tickerIds)
      .eq("is_active", true),
    supabase
      .from("fundamentals_snapshot")
      .select("ticker_id,market_cap,pe,as_of_date")
      .in("ticker_id", tickerIds)
      .order("as_of_date", { ascending: false }),
    supabase
      .from("ohlc_daily")
      .select("ticker_id,high,low")
      .in("ticker_id", tickerIds),
  ]);

  if (tickersResult.error) throw tickersResult.error;
  if (fundamentalsResult.error) throw fundamentalsResult.error;
  if (ohlcResult.error) throw ohlcResult.error;

  const tickersById = new Map((tickersResult.data ?? []).map((row) => [row.id, row]));
  const fundamentalsByTickerId = new Map<
    number,
    { market_cap: number | null; pe: number | null }
  >();

  (fundamentalsResult.data ?? []).forEach((row) => {
    if (!fundamentalsByTickerId.has(row.ticker_id)) {
      fundamentalsByTickerId.set(row.ticker_id, {
        market_cap: row.market_cap,
        pe: row.pe,
      });
    }
  });

  const rangeByTickerId = new Map<number, { yearHigh: number | null; yearLow: number | null }>();

  (ohlcResult.data ?? []).forEach((row) => {
    const current = rangeByTickerId.get(row.ticker_id) ?? {
      yearHigh: null,
      yearLow: null,
    };

    rangeByTickerId.set(row.ticker_id, {
      yearHigh: maxNullable(current.yearHigh, row.high),
      yearLow: minNullable(current.yearLow, row.low),
    });
  });

  return (quoteRows ?? []).flatMap((quote) => {
    const ticker = tickersById.get(quote.ticker_id);

    if (!ticker) {
      return [];
    }

    const fundamentals = fundamentalsByTickerId.get(quote.ticker_id);
    const range = rangeByTickerId.get(quote.ticker_id);

    return [
      {
        symbol: ticker.symbol,
        name: ticker.name,
        exchange: ticker.exchange,
        price: quote.price,
        change: quote.change,
        changePercent: quote.change_percent,
        volume: quote.volume,
        marketCap: fundamentals?.market_cap ?? null,
        pe: fundamentals?.pe ?? null,
        yearHigh: range?.yearHigh ?? null,
        yearLow: range?.yearLow ?? null,
        source: "cache",
      },
    ];
  });
}

function mapCachedScreenerRow(row: CachedScreenerRow): ScreenerResult {
  return {
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    price: row.price,
    change: row.change,
    changePercent: row.change_percent,
    volume: row.volume,
    marketCap: row.market_cap,
    pe: row.pe,
    yearHigh: row.year_high,
    yearLow: row.year_low,
    source: "cache",
  };
}

function isMissingScreenerRpc(error: { code?: string; message?: string }) {
  return (
    error.code === "42883" ||
    error.message?.includes("get_cached_screener_rows") ||
    error.message?.includes("schema cache")
  );
}

function maxNullable(a: number | null, b: number | null) {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function minNullable(a: number | null, b: number | null) {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}
