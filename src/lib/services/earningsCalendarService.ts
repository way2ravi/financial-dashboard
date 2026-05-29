import type { SupabaseClient } from "@supabase/supabase-js";
import { getFinnhubEarningsCalendar } from "@/lib/providers";
import {
  ensureTickersBySymbols,
  getEarningsCalendarByDate,
  logProviderFetch,
  upsertEarningsCalendar,
} from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type { EarningsCalendarItem } from "@/lib/types/market";
import { refreshMarketDataForSymbol } from "./refreshService";

type DbClient = SupabaseClient<Database>;

export type EarningsCalendarResult = {
  date: string;
  items: EarningsCalendarItem[];
  refreshed: boolean;
  message: string | null;
};

export async function getDailyEarningsCalendar(
  supabase: DbClient,
  date: string
): Promise<EarningsCalendarResult> {
  const normalizedDate = normalizeDate(date);
  const cached = await getEarningsCalendarByDate(supabase, normalizedDate);

  return {
    date: normalizedDate,
    items: cached,
    refreshed: false,
    message: null,
  };
}

export async function refreshDailyEarningsCalendar(
  supabase: DbClient,
  date: string
): Promise<EarningsCalendarResult> {
  const normalizedDate = normalizeDate(date);

  try {
    const providerRows = await getFinnhubEarningsCalendar(normalizedDate);
    await upsertEarningsCalendar(supabase, providerRows);
    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: "calendar/earnings",
      status: "success",
    });

    return {
      date: normalizedDate,
      items: await getEarningsCalendarByDate(supabase, normalizedDate),
      refreshed: true,
      message:
        providerRows.length > 0
          ? `Loaded ${providerRows.length} earnings reports for ${normalizedDate}.`
          : `No earnings reports found for ${normalizedDate}.`,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: "calendar/earnings",
      status: "error",
      errorMessage: message,
    });

    return {
      date: normalizedDate,
      items: await getEarningsCalendarByDate(supabase, normalizedDate),
      refreshed: false,
      message,
    };
  }
}

export async function getOrRefreshDailyEarningsCalendar(
  readClient: DbClient,
  writeClient: DbClient,
  date: string
): Promise<EarningsCalendarResult> {
  const cached = await getDailyEarningsCalendar(readClient, date);

  if (cached.items.length > 0) {
    return cached;
  }

  return refreshDailyEarningsCalendar(writeClient, cached.date);
}

export async function refreshEarningsCalendarAnalystData(
  supabase: DbClient,
  items: EarningsCalendarItem[]
): Promise<{
  attempted: number;
  quotesUpdated: number;
  ratingsUpdated: number;
  targetsUpdated: number;
  failed: number;
}> {
  const symbols = [
    ...new Set(items.map((item) => item.symbol.trim().toUpperCase()).filter(Boolean)),
  ];

  await ensureTickersBySymbols(supabase, symbols);

  let quotesUpdated = 0;
  let ratingsUpdated = 0;
  let targetsUpdated = 0;
  let failed = 0;

  for (const symbol of symbols) {
    const results = await refreshMarketDataForSymbol(supabase, symbol, {
      quote: true,
      analystRatings: true,
      priceTargets: true,
    });
    const quoteResult = results.find((result) => result.module === "quote");
    const ratingsResult = results.find((result) => result.module === "analystRatings");
    const targetsResult = results.find((result) => result.module === "priceTargets");

    if (quoteResult?.status === "success") {
      quotesUpdated += 1;
    }

    if (ratingsResult?.status === "success") {
      ratingsUpdated += 1;
    }

    if (targetsResult?.status === "success") {
      targetsUpdated += 1;
    }

    if (
      quoteResult?.status !== "success" &&
      ratingsResult?.status !== "success" &&
      targetsResult?.status !== "success"
    ) {
      failed += 1;
    }
  }

  return {
    attempted: symbols.length,
    quotesUpdated,
    ratingsUpdated,
    targetsUpdated,
    failed,
  };
}

function normalizeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    throw new Error("Date must use YYYY-MM-DD format");
  }

  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return "Unknown earnings calendar provider error";
}
