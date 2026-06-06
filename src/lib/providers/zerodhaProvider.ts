import "server-only";

import type {
  ProviderOhlcDaily,
  ProviderQuote,
  ProviderTickerSearchResult,
} from "@/lib/types";

type ZerodhaInstrument = {
  instrumentToken: string;
  tradingsymbol: string;
  name: string | null;
  instrumentType: string | null;
  segment: string | null;
  exchange: string;
};

type ZerodhaQuoteResponse = {
  status?: string;
  message?: string;
  data?: Record<
    string,
    {
      timestamp?: string;
      last_trade_time?: string | null;
      last_price?: number;
      volume?: number;
      ohlc?: {
        open?: number;
        high?: number;
        low?: number;
        close?: number;
      };
    }
  >;
};

type ZerodhaHistoricalResponse = {
  status?: string;
  message?: string;
  data?: {
    candles?: Array<[string, number, number, number, number, number]>;
  };
};

const ZERODHA_BASE_URL = "https://api.kite.trade";
const PROVIDER = "zerodha";
const DEFAULT_EXCHANGES = ["NSE", "BSE"];
const INDIAN_EXCHANGES = new Set(["NSE", "BSE"]);

let instrumentCache:
  | {
      fetchedAt: number;
      instrumentsByExchange: Map<string, ZerodhaInstrument[]>;
    }
  | null = null;

export async function searchZerodhaSymbols(
  query: string,
  limit = 10
): Promise<ProviderTickerSearchResult[]> {
  const normalizedQuery = query.trim().toUpperCase();

  if (!normalizedQuery) {
    return [];
  }

  const instruments = await getEquityInstruments();
  const startsWithMatches = instruments.filter((instrument) =>
    instrument.tradingsymbol.startsWith(normalizedQuery)
  );
  const nameMatches = instruments.filter(
    (instrument) =>
      !instrument.tradingsymbol.startsWith(normalizedQuery) &&
      instrument.name?.toUpperCase().includes(normalizedQuery)
  );

  return [...startsWithMatches, ...nameMatches].slice(0, limit).map((instrument) => ({
    symbol: instrument.tradingsymbol,
    displaySymbol: `${instrument.exchange}:${instrument.tradingsymbol}`,
    description: instrument.name,
    type: instrument.instrumentType,
    exchange: instrument.exchange,
    currency: "INR",
    source: PROVIDER,
  }));
}

export async function getZerodhaQuote(
  symbol: string,
  exchange?: string | null
): Promise<ProviderQuote> {
  const instrument = await resolveInstrument(symbol, exchange);
  const instrumentKey = toInstrumentKey(instrument);
  const raw = await getFromZerodha<ZerodhaQuoteResponse>("quote", { i: instrumentKey });
  const quote = raw.data?.[instrumentKey];

  if (!quote || quote.last_price === undefined) {
    throw new Error("Zerodha quote response was empty");
  }

  const previousClose = toNumber(quote.ohlc?.close);
  const price = toNumber(quote.last_price);
  const change = price !== null && previousClose !== null ? price - previousClose : null;

  return {
    symbol: instrument.tradingsymbol,
    price,
    change,
    changePercent:
      change !== null && previousClose ? Number(((change / previousClose) * 100).toFixed(4)) : null,
    previousClose,
    open: toNumber(quote.ohlc?.open),
    dayHigh: toNumber(quote.ohlc?.high),
    dayLow: toNumber(quote.ohlc?.low),
    volume: toNumber(quote.volume),
    source: PROVIDER,
    sourceUpdatedAt: quote.timestamp ?? quote.last_trade_time ?? null,
  };
}

export async function getZerodhaDailyOhlc(
  symbol: string,
  days = 180,
  exchange?: string | null
): Promise<ProviderOhlcDaily[]> {
  const instrument = await resolveInstrument(symbol, exchange);
  const to = formatKiteDate(new Date(), "23:59:59");
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - Math.max(days * 2, days + 30));
  const from = formatKiteDate(fromDate, "00:00:00");

  const raw = await getFromZerodha<ZerodhaHistoricalResponse>(
    `instruments/historical/${instrument.instrumentToken}/day`,
    { from, to }
  );
  const candles = raw.data?.candles ?? [];

  if (candles.length === 0) {
    throw new Error("Zerodha daily OHLC response was empty");
  }

  return candles
    .slice(-days)
    .map(([timestamp, open, high, low, close, volume]) => {
      const date = timestamp.slice(0, 10);

      return {
        symbol: instrument.tradingsymbol,
        date,
        open: toNumber(open),
        high: toNumber(high),
        low: toNumber(low),
        close: toNumber(close),
        adjustedClose: toNumber(close),
        volume: toNumber(volume),
        source: PROVIDER,
        sourceUpdatedAt: date,
      };
    });
}

