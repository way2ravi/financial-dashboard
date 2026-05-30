import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureTickersBySymbols,
  findTickersBySymbols,
  getLatestQuote,
} from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type { QuoteLatest, Ticker } from "@/lib/types/market";
import { refreshQuoteForSymbol } from "./refreshService";

type DbClient = SupabaseClient<Database>;

export type GlobalMarketRegion =
  | "United States"
  | "Europe"
  | "Asia-Pacific"
  | "Emerging Markets";

export type GlobalMarketDefinition = {
  symbol: string;
  name: string;
  region: GlobalMarketRegion;
  country: string;
  benchmark: string;
};

export type GlobalMarketRow = GlobalMarketDefinition & {
  quote: QuoteLatest | null;
  ticker: Ticker | null;
};

export type MarketMood = {
  averageChange: number | null;
  decliners: number;
  advancers: number;
  label: string;
  score: number;
  summary: string;
  tone: "positive" | "negative" | "neutral";
};

export type MarketOverview = {
  markets: GlobalMarketRow[];
  mood: MarketMood;
  refreshedAt: string | null;
};

export const globalMarketDefinitions: GlobalMarketDefinition[] = [
  {
    symbol: "SPY",
    name: "S&P 500",
    region: "United States",
    country: "United States",
    benchmark: "Large-cap US market",
  },
  {
    symbol: "QQQ",
    name: "Nasdaq 100",
    region: "United States",
    country: "United States",
    benchmark: "US growth and technology",
  },
  {
    symbol: "DIA",
    name: "Dow Jones",
    region: "United States",
    country: "United States",
    benchmark: "US blue chips",
  },
  {
    symbol: "IWM",
    name: "Russell 2000",
    region: "United States",
    country: "United States",
    benchmark: "US small caps",
  },
  {
    symbol: "EWU",
    name: "United Kingdom",
    region: "Europe",
    country: "United Kingdom",
    benchmark: "UK equities proxy",
  },
  {
    symbol: "EWG",
    name: "Germany",
    region: "Europe",
    country: "Germany",
    benchmark: "German equities proxy",
  },
  {
    symbol: "EWQ",
    name: "France",
    region: "Europe",
    country: "France",
    benchmark: "French equities proxy",
  },
  {
    symbol: "EWJ",
    name: "Japan",
    region: "Asia-Pacific",
    country: "Japan",
    benchmark: "Japanese equities proxy",
  },
  {
    symbol: "EWA",
    name: "Australia",
    region: "Asia-Pacific",
    country: "Australia",
    benchmark: "Australian equities proxy",
  },
  {
    symbol: "INDA",
    name: "India",
    region: "Asia-Pacific",
    country: "India",
    benchmark: "Indian equities proxy",
  },
  {
    symbol: "FXI",
    name: "China",
    region: "Emerging Markets",
    country: "China",
    benchmark: "China large-cap proxy",
  },
  {
    symbol: "EWZ",
    name: "Brazil",
    region: "Emerging Markets",
    country: "Brazil",
    benchmark: "Brazil equities proxy",
  },
];

export async function getMarketOverview(
  supabase: DbClient,
  options: { refresh?: boolean } = {}
): Promise<MarketOverview> {
  const symbols = globalMarketDefinitions.map((market) => market.symbol);

  await ensureTickersBySymbols(supabase, symbols);

  if (options.refresh) {
    await refreshGlobalMarketQuotes(supabase, symbols);
  }

  const tickers = await findTickersBySymbols(supabase, symbols);
  const tickersBySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
  const rows = await Promise.all(
    globalMarketDefinitions.map(async (market) => {
      const ticker = tickersBySymbol.get(market.symbol) ?? null;
      const quote = ticker ? await getLatestQuote(supabase, ticker.id) : null;

      return {
        ...market,
        quote,
        ticker,
      };
    })
  );

  const missingQuotes = rows.filter((row) => !row.quote).length;

  if (!options.refresh && missingQuotes > rows.length / 2) {
    await refreshGlobalMarketQuotes(supabase, symbols);
    return getMarketOverview(supabase, { refresh: false });
  }

  return {
    markets: rows,
    mood: buildMarketMood(rows),
    refreshedAt: getLatestFetchedAt(rows),
  };
}

async function refreshGlobalMarketQuotes(supabase: DbClient, symbols: string[]) {
  for (const symbol of symbols) {
    try {
      await refreshQuoteForSymbol(supabase, symbol);
    } catch {
      // Keep cached data for providers that do not support a proxy symbol.
    }
  }
}

function buildMarketMood(rows: GlobalMarketRow[]): MarketMood {
  const changes = rows
    .map((row) => row.quote?.changePercent)
    .filter((value): value is number => value !== null && value !== undefined);
  const advancers = changes.filter((value) => value > 0).length;
  const decliners = changes.filter((value) => value < 0).length;
  const averageChange =
    changes.length === 0
      ? null
      : changes.reduce((total, value) => total + value, 0) / changes.length;
  const breadthScore =
    changes.length === 0 ? 0 : ((advancers - decliners) / changes.length) * 18;
  const momentumScore = averageChange === null ? 0 : Math.max(-25, Math.min(25, averageChange * 8));
  const score = Math.max(0, Math.min(100, 50 + breadthScore + momentumScore));
  const label = getFearGreedLabel(score);
  const tone = score >= 60 ? "positive" : score <= 40 ? "negative" : "neutral";

  return {
    averageChange,
    advancers,
    decliners,
    label,
    score,
    summary:
      averageChange === null
        ? "Market mood needs fresh quote data. Load markets to calculate the fear and greed gauge."
        : `${advancers} markets are green and ${decliners} are red. Average daily move is ${averageChange.toFixed(2)}%.`,
    tone,
  };
}

function getFearGreedLabel(score: number) {
  if (score <= 20) return "Extreme Fear";
  if (score <= 40) return "Fear";
  if (score < 60) return "Neutral";
  if (score < 80) return "Greed";
  return "Extreme Greed";
}

function getLatestFetchedAt(rows: GlobalMarketRow[]) {
  const timestamps = rows
    .map((row) => row.quote?.fetchedAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  return timestamps.at(-1) ?? null;
}
