import "server-only";

import type {
  AnalystRatingConsensus,
  ProviderAnalystPriceTargets,
  ProviderAnalystRatings,
  ProviderCompanyProfile,
  ProviderEarningsCalendarItem,
  ProviderEarningsQuarterly,
  ProviderFundamentalsSnapshot,
  ProviderNewsArticle,
  ProviderOhlcDaily,
  ProviderQuote,
  ProviderTickerSearchResult,
} from "@/lib/types";

type FinnhubQuoteResponse = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
};

type FinnhubRecommendationResponse = {
  symbol?: string;
  period?: string;
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
};

type FinnhubPriceTargetResponse = {
  symbol?: string;
  targetHigh?: number;
  targetLow?: number;
  targetMean?: number;
  targetMedian?: number;
  lastUpdated?: string;
};

type FinnhubEarningsResponse = {
  actual?: number;
  estimate?: number;
  period?: string;
  quarter?: number;
  surprise?: number;
  surprisePercent?: number;
  symbol?: string;
  year?: number;
};

type FinnhubEarningsCalendarResponse = {
  earningsCalendar?: Array<{
    date?: string;
    epsActual?: number;
    epsEstimate?: number;
    hour?: string;
    quarter?: number;
    revenueActual?: number;
    revenueEstimate?: number;
    symbol?: string;
    year?: number;
  }>;
};

type FinnhubMetricResponse = {
  metric?: Record<string, number | null | undefined>;
};

type FinnhubCandleResponse = {
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  s?: string;
  t?: number[];
  v?: number[];
};

type FinnhubSymbolSearchResponse = {
  count?: number;
  result?: Array<{
    description?: string;
    displaySymbol?: string;
    symbol?: string;
    type?: string;
  }>;
};

type FinnhubCompanyProfileResponse = {
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  logo?: string;
  name?: string;
  ticker?: string;
  weburl?: string;
};

type FinnhubCompanyNewsResponse = Array<{
  category?: string;
  datetime?: number;
  headline?: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
}>;

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const PROVIDER = "finnhub";

export async function searchFinnhubSymbols(
  query: string,
  limit = 10
): Promise<ProviderTickerSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const raw = await getFromFinnhub<FinnhubSymbolSearchResponse>("search", {
    q: normalizedQuery,
    exchange: "US",
  });

  return (raw.result ?? [])
    .filter((item) => item.symbol && item.type !== "Crypto")
    .slice(0, limit)
    .map((item) => ({
      symbol: item.symbol!.toUpperCase(),
      displaySymbol: item.displaySymbol ?? item.symbol ?? null,
      description: item.description ?? null,
      type: item.type ?? null,
      exchange: inferExchange(item.symbol),
      source: PROVIDER,
    }));
}

export async function getFinnhubQuote(symbol: string): Promise<ProviderQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromFinnhub<FinnhubQuoteResponse>("quote", {
    symbol: normalizedSymbol,
  });

  if (!raw || raw.c === undefined) {
    throw new Error("Finnhub quote response was missing current price");
  }

  return {
    symbol: normalizedSymbol,
    price: raw.c ?? null,
    change: raw.d ?? null,
    changePercent: raw.dp ?? null,
    previousClose: raw.pc ?? null,
    open: raw.o ?? null,
    dayHigh: raw.h ?? null,
    dayLow: raw.l ?? null,
    volume: null,
    source: PROVIDER,
    sourceUpdatedAt: raw.t ? new Date(raw.t * 1000).toISOString() : null,
  };
}

export async function getFinnhubCompanyProfile(
  symbol: string
): Promise<ProviderCompanyProfile> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromFinnhub<FinnhubCompanyProfileResponse>("stock/profile2", {
    symbol: normalizedSymbol,
  });

  if (!raw || (!raw.name && !raw.logo)) {
    throw new Error("Finnhub company profile response was empty");
  }

  return {
    symbol: normalizedSymbol,
    name: raw.name ?? null,
    exchange: raw.exchange ?? null,
    industry: raw.finnhubIndustry ?? null,
    currency: raw.currency ?? null,
    logoUrl: raw.logo ?? null,
    webUrl: raw.weburl ?? null,
    source: PROVIDER,
    sourceUpdatedAt: todayDate(),
  };
}

export async function getFinnhubAnalystRatings(
  symbol: string
): Promise<ProviderAnalystRatings> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const rows = await getFromFinnhub<FinnhubRecommendationResponse[]>(
    "stock/recommendation",
    { symbol: normalizedSymbol }
  );
  const latest = rows?.[0];

  if (!latest?.period) {
    throw new Error("Finnhub recommendation response was empty");
  }

  const strongBuy = toInt(latest.strongBuy);
  const buy = toInt(latest.buy);
  const hold = toInt(latest.hold);
  const sell = toInt(latest.sell);
  const strongSell = toInt(latest.strongSell);
  const analystCount = strongBuy + buy + hold + sell + strongSell;

  return {
    symbol: normalizedSymbol,
    asOfDate: latest.period,
    consensus: computeConsensus({ strongBuy, buy, hold, sell, strongSell }),
    strongBuy,
    buy,
    hold,
    sell,
    strongSell,
    analystCount,
    source: PROVIDER,
    sourceUpdatedAt: latest.period,
  };
}

