import "server-only";

import type {
  AnalystRatingConsensus,
  ProviderAnalystPriceTargets,
  ProviderAnalystRatings,
  ProviderFinancialStatementRow,
  ProviderFundamentalsSnapshot,
  ProviderOhlcDaily,
  ProviderQuote,
  ScreenerResult,
} from "@/lib/types";

type FmpQuoteResponse = Array<{
  symbol?: string;
  price?: number;
  change?: number;
  changesPercentage?: number;
  previousClose?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  timestamp?: number;
}>;

type FmpHistoricalResponse = {
  historical?: Array<{
    date?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    adjClose?: number;
    volume?: number;
  }>;
};

type FmpRatiosResponse = Array<{
  date?: string;
  priceEarningsRatio?: number;
  priceToBookRatio?: number;
  priceToSalesRatio?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  grossProfitMargin?: number;
  operatingProfitMargin?: number;
  netProfitMargin?: number;
  debtEquityRatio?: number;
  dividendYield?: number;
}>;

type FmpProfileResponse = Array<{
  mktCap?: number;
  beta?: number;
}>;

type FmpIncomeStatementResponse = Array<{
  date?: string;
  calendarYear?: string;
  period?: string;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
}>;

type FmpBalanceSheetResponse = Array<{
  date?: string;
  calendarYear?: string;
  period?: string;
  totalAssets?: number;
  totalCurrentLiabilities?: number;
  totalStockholdersEquity?: number;
  totalEquity?: number;
}>;

type FmpCashFlowResponse = Array<{
  date?: string;
  calendarYear?: string;
  period?: string;
  freeCashFlow?: number;
  operatingCashFlow?: number;
  netCashProvidedByOperatingActivities?: number;
  netCashUsedForInvestingActivites?: number;
  netCashUsedForInvestingActivities?: number;
  netCashUsedProvidedByFinancingActivities?: number;
  netChangeInCash?: number;
}>;

type FmpPriceTargetConsensusResponse =
  | Array<{
      targetHigh?: number;
      targetLow?: number;
      targetConsensus?: number;
      targetMedian?: number;
      numberOfAnalysts?: number;
      date?: string;
    }>
  | {
      targetHigh?: number;
      targetLow?: number;
      targetConsensus?: number;
      targetMedian?: number;
      numberOfAnalysts?: number;
      date?: string;
    };

type FmpRatingResponse = Array<{
  date?: string;
  rating?: string;
  recommendationScore?: number;
}>;

type FmpScreenerResponse = Array<{
  symbol?: string;
  companyName?: string;
  company_name?: string;
  exchange?: string;
  exchangeShortName?: string;
  price?: number;
  changes?: number;
  change?: number;
  changesPercentage?: number;
  changePercentage?: number;
  volume?: number;
  mktCap?: number;
  marketCap?: number;
  pe?: number;
  priceEarningsRatio?: number;
  yearHigh?: number;
  yearLow?: number;
  range?: string;
}>;

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const PROVIDER = "fmp";

export async function getFmpQuote(symbol: string): Promise<ProviderQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromFmp<FmpQuoteResponse>(`quote/${normalizedSymbol}`);
  const quote = raw[0];

  if (!quote || quote.price === undefined) {
    throw new Error("FMP quote response was empty");
  }

  return {
    symbol: normalizedSymbol,
    price: toNumber(quote.price),
    change: toNumber(quote.change),
    changePercent: toNumber(quote.changesPercentage),
    previousClose: toNumber(quote.previousClose),
    open: toNumber(quote.open),
    dayHigh: toNumber(quote.dayHigh),
    dayLow: toNumber(quote.dayLow),
    volume: toNumber(quote.volume),
    source: PROVIDER,
    sourceUpdatedAt: quote.timestamp
      ? new Date(quote.timestamp * 1000).toISOString()
      : null,
  };
}

