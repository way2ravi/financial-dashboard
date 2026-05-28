import type { Database } from "@/lib/types/database";
import type {
  AnalystPriceTargetsSnapshot,
  AnalystRatingsSnapshot,
  EarningsQuarterly,
  FundamentalsSnapshot,
  OhlcDaily,
  QuoteLatest,
  Ticker,
  WatchlistItem,
} from "@/lib/types/market";

type Tables = Database["public"]["Tables"];

export function mapTicker(row: Tables["tickers"]["Row"]): Ticker {
  return {
    id: row.id,
    symbol: row.symbol,
    exchange: row.exchange,
    name: row.name,
    sector: row.sector,
    industry: row.industry,
    currency: row.currency,
    isActive: row.is_active,
  };
}

export function mapQuoteLatest(row: Tables["quotes_latest"]["Row"]): QuoteLatest {
  return {
    tickerId: row.ticker_id,
    price: row.price,
    change: row.change,
    changePercent: row.change_percent,
    previousClose: row.previous_close,
    open: row.open,
    dayHigh: row.day_high,
    dayLow: row.day_low,
    volume: row.volume,
    source: row.source,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
  };
}

export function mapAnalystRatings(
  row: Tables["analyst_ratings_snapshot"]["Row"]
): AnalystRatingsSnapshot {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    asOfDate: row.as_of_date,
    consensus: row.consensus,
    strongBuy: row.strong_buy,
    buy: row.buy,
    hold: row.hold,
    sell: row.sell,
    strongSell: row.strong_sell,
    analystCount: row.analyst_count,
    source: row.source,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
  };
}

export function mapAnalystPriceTargets(
  row: Tables["analyst_price_targets_snapshot"]["Row"]
): AnalystPriceTargetsSnapshot {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    asOfDate: row.as_of_date,
    targetLow: row.target_low,
    targetMean: row.target_mean,
    targetHigh: row.target_high,
    targetMedian: row.target_median,
    analystCount: row.analyst_count,
    source: row.source,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
  };
}

export function mapEarnings(row: Tables["earnings_quarterly"]["Row"]): EarningsQuarterly {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    fiscalYear: row.fiscal_year,
    fiscalQuarter: row.fiscal_quarter as EarningsQuarterly["fiscalQuarter"],
    period: row.period,
    reportDate: row.report_date,
    epsActual: row.eps_actual,
    epsEstimate: row.eps_estimate,
    epsSurprise: row.eps_surprise,
    epsSurprisePercent: row.eps_surprise_percent,
    revenueActual: row.revenue_actual,
    revenueEstimate: row.revenue_estimate,
    source: row.source,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
  };
}

export function mapFundamentals(
  row: Tables["fundamentals_snapshot"]["Row"]
): FundamentalsSnapshot {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    asOfDate: row.as_of_date,
    marketCap: row.market_cap,
    pe: row.pe,
    forwardPe: row.forward_pe,
    peg: row.peg,
    pb: row.pb,
    ps: row.ps,
    roe: row.roe,
    roa: row.roa,
    grossMargin: row.gross_margin,
    operatingMargin: row.operating_margin,
    netMargin: row.net_margin,
    debtToEquity: row.debt_to_equity,
    dividendYield: row.dividend_yield,
    beta: row.beta,
    source: row.source,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
  };
}

export function mapOhlc(row: Tables["ohlc_daily"]["Row"]): OhlcDaily {
  return {
    id: row.id,
    tickerId: row.ticker_id,
    date: row.date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    adjustedClose: row.adjusted_close,
    volume: row.volume,
    source: row.source,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
  };
}

export function mapWatchlistItem(
  row: Tables["user_watchlist"]["Row"],
  ticker: Ticker
): WatchlistItem {
  return {
    id: row.id,
    userId: row.user_id,
    ticker,
    createdAt: row.created_at,
  };
}
