import "server-only";

import type {
  ProviderOhlcDaily,
  ProviderQuote,
  ProviderTickerSearchResult,
} from "@/lib/types";

type TwelveDataSymbolSearchResponse = {
  data?: Array<{
    symbol?: string;
    instrument_name?: string;
    exchange?: string;
    country?: string;
    type?: string;
  }>;
  status?: string;
  message?: string;
};

type TwelveDataQuoteResponse = {
  symbol?: string;
  name?: string;
  exchange?: string;
  datetime?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  volume?: string;
  status?: string;
  message?: string;
};

type TwelveDataTimeSeriesResponse = {
  values?: Array<{
    datetime?: string;
    open?: string;
    high?: string;
    low?: string;
    close?: string;
    volume?: string;
  }>;
  status?: string;
  message?: string;
};

const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";
const PROVIDER = "twelve_data";

export async function searchTwelveDataSymbols(
  query: string,
  limit = 10
): Promise<ProviderTickerSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const raw = await getFromTwelveData<TwelveDataSymbolSearchResponse>("symbol_search", {
    symbol: normalizedQuery,
    outputsize: String(limit),
  });

  return (raw.data ?? [])
    .filter((item) => item.symbol)
    .slice(0, limit)
    .map((item) => ({
      symbol: item.symbol!.toUpperCase(),
      displaySymbol: item.symbol ?? null,
      description: item.instrument_name ?? null,
      type: item.type ?? null,
      exchange: item.exchange ?? item.country ?? null,
      source: PROVIDER,
    }));
}

export async function getTwelveDataQuote(symbol: string): Promise<ProviderQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromTwelveData<TwelveDataQuoteResponse>("quote", {
    symbol: normalizedSymbol,
  });

  if (!raw.symbol || raw.close === undefined) {
    throw new Error("Twelve Data quote response was empty");
  }

  return {
    symbol: normalizedSymbol,
    price: toNumber(raw.close),
    change: toNumber(raw.change),
    changePercent: toNumber(raw.percent_change),
    previousClose: toNumber(raw.previous_close),
    open: toNumber(raw.open),
    dayHigh: toNumber(raw.high),
    dayLow: toNumber(raw.low),
    volume: toNumber(raw.volume),
    source: PROVIDER,
    sourceUpdatedAt: raw.datetime ?? null,
  };
}

export async function getTwelveDataDailyOhlc(
  symbol: string,
  days = 180
): Promise<ProviderOhlcDaily[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const raw = await getFromTwelveData<TwelveDataTimeSeriesResponse>("time_series", {
    symbol: normalizedSymbol,
    interval: "1day",
    outputsize: String(days),
  });

  if (!Array.isArray(raw.values) || raw.values.length === 0) {
    throw new Error("Twelve Data daily OHLC response was empty");
  }

  return raw.values
    .map((row) => ({
      symbol: normalizedSymbol,
      date: row.datetime ?? "",
      open: toNumber(row.open),
      high: toNumber(row.high),
      low: toNumber(row.low),
      close: toNumber(row.close),
      adjustedClose: toNumber(row.close),
      volume: toNumber(row.volume),
      source: PROVIDER,
      sourceUpdatedAt: row.datetime ?? null,
    }))
    .filter((row) => row.date)
    .reverse();
}

async function getFromTwelveData<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new Error("TWELVE_DATA_API_KEY is not configured");
  }

  const url = new URL(`${TWELVE_DATA_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Twelve Data ${endpoint} request failed with ${response.status}`);
  }

  const data = (await response.json()) as T;

  if (hasProviderError(data)) {
    throw new Error(`Twelve Data ${endpoint} unavailable: ${getProviderMessage(data)}`);
  }

  return data;
}

function hasProviderError(data: unknown) {
  return (
    typeof data === "object" &&
    data !== null &&
    "status" in data &&
    (data as { status?: string }).status === "error"
  );
}

function getProviderMessage(data: unknown) {
  return typeof data === "object" && data !== null && "message" in data
    ? String((data as { message?: string }).message)
    : "Unknown provider error";
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export const twelveDataProvider = {
  searchSymbols: searchTwelveDataSymbols,
  getQuote: getTwelveDataQuote,
  getDailyOhlc: getTwelveDataDailyOhlc,
};