export async function getFmpDailyOhlc(
  symbol: string,
  days = 180
): Promise<ProviderOhlcDaily[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromFmp<FmpHistoricalResponse>(
    `historical-price-full/${normalizedSymbol}`,
    { timeseries: String(days) }
  );

  if (!Array.isArray(raw.historical) || raw.historical.length === 0) {
    throw new Error("FMP historical price response was empty");
  }

  return raw.historical
    .map((row) => ({
      symbol: normalizedSymbol,
      date: row.date ?? "",
      open: toNumber(row.open),
      high: toNumber(row.high),
      low: toNumber(row.low),
      close: toNumber(row.close),
      adjustedClose: toNumber(row.adjClose),
      volume: toNumber(row.volume),
      source: PROVIDER,
      sourceUpdatedAt: row.date ?? null,
    }))
    .filter((row) => row.date)
    .reverse();
}

export async function getFmpPriceTargets(
  symbol: string
): Promise<ProviderAnalystPriceTargets> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromFmp<FmpPriceTargetConsensusResponse>(
    "price-target-consensus",
    { symbol: normalizedSymbol }
  );
  const target = Array.isArray(raw) ? raw[0] : raw;

  if (
    !target ||
    !hasAnyNumber(target.targetLow, target.targetConsensus, target.targetHigh)
  ) {
    throw new Error("FMP price target response was empty");
  }

  const asOfDate = toDateOnly(target.date) ?? todayDate();

  return {
    symbol: normalizedSymbol,
    asOfDate,
    targetLow: toNumber(target.targetLow),
    targetMean: toNumber(target.targetConsensus),
    targetHigh: toNumber(target.targetHigh),
    targetMedian: toNumber(target.targetMedian),
    analystCount: toIntOrNull(target.numberOfAnalysts),
    source: PROVIDER,
    sourceUpdatedAt: asOfDate,
  };
}

export async function getFmpAnalystRatings(
  symbol: string
): Promise<ProviderAnalystRatings> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromFmp<FmpRatingResponse>(`rating/${normalizedSymbol}`);
  const latest = raw[0];

  if (!latest?.rating && latest?.recommendationScore === undefined) {
    throw new Error("FMP rating response was empty");
  }

  return buildSingleConsensusRating(
    normalizedSymbol,
    mapFmpRating(latest.rating, latest.recommendationScore),
    latest.date ?? todayDate()
  );
}

export async function getFmpFundamentals(
  symbol: string
): Promise<ProviderFundamentalsSnapshot> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const [ratios, profiles] = await Promise.all([
    getFromFmp<FmpRatiosResponse>(`ratios-ttm/${normalizedSymbol}`),
    getFromFmp<FmpProfileResponse>(`profile/${normalizedSymbol}`),
  ]);
  const ratio = ratios[0];
  const profile = profiles[0];

  if (!ratio && !profile) {
    throw new Error("FMP fundamentals response was empty");
  }

  return {
    symbol: normalizedSymbol,
    asOfDate: todayDate(),
    marketCap: toNumber(profile?.mktCap),
    pe: toNumber(ratio?.priceEarningsRatio),
    forwardPe: null,
    peg: null,
    pb: toNumber(ratio?.priceToBookRatio),
    ps: toNumber(ratio?.priceToSalesRatio),
    roe: normalizeRatioPercent(ratio?.returnOnEquity),
    roa: normalizeRatioPercent(ratio?.returnOnAssets),
    grossMargin: normalizeRatioPercent(ratio?.grossProfitMargin),
    operatingMargin: normalizeRatioPercent(ratio?.operatingProfitMargin),
    netMargin: normalizeRatioPercent(ratio?.netProfitMargin),
    debtToEquity: toNumber(ratio?.debtEquityRatio),
    dividendYield: normalizeRatioPercent(ratio?.dividendYield),
    beta: toNumber(profile?.beta),
    source: PROVIDER,
    sourceUpdatedAt: todayDate(),
  };
}

