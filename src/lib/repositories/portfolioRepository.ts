import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { Portfolio, PortfolioTransaction, QuoteLatest, Ticker } from "@/lib/types/market";
import { mapPortfolio, mapPortfolioTransaction, mapQuoteLatest, mapTicker } from "./mappers";

type DbClient = SupabaseClient<Database>;

const TICKER_COLUMNS = "id,symbol,exchange,name,sector,industry,currency,is_active,created_at,updated_at";

export async function getUserPortfolios(
  supabase: DbClient,
  userId: string
): Promise<Portfolio[]> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapPortfolio);
}

export async function getPortfolioById(
  supabase: DbClient,
  userId: string,
  portfolioId: number
): Promise<Portfolio | null> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", portfolioId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPortfolio(data) : null;
}

export async function createPortfolio(
  supabase: DbClient,
  input: {
    userId: string;
    name: string;
    baseCurrency?: string;
    description?: string | null;
  }
): Promise<Portfolio> {
  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      user_id: input.userId,
      name: input.name,
      base_currency: input.baseCurrency ?? "USD",
      description: input.description ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapPortfolio(data);
}

export async function addPortfolioTransaction(
  supabase: DbClient,
  input: {
    userId: string;
    portfolioId: number;
    tickerId: number;
    transactionType: "buy" | "sell";
    tradeDate: string;
    quantity: number;
    price: number;
    fees: number;
    notes?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("portfolio_transactions").insert({
    user_id: input.userId,
    portfolio_id: input.portfolioId,
    ticker_id: input.tickerId,
    transaction_type: input.transactionType,
    trade_date: input.tradeDate,
    quantity: input.quantity,
    price: input.price,
    fees: input.fees,
    notes: input.notes ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function deletePortfolioTransaction(
  supabase: DbClient,
  userId: string,
  transactionId: number
): Promise<void> {
  const { error } = await supabase
    .from("portfolio_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getPortfolioTransactions(
  supabase: DbClient,
  userId: string,
  portfolioId: number
): Promise<PortfolioTransaction[]> {
  const { data: rows, error: rowsError } = await supabase
    .from("portfolio_transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("portfolio_id", portfolioId)
    .order("trade_date", { ascending: false })
    .order("id", { ascending: false });

  if (rowsError) {
    throw rowsError;
  }

  const transactionRows = rows ?? [];
  const tickerIds = [...new Set(transactionRows.map((row) => row.ticker_id))];

  if (tickerIds.length === 0) {
    return [];
  }

  const tickersById = await getTickersById(supabase, tickerIds);

  return transactionRows.flatMap((row) => {
    const ticker = tickersById.get(row.ticker_id);
    return ticker ? [mapPortfolioTransaction(row, ticker)] : [];
  });
}

export async function getLatestQuotesByTickerId(
  supabase: DbClient,
  tickerIds: number[]
): Promise<Map<number, QuoteLatest>> {
  if (tickerIds.length === 0) {
    return new Map<number, QuoteLatest>();
  }

  const { data, error } = await supabase
    .from("quotes_latest")
    .select("*")
    .in("ticker_id", tickerIds);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.ticker_id, mapQuoteLatest(row)]));
}

async function getTickersById(
  supabase: DbClient,
  tickerIds: number[]
): Promise<Map<number, Ticker>> {
  const { data, error } = await supabase
    .from("tickers")
    .select(TICKER_COLUMNS)
    .in("id", tickerIds);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((row) => [row.id, mapTicker(row)]));
}
