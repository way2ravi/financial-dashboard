export type ProviderName = "finnhub" | "marketdata" | "manual" | "unknown";

export type StockExchange = "NYSE" | "NASDAQ" | "AMEX" | "OTC" | string;

export type UserRole = "user" | "admin";

export type Ticker = {
  id: number;
  symbol: string;
  exchange: StockExchange | null;
  name: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  isActive: boolean;
};

export type QuoteLatest = {
  tickerId: number;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  source: ProviderName | string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
};

export type AnalystRatingConsensus =
  | "Strong Buy"
  | "Buy"
  | "Hold"
  | "Sell"
  | "Strong Sell"
  | "Not Rated";

export type AnalystRatingsSnapshot = {
  id: number;
  tickerId: number;
  asOfDate: string;
  consensus: AnalystRatingConsensus | string | null;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  analystCount: number;
  source: ProviderName | string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
};

export type AnalystPriceTargetsSnapshot = {
  id: number;
  tickerId: number;
  asOfDate: string;
  targetLow: number | null;
  targetMean: number | null;
  targetHigh: number | null;
  targetMedian: number | null;
  analystCount: number | null;
  source: ProviderName | string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
};

export type EarningsQuarterly = {
  id: number;
  tickerId: number;
  fiscalYear: number;
  fiscalQuarter: 1 | 2 | 3 | 4;
  period: string | null;
  reportDate: string | null;
  epsActual: number | null;
  epsEstimate: number | null;
  epsSurprise: number | null;
  epsSurprisePercent: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  source: ProviderName | string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
};

export type FundamentalsSnapshot = {
  id: number;
  tickerId: number;
  asOfDate: string;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  peg: number | null;
  pb: number | null;
  ps: number | null;
  roe: number | null;
  roa: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  beta: number | null;
  source: ProviderName | string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
};

export type OhlcDaily = {
  id: number;
  tickerId: number;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjustedClose: number | null;
  volume: number | null;
  source: ProviderName | string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
};

export type WatchlistItem = {
  id: number;
  userId: string;
  ticker: Ticker;
  createdAt: string;
};

export type DashboardData = {
  ticker: Ticker;
  quote: QuoteLatest | null;
  analystRatings: AnalystRatingsSnapshot | null;
  analystPriceTargets: AnalystPriceTargetsSnapshot | null;
  earnings: EarningsQuarterly[];
  fundamentals: FundamentalsSnapshot | null;
  ohlc: OhlcDaily[];
};

export type DataFreshness = {
  stale: boolean;
  fetchedAt: string | null;
  maxAgeMinutes: number;
};

export type ProviderQuote = {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
};