async function resolveInstrument(symbol: string, exchange?: string | null) {
  const normalized = normalizeSymbol(symbol);
  const preferredExchange = normalizeExchange(exchange ?? getExchangeFromSymbol(symbol));
  const candidateExchanges = preferredExchange
    ? [preferredExchange, ...DEFAULT_EXCHANGES.filter((item) => item !== preferredExchange)]
    : DEFAULT_EXCHANGES;
  const instrumentsByExchange = await getInstrumentsByExchange();

  for (const candidateExchange of candidateExchanges) {
    const instrument = instrumentsByExchange
      .get(candidateExchange)
      ?.find((item) => item.tradingsymbol === normalized && item.instrumentType === "EQ");

    if (instrument) {
      return instrument;
    }
  }

  throw new Error(`Zerodha instrument ${symbol} was not found`);
}

async function getEquityInstruments() {
  const instrumentsByExchange = await getInstrumentsByExchange();

  return DEFAULT_EXCHANGES.flatMap((exchange) => instrumentsByExchange.get(exchange) ?? [])
    .filter((instrument) => instrument.instrumentType === "EQ" && instrument.tradingsymbol)
    .sort((left, right) => left.tradingsymbol.localeCompare(right.tradingsymbol));
}

async function getInstrumentsByExchange() {
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (instrumentCache && Date.now() - instrumentCache.fetchedAt < oneDayMs) {
    return instrumentCache.instrumentsByExchange;
  }

  const entries = await Promise.all(
    DEFAULT_EXCHANGES.map(async (exchange) => [
      exchange,
      await getZerodhaInstruments(exchange),
    ] as const)
  );
  const instrumentsByExchange = new Map(entries);

  instrumentCache = {
    fetchedAt: Date.now(),
    instrumentsByExchange,
  };

  return instrumentsByExchange;
}

async function getZerodhaInstruments(exchange: string) {
  const csv = await getZerodhaText(`instruments/${exchange}`);
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return rows
    .map((row) => mapInstrument(headers, parseCsvLine(row)))
    .filter((instrument): instrument is ZerodhaInstrument => instrument !== null);
}

function mapInstrument(headers: string[], values: string[]) {
  const row = new Map(headers.map((header, index) => [header, values[index] ?? ""]));
  const tradingsymbol = row.get("tradingsymbol")?.trim().toUpperCase();
  const instrumentToken = row.get("instrument_token")?.trim();
  const exchange = row.get("exchange")?.trim().toUpperCase();

  if (!tradingsymbol || !instrumentToken || !exchange || !INDIAN_EXCHANGES.has(exchange)) {
    return null;
  }

  return {
    instrumentToken,
    tradingsymbol,
    name: normalizeBlank(row.get("name")),
    instrumentType: normalizeBlank(row.get("instrument_type")),
    segment: normalizeBlank(row.get("segment")),
    exchange,
  };
}

async function getFromZerodha<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${ZERODHA_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  const response = await fetch(url, {
    cache: "no-store",
    headers: getZerodhaHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Zerodha ${endpoint} request failed with ${response.status}`);
  }

  const data = (await response.json()) as T;
  const message = getProviderMessage(data);

  if (message) {
    throw new Error(`Zerodha ${endpoint} unavailable: ${message}`);
  }

  return data;
}

async function getZerodhaText(endpoint: string) {
  const response = await fetch(`${ZERODHA_BASE_URL}/${endpoint}`, {
    cache: "no-store",
    headers: getZerodhaHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Zerodha ${endpoint} request failed with ${response.status}`);
  }

  return response.text();
}

function getZerodhaHeaders() {
  const apiKey = process.env.ZERODHA_API_KEY;
  const accessToken = process.env.ZERODHA_ACCESS_TOKEN;

  if (!apiKey || !accessToken) {
    throw new Error("ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN are not configured");
  }

  return {
    Authorization: `token ${apiKey}:${accessToken}`,
    "X-Kite-Version": "3",
  };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      current += char;
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);

  return cells;
}

function normalizeSymbol(symbol: string) {
  return symbol
    .trim()
    .toUpperCase()
    .replace(/^NSE:/, "")
    .replace(/^BSE:/, "")
    .replace(/\.NS$/, "")
    .replace(/\.BO$/, "");
}

function getExchangeFromSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();

  if (normalized.startsWith("NSE:") || normalized.endsWith(".NS")) {
    return "NSE";
  }

  if (normalized.startsWith("BSE:") || normalized.endsWith(".BO")) {
    return "BSE";
  }

  return null;
}

function normalizeExchange(exchange?: string | null) {
  const normalized = exchange?.trim().toUpperCase();

  return normalized && INDIAN_EXCHANGES.has(normalized) ? normalized : null;
}

function toInstrumentKey(instrument: ZerodhaInstrument) {
  return `${instrument.exchange}:${instrument.tradingsymbol}`;
}

function normalizeBlank(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatKiteDate(date: Date, time: string) {
  return `${date.toISOString().slice(0, 10)} ${time}`;
}

function getProviderMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as { status?: string; message?: string };

  return record.status === "error" ? record.message ?? "Unknown provider error" : null;
}

export const zerodhaProvider = {
  searchSymbols: searchZerodhaSymbols,
  getQuote: getZerodhaQuote,
  getDailyOhlc: getZerodhaDailyOhlc,
};
