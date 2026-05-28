import "server-only";

import type { ProviderQuote } from "@/lib/types";

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

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export async function getFinnhubQuote(symbol: string): Promise<ProviderQuote> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const normalizedSymbol = symbol.trim().toUpperCase();
  const url = new URL(`${FINNHUB_BASE_URL}/quote`);
  url.searchParams.set("symbol", normalizedSymbol);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Finnhub quote request failed with ${response.status}`);
  }

  const raw = (await response.json()) as FinnhubQuoteResponse;

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
    source: "finnhub",
    sourceUpdatedAt: raw.t ? new Date(raw.t * 1000).toISOString() : null,
  };
}

export const finnhubProvider = {
  getQuote: getFinnhubQuote,
};

