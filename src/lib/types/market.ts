export type ProviderName =
  | "alpha_vantage"
  | "finnhub"
  | "fmp"
  | "marketdata"
  | "manual"
  | "twelve_data"
  | "unknown";

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
  logoUrl: string | null;
  isActive: boolean;
};

export type ProviderTickerSearchResult = {
  symbol: string;
  displaySymbol: string | null;
  description: string | null;
  type: string | null;
  exchange: string | null;
  source: ProviderName | string;
};

export type ProviderCompanyProfile = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  industry: string | null;
  currency: string | null;
  logoUrl: string | null;
  webUrl: string | null;
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
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

export type EarningsCalendarItem = {
  id: number;
  symbol: string;
  reportDate: string;
  hour: string | null;
  fiscalYear: number | null;
  fiscalQuarter: number | null;
  epsActual: number | null;
  epsEstimate: number | null;
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

export type CompanyNewsArticle = {
  id: number;
  tickerId: number;
  headline: string;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  sourceName: string | null;
  publishedAt: string;
  sentimentLabel: string | null;
  sentimentScore: number | null;
  source: ProviderName | string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
};

export type ScreenerResult = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  pe: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  source: ProviderName | string;
};

export type ScreenerCategory =
  | "undervalued"
  | "overvalued"
  | "weekHigh"
  | "weekLow"
  | "mostActive"
  | "topGainers"
  | "topLosers";

export type ScreenerCategoryResult = {
  category: ScreenerCategory;
  title: string;
  description: string;
  items: ScreenerResult[];
  error: string | null;
};

export type WatchlistItem = {
  id: number;
  userId: string;
  ticker: Ticker;
  createdAt: string;
};

export type Portfolio = {
  id: number;
  userId: string;
  name: string;
  baseCurrency: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioTransactionType = "buy" | "sell";

export type PortfolioTransaction = {
  id: number;
  portfolioId: number;
  userId: string;
  ticker: Ticker;
  transactionType: PortfolioTransactionType;
  tradeDate: string;
  quantity: number;
  price: number;
  fees: number;
  notes: string | null;
  createdAt: string;
};

export type PortfolioHolding = {
  ticker: Ticker;
  quantity: number;
  averageCost: number;
  costBasis: number;
  marketPrice: number | null;
  marketValue: number | null;
  allocationPercent: number | null;
  unrealizedGain: number | null;
  unrealizedGainPercent: number | null;
  realizedGain: number;
};

export type PortfolioSummary = {
  portfolio: Portfolio;
  investedCapital: number;
  marketValue: number;
  cashFromSells: number;
  realizedGain: number;
  unrealizedGain: number;
  totalGain: number;
  totalGainPercent: number | null;
  closedPositions: number;
  openPositions: number;
  tradeCount: number;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
};

export type DashboardData = {
  ticker: Ticker;
  quote: QuoteLatest | null;
  analystRatings: AnalystRatingsSnapshot | null;
  analystPriceTargets: AnalystPriceTargetsSnapshot | null;
  earnings: EarningsQuarterly[];
  fundamentals: FundamentalsSnapshot | null;
  ohlc: OhlcDaily[];
  news: CompanyNewsArticle[];
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

export type ProviderAnalystRatings = {
  symbol: string;
  asOfDate: string;
  consensus: AnalystRatingConsensus;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  analystCount: number;
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
};

export type ProviderAnalystPriceTargets = {
  symbol: string;
  asOfDate: string;
  targetLow: number | null;
  targetMean: number | null;
  targetHigh: number | null;
  targetMedian: number | null;
  analystCount: number | null;
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
};

export type ProviderEarningsQuarterly = {
  symbol: string;
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
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
};

export type ProviderEarningsCalendarItem = {
  symbol: string;
  reportDate: string;
  hour: string | null;
  fiscalYear: number | null;
  fiscalQuarter: number | null;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
};

export type ProviderFundamentalsSnapshot = {
  symbol: string;
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
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
};

export type ProviderOhlcDaily = {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjustedClose: number | null;
  volume: number | null;
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
};

export type ProviderNewsArticle = {
  symbol: string;
  headline: string;
  summary: string | null;
  url: string;
  imageUrl: string | null;
  sourceName: string | null;
  publishedAt: string;
  sentimentLabel: string | null;
  sentimentScore: number | null;
  source: ProviderName | string;
  sourceUpdatedAt: string | null;
};

export type RefreshModule =
  | "profile"
  | "quote"
  | "analystRatings"
  | "priceTargets"
  | "earnings"
  | "fundamentals"
  | "ohlc"
  | "news";

export type RefreshResult = {
  module: RefreshModule;
  status: "success" | "error";
  updated: number;
  provider?: ProviderName | string;
  error?: string;
};

export type SymbolRefreshResult = {
  symbol: string;
  results: RefreshResult[];
};

export type RefreshScope = Partial<Record<RefreshModule, boolean>>;
