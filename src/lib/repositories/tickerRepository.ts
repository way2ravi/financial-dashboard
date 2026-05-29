import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type {
  ProviderCompanyProfile,
  ProviderTickerSearchResult,
  Ticker,
} from "@/lib/types/market";
import { mapTicker } from "./mappers";

type DbClient = SupabaseClient<Database>;

const TICKER_COLUMNS = "id,symbol,exchange,name,sector,industry,currency,logo_url,is_active,created_at,updated_at";
const BASE_TICKER_COLUMNS = "id,symbol,exchange,name,sector,industry,currency,is_active,created_at,updated_at";

export async function findTickerBySymbol(
  supabase: DbClient,
  symbol: string
): Promise<Ticker | null> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    return null;
  }

  let { data, error } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .eq("symbol", normalizedSymbol)
    .eq("is_active", true)
    .maybeSingle();

  if (isMissingLogoColumn(error)) {
    const retry = await supabase
      .from("tickers")
      .select(BASE_TICKER_COLUMNS)
      .eq("symbol", normalizedSymbol)
      .eq("is_active", true)
      .maybeSingle();

    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    throw error;
  }

  return data ? mapTicker(data) : null;
}

export async function findTickersBySymbols(
  supabase: DbClient,
  symbols: string[]
): Promise<Ticker[]> {
  const normalizedSymbols = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ];

  if (normalizedSymbols.length === 0) {
    return [];
  }

  let { data, error } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .in("symbol", normalizedSymbols)
    .eq("is_active", true);

  if (isMissingLogoColumn(error)) {
    const retry = await supabase
      .from("tickers")
      .select(BASE_TICKER_COLUMNS)
      .in("symbol", normalizedSymbols)
      .eq("is_active", true);

    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTicker(row));
}

export async function ensureTickersBySymbols(
  supabase: DbClient,
  symbols: string[]
): Promise<Ticker[]> {
  const normalizedSymbols = [
    ...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)),
  ];

  if (normalizedSymbols.length === 0) {
    return [];
  }

  let { data, error } = await supabase
    .from("tickers")
    .upsert(
      normalizedSymbols.map((symbol) => ({
        symbol,
        exchange: "US",
        name: null,
        sector: null,
        industry: null,
        currency: "USD",
        logo_url: null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "symbol" }
    )
    .select(TICKER_COLUMNS);

  if (isMissingLogoColumn(error)) {
    const retry = await supabase
      .from("tickers")
      .upsert(
        normalizedSymbols.map((symbol) => ({
          symbol,
          exchange: "US",
          name: null,
          sector: null,
          industry: null,
          currency: "USD",
          is_active: true,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "symbol" }
      )
      .select(BASE_TICKER_COLUMNS);

    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTicker(row));
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

  let { data, error } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .eq("is_active", true)
    .or(`symbol.ilike.${pattern},name.ilike.${pattern}`)
    .order("symbol", { ascending: true })
    .limit(limit);

  if (isMissingLogoColumn(error)) {
    const retry = await supabase
      .from("tickers")
      .select(BASE_TICKER_COLUMNS)
      .eq("is_active", true)
      .or(`symbol.ilike.${pattern},name.ilike.${pattern}`)
      .order("symbol", { ascending: true })
      .limit(limit);

    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTicker(row));
}

export async function upsertTickerSearchResults(
  supabase: DbClient,
  results: ProviderTickerSearchResult[]
): Promise<Ticker[]> {
  const uniqueResults = dedupeTickerSearchResults(results);

  if (uniqueResults.length === 0) {
    return [];
  }

  const rows = uniqueResults.map((result) => ({
    symbol: result.symbol,
    exchange: result.exchange,
    name: result.description,
    sector: null,
    industry: result.type,
    currency: "USD",
    logo_url: null,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  let { data, error } = await supabase
    .from("tickers")
    .upsert(rows, { onConflict: "symbol" })
    .select(TICKER_COLUMNS);

  if (isMissingLogoColumn(error)) {
    const retry = await supabase
      .from("tickers")
      .upsert(
        rows.map((row) => omitLogoUrl(row)),
        { onConflict: "symbol" }
      )
      .select(BASE_TICKER_COLUMNS);

    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTicker(row));
}

export async function updateTickerProfile(
  supabase: DbClient,
  ticker: Ticker,
  profile: ProviderCompanyProfile
): Promise<Ticker> {
  let { data, error } = await supabase
    .from("tickers")
    .update({
      exchange: profile.exchange ?? ticker.exchange,
      name: profile.name ?? ticker.name,
      industry: profile.industry ?? ticker.industry,
      currency: profile.currency ?? ticker.currency,
      logo_url: profile.logoUrl ?? ticker.logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticker.id)
    .select(TICKER_COLUMNS)
    .single();

  if (isMissingLogoColumn(error)) {
    const retry = await supabase
      .from("tickers")
      .update({
        exchange: profile.exchange ?? ticker.exchange,
        name: profile.name ?? ticker.name,
        industry: profile.industry ?? ticker.industry,
        currency: profile.currency ?? ticker.currency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticker.id)
      .select(BASE_TICKER_COLUMNS)
      .single();

    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Ticker ${ticker.symbol} could not be updated`);
  }

  return mapTicker(data);
}

function dedupeTickerSearchResults(results: ProviderTickerSearchResult[]) {
  return [...new Map(results.map((result) => [result.symbol, result])).values()];
}

export async function getActiveTickers(
  supabase: DbClient,
  limit = 10
): Promise<Ticker[]> {
  let { data, error } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .eq("is_active", true)
    .order("symbol", { ascending: true })
    .limit(limit);

  if (isMissingLogoColumn(error)) {
    const retry = await supabase
      .from("tickers")
      .select(BASE_TICKER_COLUMNS)
      .eq("is_active", true)
      .order("symbol", { ascending: true })
      .limit(limit);

    data = retry.data as typeof data;
    error = retry.error;
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapTicker(row));
}

function omitLogoUrl<T extends { logo_url?: string | null }>(row: T) {
  const { logo_url: _logoUrl, ...rest } = row;

  void _logoUrl;

  return rest;
}

function isMissingLogoColumn(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("logo_url")
  );
}
