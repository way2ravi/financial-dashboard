import "server-only";

import type {
  ProviderEarningsQuarterly,
  ProviderFinancialStatementRow,
  ProviderFundamentalsSnapshot,
  ProviderNewsArticle,
  ProviderOhlcDaily,
  ProviderQuote,
  ScreenerResult,
  ProviderTickerSearchResult,
} from "@/lib/types";

type AlphaVantageSearchResponse = {
  bestMatches?: Array<Record<string, string | undefined>>;
  Note?: string;
  Information?: string;
};

type AlphaVantageGlobalQuoteResponse = {
  "Global Quote"?: Record<string, string | undefined>;
  Note?: string;
  Information?: string;
};

type AlphaVantageDailyAdjustedResponse = {
  "Time Series (Daily)"?: Record<string, Record<string, string | undefined>>;
  Note?: string;
  Information?: string;
};

type AlphaVantageOverviewResponse = Record<string, string | undefined> & {
  Note?: string;
  Information?: string;
};

type AlphaVantageEarningsResponse = {
  quarterlyEarnings?: Array<Record<string, string | undefined>>;
  Note?: string;
  Information?: string;
};

type AlphaVantageStatementResponse = {
  annualReports?: Array<Record<string, string | undefined>>;
  quarterlyReports?: Array<Record<string, string | undefined>>;
  Note?: string;
  Information?: string;
};

type AlphaVantageNewsSentimentResponse = {
  feed?: Array<{
    title?: string;
    url?: string;
    time_published?: string;
    authors?: string[];
    summary?: string;
    banner_image?: string;
    source?: string;
    overall_sentiment_score?: number;
    overall_sentiment_label?: string;
    ticker_sentiment?: Array<{
      ticker?: string;
      ticker_sentiment_score?: string;
      ticker_sentiment_label?: string;
    }>;
  }>;
  Note?: string;
  Information?: string;
};

type AlphaVantageTopGainersLosersResponse = {
  top_gainers?: AlphaVantageMover[];
  top_losers?: AlphaVantageMover[];
  most_actively_traded?: AlphaVantageMover[];
  Note?: string;
  Information?: string;
};

type AlphaVantageMover = {
  ticker?: string;
  price?: string;
  change_amount?: string;
  change_percentage?: string;
  volume?: string;
};

const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";
const PROVIDER = "alpha_vantage";

export async function searchAlphaVantageSymbols(
  query: string,
  limit = 10
): Promise<ProviderTickerSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const raw = await getFromAlphaVantage<AlphaVantageSearchResponse>({
    function: "SYMBOL_SEARCH",
    keywords: normalizedQuery,
  });

  return (raw.bestMatches ?? [])
    .filter((item) => getString(item, "1. symbol"))
    .slice(0, limit)
    .map((item) => ({
      symbol: getString(item, "1. symbol")!.toUpperCase(),
      displaySymbol: getString(item, "1. symbol"),
      description: getString(item, "2. name"),
      type: getString(item, "3. type"),
      exchange: getString(item, "4. region") ?? "US",
      source: PROVIDER,
    }));
}

export async function getAlphaVantageQuote(symbol: string): Promise<ProviderQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromAlphaVantage<AlphaVantageGlobalQuoteResponse>({
    function: "GLOBAL_QUOTE",
    symbol: normalizedSymbol,
  });
  const quote = raw["Global Quote"];

  if (!quote || !getString(quote, "05. price")) {
    throw new Error("Alpha Vantage quote response was empty");
  }

  return {
    symbol: normalizedSymbol,
    price: toNumber(getString(quote, "05. price")),
    change: toNumber(getString(quote, "09. change")),
    changePercent: toPercentNumber(getString(quote, "10. change percent")),
    previousClose: toNumber(getString(quote, "08. previous close")),
    open: toNumber(getString(quote, "02. open")),
    dayHigh: toNumber(getString(quote, "03. high")),
    dayLow: toNumber(getString(quote, "04. low")),
    volume: toNumber(getString(quote, "06. volume")),
    source: PROVIDER,
    sourceUpdatedAt: getString(quote, "07. latest trading day"),
  };
}