export async function getFinnhubPriceTargets(
  symbol: string
): Promise<ProviderAnalystPriceTargets> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromFinnhub<FinnhubPriceTargetResponse>(
    "stock/price-target",
    { symbol: normalizedSymbol }
  );

  if (!raw || !hasAnyNumber(raw.targetLow, raw.targetMean, raw.targetHigh, raw.targetMedian)) {
    throw new Error("Finnhub price target response was empty");
  }

  const asOfDate = toDateOnly(raw.lastUpdated) ?? todayDate();

  return {
    symbol: normalizedSymbol,
    asOfDate,
    targetLow: toNumber(raw.targetLow),
    targetMean: toNumber(raw.targetMean),
    targetHigh: toNumber(raw.targetHigh),
    targetMedian: toNumber(raw.targetMedian),
    analystCount: null,
    source: PROVIDER,
    sourceUpdatedAt: raw.lastUpdated ?? asOfDate,
  };
}

export async function getFinnhubEarnings(
  symbol: string
): Promise<ProviderEarningsQuarterly[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const rows = await getFromFinnhub<FinnhubEarningsResponse[]>("stock/earnings", {
    symbol: normalizedSymbol,
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Finnhub earnings response was empty");
  }

  return rows
    .filter((row) => row.year && row.quarter && row.quarter >= 1 && row.quarter <= 4)
    .map((row) => ({
      symbol: normalizedSymbol,
      fiscalYear: row.year!,
      fiscalQuarter: row.quarter as 1 | 2 | 3 | 4,
      period: row.period ?? null,
      reportDate: row.period ?? null,
      epsActual: toNumber(row.actual),
      epsEstimate: toNumber(row.estimate),
      epsSurprise: toNumber(row.surprise),
      epsSurprisePercent: toNumber(row.surprisePercent),
      revenueActual: null,
      revenueEstimate: null,
      source: PROVIDER,
      sourceUpdatedAt: row.period ?? null,
    }))
    .slice(0, 8);
}

export async function getFinnhubEarningsCalendar(
  date: string
): Promise<ProviderEarningsCalendarItem[]> {
  const normalizedDate = normalizeDateInput(date);
  const raw = await getFromFinnhub<FinnhubEarningsCalendarResponse>(
    "calendar/earnings",
    {
      from: normalizedDate,
      to: normalizedDate,
      international: "false",
    }
  );

  const rows = raw.earningsCalendar ?? [];

  return rows
    .filter((row) => row.symbol && row.date)
    .map((row) => ({
      symbol: row.symbol!.trim().toUpperCase(),
      reportDate: row.date!,
      hour: row.hour ?? null,
      fiscalYear: toIntOrNull(row.year),
      fiscalQuarter: toQuarter(row.quarter),
      epsActual: toNumber(row.epsActual),
      epsEstimate: toNumber(row.epsEstimate),
      revenueActual: toNumber(row.revenueActual),
      revenueEstimate: toNumber(row.revenueEstimate),
      source: PROVIDER,
      sourceUpdatedAt: normalizedDate,
    }));
}

export async function getFinnhubFundamentals(
  symbol: string
): Promise<ProviderFundamentalsSnapshot> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromFinnhub<FinnhubMetricResponse>("stock/metric", {
    symbol: normalizedSymbol,
    metric: "all",
  });
  const metric = raw.metric;

  if (!metric) {
    throw new Error("Finnhub metric response was missing metric data");
  }

  return {
    symbol: normalizedSymbol,
    asOfDate: todayDate(),
    marketCap: normalizeMarketCap(pickNumber(metric, "marketCapitalization")),
    pe: pickNumber(metric, "peNormalizedAnnual", "peBasicExclExtraTTM", "peTTM"),
    forwardPe: pickNumber(metric, "forwardPE", "forwardPe"),
    peg: pickNumber(metric, "pegAnnual", "pegTTM"),
    pb: pickNumber(metric, "pbAnnual", "pbQuarterly"),
    ps: pickNumber(metric, "psAnnual", "psTTM"),
    roe: pickNumber(metric, "roeAnnual", "roeTTM"),
    roa: pickNumber(metric, "roaAnnual", "roaTTM"),
    grossMargin: pickNumber(metric, "grossMarginAnnual", "grossMarginTTM"),
    operatingMargin: pickNumber(metric, "operatingMarginAnnual", "operatingMarginTTM"),
    netMargin: pickNumber(metric, "netProfitMarginAnnual", "netProfitMarginTTM"),
    debtToEquity: pickNumber(
      metric,
      "totalDebt/totalEquityAnnual",
      "totalDebt/totalEquityQuarterly",
      "totalDebtToTotalEquityAnnual"
    ),
    dividendYield: pickNumber(
      metric,
      "dividendYieldIndicatedAnnual",
      "currentDividendYieldTTM"
    ),
    beta: pickNumber(metric, "beta"),
    source: PROVIDER,
    sourceUpdatedAt: todayDate(),
  };
}

