import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getFinnhubAnalystRatings,
  getFinnhubDailyOhlc,
  getFinnhubEarnings,
  getFinnhubFundamentals,
  getFinnhubPriceTargets,
  getFinnhubQuote,
} from "@/lib/providers";
import {
  findTickerBySymbol,
  getActiveTickers,
  logProviderFetch,
  upsertAnalystPriceTargets,
  upsertAnalystRatings,
  upsertDailyOhlc,
  upsertFundamentalsSnapshot,
  upsertLatestQuote,
  upsertQuarterlyEarnings,
} from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type {
  ProviderQuote,
  RefreshModule,
  RefreshResult,
  RefreshScope,
  SymbolRefreshResult,
} from "@/lib/types/market";
import { AppError } from "./errors";

type DbClient = SupabaseClient<Database>;

export async function refreshQuoteForSymbol(
  supabase: DbClient,
  symbol: string
): Promise<ProviderQuote> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const ticker = await findTickerBySymbol(supabase, normalizedSymbol);

  if (!ticker) {
    throw new AppError(`Ticker ${normalizedSymbol} was not found`, 404);
  }

  try {
    const quote = await getFinnhubQuote(normalizedSymbol);
    await upsertLatestQuote(supabase, ticker, quote);
    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: "quote",
      symbol: normalizedSymbol,
      status: "success",
    });

    return quote;
  } catch (error) {
    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: "quote",
      symbol: normalizedSymbol,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown provider error",
    });

    throw error;
  }
}

export async function refreshMarketDataForSymbol(
  supabase: DbClient,
  symbol: string,
  scope: RefreshScope = {}
): Promise<RefreshResult[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const ticker = await findTickerBySymbol(supabase, normalizedSymbol);

  if (!ticker) {
    throw new AppError(`Ticker ${normalizedSymbol} was not found`, 404);
  }

  const tasks: Array<{ module: RefreshModule; run: () => Promise<RefreshResult> }> = [
    {
      module: "quote",
      run: async () => {
        const quote = await getFinnhubQuote(normalizedSymbol);
        await upsertLatestQuote(supabase, ticker, quote);
        return { module: "quote", status: "success", updated: 1 };
      },
    },
    {
      module: "analystRatings",
      run: async () => {
        const ratings = await getFinnhubAnalystRatings(normalizedSymbol);
        await upsertAnalystRatings(supabase, ticker, ratings);
        return { module: "analystRatings", status: "success", updated: 1 };
      },
    },
    {
      module: "priceTargets",
      run: async () => {
        const targets = await getFinnhubPriceTargets(normalizedSymbol);
        await upsertAnalystPriceTargets(supabase, ticker, targets);
        return { module: "priceTargets", status: "success", updated: 1 };
      },
    },
    {
      module: "earnings",
      run: async () => {
        const earnings = await getFinnhubEarnings(normalizedSymbol);
        await upsertQuarterlyEarnings(supabase, ticker, earnings);
        return { module: "earnings", status: "success", updated: earnings.length };
      },
    },
    {
      module: "fundamentals",
      run: async () => {
        const fundamentals = await getFinnhubFundamentals(normalizedSymbol);
        await upsertFundamentalsSnapshot(supabase, ticker, fundamentals);
        return { module: "fundamentals", status: "success", updated: 1 };
      },
    },
    {
      module: "ohlc",
      run: async () => {
        const candles = await getFinnhubDailyOhlc(normalizedSymbol);
        await upsertDailyOhlc(supabase, ticker, candles);
        return { module: "ohlc", status: "success", updated: candles.length };
      },
    },
  ];

  const selectedTasks = filterRefreshTasks(tasks, scope);

  return Promise.all(
    selectedTasks.map((task) =>
      runRefreshTask(supabase, normalizedSymbol, task.module, task.run)
    )
  );
}

export async function refreshActiveMarketData(
  supabase: DbClient,
  options: { limit?: number; symbols?: string[]; scope?: RefreshScope } = {}
): Promise<SymbolRefreshResult[]> {
  const symbols =
    options.symbols && options.symbols.length > 0
      ? options.symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)
      : (await getActiveTickers(supabase, options.limit ?? 5)).map(
          (ticker) => ticker.symbol
        );
  const uniqueSymbols = [...new Set(symbols)].slice(0, options.limit ?? 5);
  const results: SymbolRefreshResult[] = [];

  for (const symbol of uniqueSymbols) {
    results.push({
      symbol,
      results: await refreshMarketDataForSymbolSafely(supabase, symbol, options.scope),
    });
  }

  return results;
}

async function refreshMarketDataForSymbolSafely(
  supabase: DbClient,
  symbol: string,
  scope?: RefreshScope
): Promise<RefreshResult[]> {
  try {
    return await refreshMarketDataForSymbol(supabase, symbol, scope);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown symbol refresh error";

    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: "symbol",
      symbol,
      status: "error",
      errorMessage,
    });

    return [
      {
        module: "quote",
        status: "error",
        updated: 0,
        error: errorMessage,
      },
    ];
  }
}

function filterRefreshTasks(
  tasks: Array<{ module: RefreshModule; run: () => Promise<RefreshResult> }>,
  scope: RefreshScope
) {
  const selectedModules = Object.entries(scope)
    .filter(([, selected]) => selected)
    .map(([module]) => module);

  if (selectedModules.length === 0) {
    return tasks;
  }

  return tasks.filter((task) => scope[task.module]);
}

async function runRefreshTask(
  supabase: DbClient,
  symbol: string,
  module: RefreshModule,
  task: () => Promise<RefreshResult>
): Promise<RefreshResult> {
  try {
    const result = await task();
    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: result.module,
      symbol,
      status: "success",
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown provider error";
    await logProviderFetch(supabase, {
      provider: "finnhub",
      endpoint: module,
      symbol,
      status: "error",
      errorMessage,
    });

    return {
      module,
      status: "error",
      updated: 0,
      error: errorMessage,
    };
  }
}

export async function requireAdmin(supabase: DbClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError("You must be signed in", 401);
  }

  const { data: profile, error } = await supabase
    .from("users_profile")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile?.role !== "admin") {
    throw new AppError("Admin access is required", 403);
  }

  return user;
}