export async function getAlphaVantageDailyOhlc(
  symbol: string,
  days = 180
): Promise<ProviderOhlcDaily[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromAlphaVantage<AlphaVantageDailyAdjustedResponse>({
    function: "TIME_SERIES_DAILY_ADJUSTED",
    symbol: normalizedSymbol,
    outputsize: days > 100 ? "full" : "compact",
  });
  const series = raw["Time Series (Daily)"];

  if (!series || Object.keys(series).length === 0) {
    throw new Error("Alpha Vantage daily OHLC response was empty");
  }

  return Object.entries(series)
    .slice(0, days)
    .map(([date, row]) => ({
      symbol: normalizedSymbol,
      date,
      open: toNumber(getString(row, "1. open")),
      high: toNumber(getString(row, "2. high")),
      low: toNumber(getString(row, "3. low")),
      close: toNumber(getString(row, "4. close")),
      adjustedClose: toNumber(getString(row, "5. adjusted close")),
      volume: toNumber(getString(row, "6. volume")),
      source: PROVIDER,
      sourceUpdatedAt: date,
    }))
    .reverse();
}

export async function getAlphaVantageFundamentals(
  symbol: string
): Promise<ProviderFundamentalsSnapshot> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromAlphaVantage<AlphaVantageOverviewResponse>({
    function: "OVERVIEW",
    symbol: normalizedSymbol,
  });

  if (!raw.Symbol && !raw.MarketCapitalization && !raw.PERatio) {
    throw new Error("Alpha Vantage overview response was empty");
  }

  return {
    symbol: normalizedSymbol,
    asOfDate: todayDate(),
    marketCap: toNumber(raw.MarketCapitalization),
    pe: toNumber(raw.PERatio),
    forwardPe: toNumber(raw.ForwardPE),
    peg: toNumber(raw.PEGRatio),
    pb: toNumber(raw.PriceToBookRatio),
    ps: toNumber(raw.PriceToSalesRatioTTM),
    roe: toNumber(raw.ReturnOnEquityTTM),
    roa: toNumber(raw.ReturnOnAssetsTTM),
    grossMargin: toNumber(raw.GrossProfitTTM),
    operatingMargin: toPercentNumber(raw.OperatingMarginTTM),
    netMargin: toPercentNumber(raw.ProfitMargin),
    debtToEquity: null,
    dividendYield: toPercentNumber(raw.DividendYield),
    beta: toNumber(raw.Beta),
    source: PROVIDER,
    sourceUpdatedAt: todayDate(),
  };
}

export async function getAlphaVantageEarnings(
  symbol: string
): Promise<ProviderEarningsQuarterly[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromAlphaVantage<AlphaVantageEarningsResponse>({
    function: "EARNINGS",
    symbol: normalizedSymbol,
  });

  if (!Array.isArray(raw.quarterlyEarnings) || raw.quarterlyEarnings.length === 0) {
    throw new Error("Alpha Vantage earnings response was empty");
  }

  const earnings: ProviderEarningsQuarterly[] = [];

  raw.quarterlyEarnings.forEach((row) => {
      const fiscalDate = getString(row, "fiscalDateEnding");
      const quarter = fiscalDate ? inferQuarter(fiscalDate) : null;

      if (!fiscalDate || !quarter) {
        return;
      }

      earnings.push({
        symbol: normalizedSymbol,
        fiscalYear: Number(fiscalDate.slice(0, 4)),
        fiscalQuarter: quarter,
        period: fiscalDate,
        reportDate: getString(row, "reportedDate"),
        epsActual: toNumber(getString(row, "reportedEPS")),
        epsEstimate: toNumber(getString(row, "estimatedEPS")),
        epsSurprise: toNumber(getString(row, "surprise")),
        epsSurprisePercent: toNumber(getString(row, "surprisePercentage")),
        revenueActual: null,
        revenueEstimate: null,
        source: PROVIDER,
        sourceUpdatedAt: getString(row, "reportedDate") ?? fiscalDate,
      });
    });

  return earnings.slice(0, 8);
}