export async function getFinnhubDailyOhlc(
  symbol: string,
  days = 180
): Promise<ProviderOhlcDaily[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const raw = await getFromFinnhub<FinnhubCandleResponse>("stock/candle", {
    symbol: normalizedSymbol,
    resolution: "D",
    from: String(from),
    to: String(to),
  });

  if (raw.s !== "ok" || !raw.t?.length) {
    throw new Error("Finnhub candle response did not contain daily candles");
  }

  return raw.t.map((timestamp, index) => ({
    symbol: normalizedSymbol,
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open: toNumber(raw.o?.[index]),
    high: toNumber(raw.h?.[index]),
    low: toNumber(raw.l?.[index]),
    close: toNumber(raw.c?.[index]),
    adjustedClose: toNumber(raw.c?.[index]),
    volume: toNumber(raw.v?.[index]),
    source: PROVIDER,
    sourceUpdatedAt: new Date(timestamp * 1000).toISOString(),
  }));
}

export async function getFinnhubCompanyNews(
  symbol: string,
  days = 14
): Promise<ProviderNewsArticle[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const to = todayDate();
  const from = dateDaysAgo(days);
  const rows = await getFromFinnhub<FinnhubCompanyNewsResponse>("company-news", {
    symbol: normalizedSymbol,
    from,
    to,
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Finnhub company news response was empty");
  }

  return rows
    .filter((row) => row.headline && row.url && row.datetime)
    .slice(0, 12)
    .map((row) => ({
      symbol: normalizedSymbol,
      headline: row.headline!,
      summary: row.summary ?? null,
      url: row.url!,
      imageUrl: row.image ?? null,
      sourceName: row.source ?? null,
      publishedAt: new Date(row.datetime! * 1000).toISOString(),
      sentimentLabel: null,
      sentimentScore: null,
      source: PROVIDER,
      sourceUpdatedAt: new Date(row.datetime! * 1000).toISOString(),
    }));
}

async function getFromFinnhub<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const url = new URL(`${FINNHUB_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("token", apiKey);

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Finnhub ${endpoint} request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function computeConsensus(input: {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}): AnalystRatingConsensus {
  const analystCount =
    input.strongBuy + input.buy + input.hold + input.sell + input.strongSell;

  if (analystCount === 0) {
    return "Not Rated";
  }

  const score =
    (input.strongBuy * 2 + input.buy - input.sell - input.strongSell * 2) /
    analystCount;

  if (score >= 1.5) return "Strong Buy";
  if (score >= 0.5) return "Buy";
  if (score > -0.5) return "Hold";
  if (score > -1.5) return "Sell";
  return "Strong Sell";
}

function pickNumber(
  record: Record<string, number | null | undefined>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function hasAnyNumber(...values: Array<number | null | undefined>) {
  return values.some((value) => toNumber(value) !== null);
}

function toInt(value: number | null | undefined) {
  return Math.trunc(toNumber(value) ?? 0);
}

function toNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function normalizeDateInput(value: string) {
  const parsed = toDateOnly(value);

  if (!parsed) {
    throw new Error("Date must use YYYY-MM-DD format");
  }

  return parsed;
}

function toDateOnly(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function toIntOrNull(value: number | null | undefined) {
  const number = toNumber(value);

  return number === null ? null : Math.trunc(number);
}

function toQuarter(value: number | null | undefined) {
  const quarter = toIntOrNull(value);

  return quarter && quarter >= 1 && quarter <= 4 ? quarter : null;
}

function normalizeMarketCap(value: number | null) {
  if (value === null) {
    return null;
  }

  return value < 1_000_000_000 ? value * 1_000_000 : value;
}

function inferExchange(symbol: string | undefined) {
  if (!symbol) {
    return "US";
  }

  return symbol.includes(".") ? "US" : "US";
}

export const finnhubProvider = {
  searchSymbols: searchFinnhubSymbols,
  getCompanyProfile: getFinnhubCompanyProfile,
  getQuote: getFinnhubQuote,
  getAnalystRatings: getFinnhubAnalystRatings,
  getPriceTargets: getFinnhubPriceTargets,
  getEarnings: getFinnhubEarnings,
  getEarningsCalendar: getFinnhubEarningsCalendar,
  getFundamentals: getFinnhubFundamentals,
  getDailyOhlc: getFinnhubDailyOhlc,
  getCompanyNews: getFinnhubCompanyNews,
};
