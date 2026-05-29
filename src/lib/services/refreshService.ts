import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAlphaVantageDailyOhlc,
  getAlphaVantageEarnings,
  getAlphaVantageFundamentals,
  getAlphaVantageNews,
  getAlphaVantageQuote,
  getFinnhubAnalystRatings,
  getFinnhubCompanyProfile,
  getFinnhubDailyOhlc,
  getFinnhubEarnings,
  getFinnhubFundamentals,
  getFinnhubCompanyNews,
  getFinnhubPriceTargets,
  getFinnhubQuote,
  getFmpAnalystRatings,
  getFmpDailyOhlc,
  getFmpFundamentals,
  getFmpPriceTargets,
  getFmpQuote,
  getTwelveDataDailyOhlc,
  getTwelveDataQuote,
} from "@/lib/providers";
import {
  findTickerBySymbol,
  getActiveTickers,
  logProviderFetch,
  upsertAnalystPriceTargets,
  upsertAnalystRatings,
  upsertDailyOhlc,
  upsertFundamentalsSnapshot,
  upsertCompanyNews,
  upsertLatestQuote,
  upsertQuarterlyEarnings,
  updateTickerProfile,
} from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type {
  ProviderQuote,
  ProviderName,
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
    const quote = await tryProviderFallbacks(supabase, normalizedSymbol, "quote", [
      { provider: "finnhub", run: () => getFinnhubQuote(normalizedSymbol) },
      { provider: "twelve_data", run: () => getTwelveDataQuote(normalizedSymbol) },
      { provider: "alpha_vantage", run: () => getAlphaVantageQuote(normalizedSymbol) },
      { provider: "fmp", run: () => getFmpQuote(normalizedSymbol) },
    ]);
    await upsertLatestQuote(supabase, ticker, quote);
    await logProviderFetch(supabase, {
      provider: quote.source,
      endpoint: "quote",
      symbol: normalizedSymbol,
      status: "success",
    });

    return quote;
  } catch (error) {
    await logProviderFetch(supabase, {
      provider: "provider_fallback",
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
      module: "profile",
      run: async () => {
        const profile = await getFinnhubCompanyProfile(normalizedSymbol);
        await updateTickerProfile(supabase, ticker, profile);
        return { module: "profile", status: "success", updated: 1 };
      },
    },
    {
      module: "quote",
      run: async () => {
        const quote = await tryProviderFallbacks(supabase, normalizedSymbol, "quote", [
          { provider: "finnhub", run: () => getFinnhubQuote(normalizedSymbol) },
          { provider: "twelve_data", run: () => getTwelveDataQuote(normalizedSymbol) },
          {
            provider: "alpha_vantage",
            run: () => getAlphaVantageQuote(normalizedSymbol),
          },
          { provider: "fmp", run: () => getFmpQuote(normalizedSymbol) },
        ]);
        await upsertLatestQuote(supabase, ticker, quote);
        return { module: "quote", status: "success", updated: 1, provider: quote.source };
      },
    },
    {
      module: "analystRatings",
      run: async () => {
        const ratings = await tryProviderFallbacks(
          supabase,
          normalizedSymbol,
          "analystRatings",
          [
            {
              provider: "finnhub",
              run: () => getFinnhubAnalystRatings(normalizedSymbol),
            },
            { provider: "fmp", run: () => getFmpAnalystRatings(normalizedSymbol) },
          ]
        );
        await upsertAnalystRatings(supabase, ticker, ratings);
        return {
          module: "analystRatings",
          status: "success",
          updated: 1,
          provider: ratings.source,
        };
      },
    },
    {
      module: "priceTargets",
      run: async () => {
        const targets = await tryProviderFallbacks(
          supabase,
          normalizedSymbol,
          "priceTargets",
          [
            { provider: "finnhub", run: () => getFinnhubPriceTargets(normalizedSymbol) },
            { provider: "fmp", run: () => getFmpPriceTargets(normalizedSymbol) },
          ]
        );
        await upsertAnalystPriceTargets(supabase, ticker, targets);
        return {
          module: "priceTargets",
          status: "success",
          updated: 1,
          provider: targets.source,
        };
      },
    },
    {
      module: "earnings",
      run: async () => {
        const earnings = await tryProviderFallbacks(
          supabase,
          normalizedSymbol,
          "earnings",
          [
            { provider: "finnhub", run: () => getFinnhubEarnings(normalizedSymbol) },
            {
              provider: "alpha_vantage",
              run: () => getAlphaVantageEarnings(normalizedSymbol),
            },
          ]
        );
        await upsertQuarterlyEarnings(supabase, ticker, earnings);
        return {
          module: "earnings",
          status: "success",
          updated: earnings.length,
          provider: earnings[0]?.source,
        };
      },
    },
    {
      module: "fundamentals",
      run: async () => {
        const fundamentals = await tryProviderFallbacks(
          supabase,
          normalizedSymbol,
          "fundamentals",
          [
            { provider: "fmp", run: () => getFmpFundamentals(normalizedSymbol) },
            {
              provider: "alpha_vantage",
              run: () => getAlphaVantageFundamentals(normalizedSymbol),
            },
            { provider: "finnhub", run: () => getFinnhubFundamentals(normalizedSymbol) },
          ]
        );
        await upsertFundamentalsSnapshot(supabase, ticker, fundamentals);
        return {
          module: "fundamentals",
          status: "success",
          updated: 1,
          provider: fundamentals.source,
        };
      },
    },
    {
      module: "ohlc",
      run: async () => {
        const candles = await tryProviderFallbacks(supabase, normalizedSymbol, "ohlc", [
          {
            provider: "twelve_data",
            run: () => getTwelveDataDailyOhlc(normalizedSymbol),
          },
          {
            provider: "alpha_vantage",
            run: () => getAlphaVantageDailyOhlc(normalizedSymbol),
          },
          { provider: "fmp", run: () => getFmpDailyOhlc(normalizedSymbol) },
          { provider: "finnhub", run: () => getFinnhubDailyOhlc(normalizedSymbol) },
        ]);
        await upsertDailyOhlc(supabase, ticker, candles);
        return {
          module: "ohlc",
          status: "success",
          updated: candles.length,
          provider: candles[0]?.source,
        };
      },
    },
    {
      module: "news",
      run: async () => {
        const articles = await tryProviderFallbacks(
          supabase,
          normalizedSymbol,
          "news",
          [
            { provider: "finnhub", run: () => getFinnhubCompanyNews(normalizedSymbol) },
            {
              provider: "alpha_vantage",
              run: () => getAlphaVantageNews(normalizedSymbol),
            },
          ]
        );
        await upsertCompanyNews(supabase, ticker, articles);
        return {
          module: "news",
          status: "success",
          updated: articles.length,
          provider: articles[0]?.source,
        };
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
      provider: "provider_fallback",
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
      provider: result.provider ?? "unknown",
      endpoint: result.module,
      symbol,
      status: "success",
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown provider error";
    await logProviderFetch(supabase, {
      provider: "provider_fallback",
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

async function tryProviderFallbacks<T>(
  supabase: DbClient,
  symbol: string,
  endpoint: string,
  providers: Array<{ provider: ProviderName | string; run: () => Promise<T> }>
): Promise<T> {
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await provider.run();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown provider error";
      errors.push(`${provider.provider}: ${errorMessage}`);

      await logProviderFetchSafely(supabase, {
        provider: provider.provider,
        endpoint,
        symbol,
        status: "error",
        errorMessage,
      });
    }
  }

  throw new Error(errors.join(" | "));
}

async function logProviderFetchSafely(
  supabase: DbClient,
  input: Parameters<typeof logProviderFetch>[1]
) {
  try {
    await logProviderFetch(supabase, input);
  } catch {
    // Provider fallback should not fail because diagnostic logging is unavailable.
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