export async function getFmpFinancialStatements(
  symbol: string
): Promise<ProviderFinancialStatementRow[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const [annualIncome, quarterlyIncome, annualBalance, quarterlyBalance, annualCash, quarterlyCash] =
    await Promise.all([
      getFmpStatementRows(normalizedSymbol, "income", "annual", 5),
      getFmpStatementRows(normalizedSymbol, "income", "quarter", 4),
      getFmpStatementRows(normalizedSymbol, "balance", "annual", 5),
      getFmpStatementRows(normalizedSymbol, "balance", "quarter", 4),
      getFmpStatementRows(normalizedSymbol, "cashflow", "annual", 5),
      getFmpStatementRows(normalizedSymbol, "cashflow", "quarter", 4),
    ]);

  return [
    ...annualIncome,
    ...quarterlyIncome,
    ...annualBalance,
    ...quarterlyBalance,
    ...annualCash,
    ...quarterlyCash,
  ];
}

async function getFmpStatementRows(
  symbol: string,
  statementType: ProviderFinancialStatementRow["statementType"],
  periodType: ProviderFinancialStatementRow["periodType"],
  limit: number
): Promise<ProviderFinancialStatementRow[]> {
  const period = periodType === "annual" ? "annual" : "quarter";
  const path =
    statementType === "income"
      ? `income-statement/${symbol}`
      : statementType === "balance"
        ? `balance-sheet-statement/${symbol}`
        : `cash-flow-statement/${symbol}`;
  const raw = await getFromFmp<
    FmpIncomeStatementResponse | FmpBalanceSheetResponse | FmpCashFlowResponse
  >(path, { period, limit: String(limit) });

  return raw
    .map((row) => mapFmpStatementRow(symbol, statementType, periodType, row))
    .filter((row): row is ProviderFinancialStatementRow => row !== null);
}

function mapFmpStatementRow(
  symbol: string,
  statementType: ProviderFinancialStatementRow["statementType"],
  periodType: ProviderFinancialStatementRow["periodType"],
  row: FmpIncomeStatementResponse[number] &
    FmpBalanceSheetResponse[number] &
    FmpCashFlowResponse[number]
): ProviderFinancialStatementRow | null {
  if (!row.date) {
    return null;
  }

  return {
    symbol,
    statementType,
    periodType,
    fiscalDate: row.date,
    calendarYear: row.calendarYear ?? null,
    period: row.period ?? null,
    totalRevenue: statementType === "income" ? toNumber(row.revenue) : null,
    grossProfit: statementType === "income" ? toNumber(row.grossProfit) : null,
    operatingIncome: statementType === "income" ? toNumber(row.operatingIncome) : null,
    netIncome: statementType === "income" ? toNumber(row.netIncome) : null,
    totalAssets: statementType === "balance" ? toNumber(row.totalAssets) : null,
    totalCurrentLiabilities:
      statementType === "balance" ? toNumber(row.totalCurrentLiabilities) : null,
    totalEquity:
      statementType === "balance"
        ? toNumber(row.totalStockholdersEquity ?? row.totalEquity)
        : null,
    leveredFreeCashFlow: statementType === "cashflow" ? toNumber(row.freeCashFlow) : null,
    cashFromOperations:
      statementType === "cashflow"
        ? toNumber(row.operatingCashFlow ?? row.netCashProvidedByOperatingActivities)
        : null,
    cashFromInvesting:
      statementType === "cashflow"
        ? toNumber(row.netCashUsedForInvestingActivites ?? row.netCashUsedForInvestingActivities)
        : null,
    cashFromFinancing:
      statementType === "cashflow"
        ? toNumber(row.netCashUsedProvidedByFinancingActivities)
        : null,
    netChangeInCash: statementType === "cashflow" ? toNumber(row.netChangeInCash) : null,
    source: PROVIDER,
    sourceUpdatedAt: row.date,
  };
}

export async function getFmpScreener(
  params: Record<string, string> = {}
): Promise<ScreenerResult[]> {
  const rows = await getFromFmp<FmpScreenerResponse>("stock-screener", {
    isActivelyTrading: "true",
    isEtf: "false",
    isFund: "false",
    limit: "50",
    ...params,
  });

  return rows.filter((row) => row.symbol).map(mapFmpScreenerRow);
}

export async function getFmpMarketList(
  kind: "gainers" | "losers" | "actives"
): Promise<ScreenerResult[]> {
  const rows = await getFromFmp<FmpScreenerResponse>(`stock_market/${kind}`);

  return rows.filter((row) => row.symbol).slice(0, 50).map(mapFmpScreenerRow);
}