export async function getAlphaVantageFinancialStatements(
  symbol: string
): Promise<ProviderFinancialStatementRow[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const income = await getFromAlphaVantage<AlphaVantageStatementResponse>({
    function: "INCOME_STATEMENT",
    symbol: normalizedSymbol,
  });
  await waitForAlphaVantageFreeTier();
  const balance = await getFromAlphaVantage<AlphaVantageStatementResponse>({
    function: "BALANCE_SHEET",
    symbol: normalizedSymbol,
  });
  await waitForAlphaVantageFreeTier();
  const cashflow = await getFromAlphaVantage<AlphaVantageStatementResponse>({
    function: "CASH_FLOW",
    symbol: normalizedSymbol,
  });

  const rows = [
    ...mapAlphaVantageStatementRows(normalizedSymbol, "income", "annual", income.annualReports, 5),
    ...mapAlphaVantageStatementRows(normalizedSymbol, "income", "quarter", income.quarterlyReports, 4),
    ...mapAlphaVantageStatementRows(normalizedSymbol, "balance", "annual", balance.annualReports, 5),
    ...mapAlphaVantageStatementRows(normalizedSymbol, "balance", "quarter", balance.quarterlyReports, 4),
    ...mapAlphaVantageStatementRows(normalizedSymbol, "cashflow", "annual", cashflow.annualReports, 5),
    ...mapAlphaVantageStatementRows(normalizedSymbol, "cashflow", "quarter", cashflow.quarterlyReports, 4),
  ];

  if (rows.length === 0) {
    throw new Error("Alpha Vantage financial statement response was empty");
  }

  return rows;
}

function mapAlphaVantageStatementRows(
  symbol: string,
  statementType: ProviderFinancialStatementRow["statementType"],
  periodType: ProviderFinancialStatementRow["periodType"],
  reports: Array<Record<string, string | undefined>> | undefined,
  limit: number
): ProviderFinancialStatementRow[] {
  return (reports ?? [])
    .slice(0, limit)
    .map((row) => mapAlphaVantageStatementRow(symbol, statementType, periodType, row))
    .filter((row): row is ProviderFinancialStatementRow => row !== null);
}

function mapAlphaVantageStatementRow(
  symbol: string,
  statementType: ProviderFinancialStatementRow["statementType"],
  periodType: ProviderFinancialStatementRow["periodType"],
  row: Record<string, string | undefined>
): ProviderFinancialStatementRow | null {
  const fiscalDate = getString(row, "fiscalDateEnding");

  if (!fiscalDate) {
    return null;
  }

  const operatingCash = toNumber(getString(row, "operatingCashflow"));
  const capitalExpenditures = toNumber(getString(row, "capitalExpenditures"));

  return {
    symbol,
    statementType,
    periodType,
    fiscalDate,
    calendarYear: fiscalDate.slice(0, 4),
    period: periodType === "annual" ? fiscalDate.slice(0, 4) : `Q${inferQuarter(fiscalDate) ?? ""} ${fiscalDate.slice(0, 4)}`.trim(),
    totalRevenue: statementType === "income" ? toNumber(getString(row, "totalRevenue")) : null,
    grossProfit: statementType === "income" ? toNumber(getString(row, "grossProfit")) : null,
    operatingIncome:
      statementType === "income" ? toNumber(getString(row, "operatingIncome")) : null,
    netIncome: statementType === "income" ? toNumber(getString(row, "netIncome")) : null,
    totalAssets: statementType === "balance" ? toNumber(getString(row, "totalAssets")) : null,
    totalCurrentLiabilities:
      statementType === "balance" ? toNumber(getString(row, "totalCurrentLiabilities")) : null,
    totalEquity:
      statementType === "balance" ? toNumber(getString(row, "totalShareholderEquity")) : null,
    leveredFreeCashFlow:
      statementType === "cashflow" ? estimateFreeCashFlow(operatingCash, capitalExpenditures) : null,
    cashFromOperations: statementType === "cashflow" ? operatingCash : null,
    cashFromInvesting:
      statementType === "cashflow" ? toNumber(getString(row, "cashflowFromInvestment")) : null,
    cashFromFinancing:
      statementType === "cashflow" ? toNumber(getString(row, "cashflowFromFinancing")) : null,
    netChangeInCash:
      statementType === "cashflow"
        ? toNumber(getString(row, "changeInCashAndCashEquivalents"))
        : null,
    source: PROVIDER,
    sourceUpdatedAt: fiscalDate,
  };
}

