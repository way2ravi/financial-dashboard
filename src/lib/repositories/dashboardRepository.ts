import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type {
  AnalystPriceTargetsSnapshot,
  AnalystRatingsSnapshot,
  CompanyNewsArticle,
  DashboardData,
  EarningsQuarterly,
  FundamentalsSnapshot,
  OhlcDaily,
  QuoteLatest,
  Ticker,
} from "@/lib/types/market";
import {
  mapAnalystPriceTargets,
  mapAnalystRatings,
  mapEarnings,
  mapFundamentals,
  mapCompanyNews,
  mapOhlc,
  mapQuoteLatest,
} from "./mappers";

type DbClient = SupabaseClient<Database>;

export async function getCachedDashboardData(
  supabase: DbClient,
  ticker: Ticker,
  options: { earningsLimit?: number; ohlcLimit?: number } = {}
): Promise<DashboardData> {
  const earningsLimit = options.earningsLimit ?? 4;
  const ohlcLimit = options.ohlcLimit ?? 180;

  const [
    quote,
    analystRatings,
    analystPriceTargets,
    earnings,
    fundamentals,
    ohlc,
    news,
  ] = await Promise.all([
    getLatestQuote(supabase, ticker.id),
    getLatestAnalystRatings(supabase, ticker.id),
    getLatestAnalystPriceTargets(supabase, ticker.id),
    getQuarterlyEarnings(supabase, ticker.id, earningsLimit),
    getLatestFundamentals(supabase, ticker.id),
    getDailyOhlc(supabase, ticker.id, ohlcLimit),
    getCompanyNews(supabase, ticker.id, 8),
  ]);

  return {
    ticker,
    quote,
    analystRatings,
    analystPriceTargets,
    earnings,
    fundamentals,
    ohlc,
    news,
  };
}

export async function getLatestQuote(
  supabase: DbClient,
  tickerId: number
): Promise<QuoteLatest | null> {
  const { data, error } = await supabase
    .from("quotes_latest")
    .select("*")
    .eq("ticker_id", tickerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapQuoteLatest(data) : null;
}

export async function getLatestAnalystRatings(
  supabase: DbClient,
  tickerId: number
): Promise<AnalystRatingsSnapshot | null> {
  const { data, error } = await supabase
    .from("analyst_ratings_snapshot")
    .select("*")
    .eq("ticker_id", tickerId)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAnalystRatings(data) : null;
}

export async function getLatestAnalystPriceTargets(
  supabase: DbClient,
  tickerId: number
): Promise<AnalystPriceTargetsSnapshot | null> {
  const { data, error } = await supabase
    .from("analyst_price_targets_snapshot")
    .select("*")
    .eq("ticker_id", tickerId)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAnalystPriceTargets(data) : null;
}

export async function getQuarterlyEarnings(
  supabase: DbClient,
  tickerId: number,
  limit = 4
): Promise<EarningsQuarterly[]> {
  const { data, error } = await supabase
    .from("earnings_quarterly")
    .select("*")
    .eq("ticker_id", tickerId)
    .order("fiscal_year", { ascending: false })
    .order("fiscal_quarter", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapEarnings);
}

export async function getLatestFundamentals(
  supabase: DbClient,
  tickerId: number
): Promise<FundamentalsSnapshot | null> {
  const { data, error } = await supabase
    .from("fundamentals_snapshot")
    .select("*")
    .eq("ticker_id", tickerId)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapFundamentals(data) : null;
}

export async function getDailyOhlc(
  supabase: DbClient,
  tickerId: number,
  limit = 180
): Promise<OhlcDaily[]> {
  const { data, error } = await supabase
    .from("ohlc_daily")
    .select("*")
    .eq("ticker_id", tickerId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapOhlc).reverse();
}

export async function getCompanyNews(
  supabase: DbClient,
  tickerId: number,
  limit = 8
): Promise<CompanyNewsArticle[]> {
  const { data, error } = await supabase
    .from("company_news")
    .select("*")
    .eq("ticker_id", tickerId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingCompanyNewsTableError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map(mapCompanyNews);
}

function isMissingCompanyNewsTableError(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.message?.includes("company_news") ||
    error.message?.includes("schema cache")
  );
}