async function getFromFmp<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    throw new Error("FMP_API_KEY is not configured");
  }

  const url = new URL(`${FMP_BASE_URL}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`FMP ${path} request failed with ${response.status}`);
  }

  const data = (await response.json()) as T;

  if (isFmpError(data)) {
    throw new Error(`FMP ${path} unavailable`);
  }

  return data;
}

function buildSingleConsensusRating(
  symbol: string,
  consensus: AnalystRatingConsensus,
  asOfDate: string
): ProviderAnalystRatings {
  return {
    symbol,
    asOfDate,
    consensus,
    strongBuy: consensus === "Strong Buy" ? 1 : 0,
    buy: consensus === "Buy" ? 1 : 0,
    hold: consensus === "Hold" ? 1 : 0,
    sell: consensus === "Sell" ? 1 : 0,
    strongSell: consensus === "Strong Sell" ? 1 : 0,
    analystCount: consensus === "Not Rated" ? 0 : 1,
    source: PROVIDER,
    sourceUpdatedAt: asOfDate,
  };
}

function mapFmpRating(
  rating: string | undefined,
  recommendationScore: number | undefined
): AnalystRatingConsensus {
  const normalizedRating = rating?.toLowerCase() ?? "";

  if (normalizedRating.includes("strong buy")) return "Strong Buy";
  if (normalizedRating.includes("buy")) return "Buy";
  if (normalizedRating.includes("hold") || normalizedRating.includes("neutral")) {
    return "Hold";
  }
  if (normalizedRating.includes("strong sell")) return "Strong Sell";
  if (normalizedRating.includes("sell")) return "Sell";

  if (recommendationScore !== undefined) {
    if (recommendationScore <= 1.5) return "Strong Buy";
    if (recommendationScore <= 2.5) return "Buy";
    if (recommendationScore <= 3.5) return "Hold";
    if (recommendationScore <= 4.5) return "Sell";
    return "Strong Sell";
  }

  return "Not Rated";
}

function isFmpError(data: unknown) {
  return (
    typeof data === "object" &&
    data !== null &&
    "Error Message" in data
  );
}

function mapFmpScreenerRow(row: FmpScreenerResponse[number]): ScreenerResult {
  const parsedRange = parseRange(row.range);

  return {
    symbol: row.symbol!.toUpperCase(),
    name: row.companyName ?? row.company_name ?? null,
    exchange: row.exchangeShortName ?? row.exchange ?? null,
    price: toNumber(row.price),
    change: toNumber(row.change ?? row.changes),
    changePercent: toNumber(row.changePercentage ?? row.changesPercentage),
    volume: toNumber(row.volume),
    marketCap: toNumber(row.marketCap ?? row.mktCap),
    pe: toNumber(row.pe ?? row.priceEarningsRatio),
    yearHigh: toNumber(row.yearHigh ?? parsedRange.high),
    yearLow: toNumber(row.yearLow ?? parsedRange.low),
    source: PROVIDER,
  };
}

function parseRange(value: string | undefined) {
  if (!value) {
    return { low: null, high: null };
  }

  const [low, high] = value.split("-").map((part) => toNumber(part.trim()));

  return { low, high };
}

function hasAnyNumber(...values: Array<number | null | undefined>) {
  return values.some((value) => toNumber(value) !== null);
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function toIntOrNull(value: number | null | undefined) {
  const number = toNumber(value);

  return number === null ? null : Math.trunc(number);
}

function normalizeRatioPercent(value: number | null | undefined) {
  const number = toNumber(value);

  if (number === null) {
    return null;
  }

  return Math.abs(number) <= 1 ? number * 100 : number;
}

function toDateOnly(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export const fmpProvider = {
  getQuote: getFmpQuote,
  getDailyOhlc: getFmpDailyOhlc,
  getAnalystRatings: getFmpAnalystRatings,
  getPriceTargets: getFmpPriceTargets,
  getFundamentals: getFmpFundamentals,
  getFinancialStatements: getFmpFinancialStatements,
  getScreener: getFmpScreener,
  getMarketList: getFmpMarketList,
};