export async function getAlphaVantageNews(
  symbol: string,
  limit = 12
): Promise<ProviderNewsArticle[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromAlphaVantage<AlphaVantageNewsSentimentResponse>({
    function: "NEWS_SENTIMENT",
    tickers: normalizedSymbol,
    limit: String(limit),
    sort: "LATEST",
  });

  if (!Array.isArray(raw.feed) || raw.feed.length === 0) {
    throw new Error("Alpha Vantage news response was empty");
  }

  return raw.feed
    .filter((article) => article.title && article.url && article.time_published)
    .slice(0, limit)
    .map((article) => {
      const tickerSentiment = article.ticker_sentiment?.find(
        (item) => item.ticker?.toUpperCase() === normalizedSymbol
      );
      const publishedAt = parseAlphaVantageDate(article.time_published!);

      return {
        symbol: normalizedSymbol,
        headline: article.title!,
        summary: article.summary ?? null,
        url: article.url!,
        imageUrl: article.banner_image ?? null,
        sourceName: article.source ?? null,
        publishedAt,
        sentimentLabel:
          tickerSentiment?.ticker_sentiment_label ??
          article.overall_sentiment_label ??
          null,
        sentimentScore:
          toNumber(tickerSentiment?.ticker_sentiment_score) ??
          toNumber(article.overall_sentiment_score),
        source: PROVIDER,
        sourceUpdatedAt: publishedAt,
      };
    });
}

export async function getAlphaVantageMarketMovers(): Promise<{
  topGainers: ScreenerResult[];
  topLosers: ScreenerResult[];
  mostActive: ScreenerResult[];
}> {
  const raw = await getFromAlphaVantage<AlphaVantageTopGainersLosersResponse>({
    function: "TOP_GAINERS_LOSERS",
  });

  return {
    topGainers: mapAlphaVantageMovers(raw.top_gainers ?? []),
    topLosers: mapAlphaVantageMovers(raw.top_losers ?? []),
    mostActive: mapAlphaVantageMovers(raw.most_actively_traded ?? []),
  };
}

async function getFromAlphaVantage<T>(params: Record<string, string>): Promise<T> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
  }

  const url = new URL(ALPHA_VANTAGE_BASE_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Alpha Vantage ${params.function} request failed with ${response.status}`);
  }

  const data = (await response.json()) as T;
  const throttledMessage = getProviderMessage(data);

  if (throttledMessage) {
    throw new Error(
      `Alpha Vantage ${params.function} unavailable: ${sanitizeProviderMessage(throttledMessage)}`
    );
  }

  return data;
}

function getProviderMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as { Note?: string; Information?: string; "Error Message"?: string };

  return record.Note ?? record.Information ?? record["Error Message"] ?? null;
}

function sanitizeProviderMessage(message: string) {
  return message
    .replace(/API key as\s+[A-Z0-9]+/gi, "API key")
    .replace(/apikey=[A-Z0-9]+/gi, "apikey=[hidden]");
}

function getString(record: Record<string, string | undefined>, key: string) {
  const value = record[key];
  return value && value !== "None" && value !== "-" ? value : null;
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "" || value === "None") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function toPercentNumber(value: string | number | null | undefined) {
  if (typeof value === "string" && value.trim().endsWith("%")) {
    return toNumber(value.replace("%", ""));
  }

  return toNumber(value);
}

function estimateFreeCashFlow(
  operatingCash: number | null,
  capitalExpenditures: number | null
) {
  if (operatingCash === null) {
    return null;
  }

  return operatingCash + (capitalExpenditures ?? 0);
}

function waitForAlphaVantageFreeTier() {
  return new Promise((resolve) => setTimeout(resolve, 1200));
}

function mapAlphaVantageMovers(items: AlphaVantageMover[]): ScreenerResult[] {
  return items
    .filter((item) => item.ticker)
    .map((item) => ({
      symbol: item.ticker!.toUpperCase(),
      name: null,
      exchange: null,
      price: toNumber(item.price),
      change: toNumber(item.change_amount),
      changePercent: toPercentNumber(item.change_percentage),
      volume: toNumber(item.volume),
      marketCap: null,
      pe: null,
      yearHigh: null,
      yearLow: null,
      source: PROVIDER,
    }));
}

function inferQuarter(date: string): 1 | 2 | 3 | 4 | null {
  const month = Number(date.slice(5, 7));

  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return Math.ceil(month / 3) as 1 | 2 | 3 | 4;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseAlphaVantageDate(value: string) {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/
  );

  if (!match) {
    return new Date(value).toISOString();
  }

  const [, year, month, day, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}

export const alphaVantageProvider = {
  searchSymbols: searchAlphaVantageSymbols,
  getQuote: getAlphaVantageQuote,
  getDailyOhlc: getAlphaVantageDailyOhlc,
  getFundamentals: getAlphaVantageFundamentals,
  getFinancialStatements: getAlphaVantageFinancialStatements,
  getEarnings: getAlphaVantageEarnings,
  getCompanyNews: getAlphaVantageNews,
  getMarketMovers: getAlphaVantageMarketMovers,
};
