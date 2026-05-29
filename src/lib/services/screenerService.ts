import "server-only";

import { getAlphaVantageMarketMovers } from "@/lib/providers";
import { getCachedScreenerRows } from "@/lib/repositories";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ScreenerCategory,
  ScreenerCategoryResult,
  ScreenerResult,
} from "@/lib/types";

const categoryMeta: Record<
  ScreenerCategory,
  { title: string; description: string }
> = {
  undervalued: {
    title: "Undervalued",
    description: "Lower P/E, positive price, actively traded common stocks.",
  },
  overvalued: {
    title: "Most overvalued",
    description: "High P/E names that may be pricing in aggressive growth.",
  },
  weekHigh: {
    title: "Near 52-week high",
    description: "Stocks trading closest to their 52-week high.",
  },
  weekLow: {
    title: "Near 52-week low",
    description: "Stocks trading closest to their 52-week low.",
  },
  mostActive: {
    title: "Most active",
    description: "Highest-volume names from market mover feeds.",
  },
  topGainers: {
    title: "Top gainers",
    description: "Largest positive percent movers.",
  },
  topLosers: {
    title: "Top losers",
    description: "Largest negative percent movers.",
  },
};

export async function getStockScreener(): Promise<ScreenerCategoryResult[]> {
  const cachedItems = await loadCachedScreenerRows();

  if (cachedItems.length > 0) {
    return getCachedStockScreener(cachedItems);
  }

  const marketMovers = await safeMarketMovers();

  return [
    createUnavailableCategory("undervalued"),
    createUnavailableCategory("overvalued"),
    createUnavailableCategory("weekHigh"),
    createUnavailableCategory("weekLow"),
    marketMovers.mostActive,
    marketMovers.topGainers,
    marketMovers.topLosers,
  ];
}

async function loadCachedScreenerRows() {
  try {
    return await getCachedScreenerRows(createAdminClient());
  } catch {
    return [];
  }
}

function getCachedStockScreener(items: ScreenerResult[]): ScreenerCategoryResult[] {
  return [
    createCategory(
      "undervalued",
      items
        .filter((item) => item.price !== null && item.pe !== null && item.pe > 0)
        .sort((a, b) => (a.pe ?? Number.POSITIVE_INFINITY) - (b.pe ?? Number.POSITIVE_INFINITY))
        .slice(0, 20)
    ),
    createCategory(
      "overvalued",
      items
        .filter((item) => item.price !== null && item.pe !== null)
        .sort((a, b) => (b.pe ?? 0) - (a.pe ?? 0))
        .slice(0, 20)
    ),
    createCategory(
      "weekHigh",
      items
        .filter((item) => item.price !== null && item.yearHigh !== null)
        .sort((a, b) => distanceToHigh(a) - distanceToHigh(b))
        .slice(0, 20)
    ),
    createCategory(
      "weekLow",
      items
        .filter((item) => item.price !== null && item.yearLow !== null)
        .sort((a, b) => distanceToLow(a) - distanceToLow(b))
        .slice(0, 20)
    ),
    createCategory(
      "mostActive",
      [...items]
        .filter((item) => item.volume !== null)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
        .slice(0, 20)
    ),
    createCategory(
      "topGainers",
      [...items]
        .filter((item) => item.changePercent !== null)
        .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
        .slice(0, 20)
    ),
    createCategory(
      "topLosers",
      [...items]
        .filter((item) => item.changePercent !== null)
        .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))
        .slice(0, 20)
    ),
  ];
}

async function safeMarketMovers() {
  try {
    const alpha = await getAlphaVantageMarketMovers();

    return {
      mostActive: createCategory("mostActive", alpha.mostActive),
      topGainers: createCategory("topGainers", alpha.topGainers),
      topLosers: createCategory("topLosers", alpha.topLosers),
    };
  } catch (error) {
    return {
      mostActive: createErroredCategory("mostActive", error),
      topGainers: createErroredCategory("topGainers", error),
      topLosers: createErroredCategory("topLosers", error),
    };
  }
}

function createCategory(
  category: ScreenerCategory,
  items: ScreenerResult[]
): ScreenerCategoryResult {
  return {
    ...categoryMeta[category],
    category,
    items,
    error: null,
  };
}

function createUnavailableCategory(category: ScreenerCategory): ScreenerCategoryResult {
  return {
    ...categoryMeta[category],
    category,
    items: [],
    error:
      "Load more ticker dashboards to build this screen from cached fundamentals and OHLC data.",
  };
}

function createErroredCategory(
  category: ScreenerCategory,
  error: unknown
): ScreenerCategoryResult {
  return {
    ...categoryMeta[category],
    category,
    items: [],
    error: getErrorMessage(error),
  };
}

function distanceToHigh(item: ScreenerResult) {
  if (!item.price || !item.yearHigh) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs((item.yearHigh - item.price) / item.yearHigh);
}

function distanceToLow(item: ScreenerResult) {
  if (!item.price || !item.yearLow) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs((item.price - item.yearLow) / item.yearLow);
}

function getErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown screener provider error";

  if (message.includes("Alpha Vantage")) {
    return "Alpha Vantage screener feed is unavailable or rate limited.";
  }

  return "Screener provider is unavailable.";
}
