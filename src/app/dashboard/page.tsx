import { AnalystPanel } from "@/components/dashboard/AnalystPanel";
import { DailyEarningsBlock } from "@/components/dashboard/DailyEarningsBlock";
import { EarningsTable } from "@/components/dashboard/EarningsTable";
import { FundamentalsGrid } from "@/components/dashboard/FundamentalsGrid";
import { OverviewStrip } from "@/components/dashboard/OverviewStrip";
import { PageMessage } from "@/components/dashboard/PageMessage";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { mockDashboardData } from "@/lib/mock/dashboard";
import {
  getDashboardBySymbol,
  getTickerBySymbol,
  refreshMarketDataForSymbol,
  searchTickerDirectory,
  summarizeRefreshResults,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types";
import type { PageMessageValue } from "@/components/dashboard/PageMessage";

type Props = {
  searchParams: Promise<{
    autoload?: string | string[];
    error?: string | string[];
    notice?: string | string[];
    symbol?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const selectedSymbol = getSelectedSymbol(resolvedSearchParams);
  const message = getPageMessage(resolvedSearchParams);
  const autoloadMessage = await maybeAutoloadDashboardData(
    selectedSymbol,
    resolvedSearchParams
  );
  const { data, fallbackMessage } = await loadDashboardData(selectedSymbol);
  const pageMessage = message ?? autoloadMessage ?? fallbackMessage;

  return (
    <main className="min-h-screen app-bg">
      <OverviewStrip data={data} />

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="min-w-0 self-start space-y-4 lg:sticky lg:top-4">
          <Watchlist currentSymbol={data.ticker.symbol} />
          <DailyEarningsBlock currentSymbol={data.ticker.symbol} />
        </aside>
        <div className="min-w-0 space-y-4">
          <PageMessage message={pageMessage} />
          <AnalystPanel
            ratings={data.analystRatings}
            targets={data.analystPriceTargets}
            quote={data.quote}
          />
          <EarningsTable earnings={data.earnings} />
          <FundamentalsGrid fundamentals={data.fundamentals} />
          <PriceChart ohlc={data.ohlc} />
        </div>
      </div>
    </main>
  );
}

async function maybeAutoloadDashboardData(
  symbol: string,
  searchParams: Awaited<Props["searchParams"]>
): Promise<PageMessageValue> {
  if (getSearchParam(searchParams.autoload) !== "1") {
    return null;
  }

  try {
    const supabase = createAdminClient();

    await searchTickerDirectory(supabase, symbol, 6);
    const results = await refreshMarketDataForSymbol(supabase, symbol);
    const summary = summarizeRefreshResults(results);

    return {
      tone: summary.failed > 0 ? "notice" : "notice",
      text:
        summary.failed > 0
          ? `Loaded ${summary.updated} rows for ${symbol}; some provider modules were unavailable.`
          : `Loaded data for ${symbol}.`,
    };
  } catch (error) {
    return {
      tone: "error",
      text: error instanceof Error ? error.message : `Could not load ${symbol}.`,
    };
  }
}

async function loadDashboardData(
  symbol: string
): Promise<{ data: DashboardData; fallbackMessage: PageMessageValue }> {
  try {
    const supabase = await createClient();
    const data = await getDashboardBySymbol(supabase, symbol);

    if (isDashboardCacheEmpty(data)) {
      const autoloadMessage = await maybeAutoloadDashboardData(symbol, {
        autoload: "1",
      });

      return {
        data: await getDashboardBySymbol(supabase, symbol),
        fallbackMessage: autoloadMessage,
      };
    }

    return { data, fallbackMessage: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "dashboard data was unavailable";
    const autoloadMessage = await maybeAutoloadDashboardData(symbol, {
      autoload: "1",
    });
    const fallbackData = await loadFallbackDashboardData(symbol);

    return {
      data: fallbackData,
      fallbackMessage: autoloadMessage ?? {
        tone: "notice",
        text: `${symbol} is in the ticker directory, but some dashboard data is not cached yet. Press Load to fetch fresh data. Reason: ${reason}.`,
      },
    };
  }
}

function isDashboardCacheEmpty(data: DashboardData) {
  return (
    !data.quote &&
    !data.analystRatings &&
    !data.analystPriceTargets &&
    data.earnings.length === 0 &&
    !data.fundamentals &&
    data.ohlc.length === 0
  );
}

async function loadFallbackDashboardData(symbol: string): Promise<DashboardData> {
  try {
    const supabase = await createClient();
    const ticker = await getTickerBySymbol(supabase, symbol);

    return {
      ticker,
      quote: null,
      analystRatings: null,
      analystPriceTargets: null,
      earnings: [],
      fundamentals: null,
      ohlc: [],
    };
  } catch {
    return {
      ...mockDashboardData,
      ticker: {
        ...mockDashboardData.ticker,
        symbol,
        name: `${symbol} ticker`,
        exchange: null,
        sector: null,
        industry: null,
      },
      quote: null,
      analystRatings: null,
      analystPriceTargets: null,
      earnings: [],
      fundamentals: null,
      ohlc: [],
    };
  }
}

function getSelectedSymbol(searchParams: Awaited<Props["searchParams"]>) {
  const rawSymbol = Array.isArray(searchParams.symbol)
    ? searchParams.symbol[0]
    : searchParams.symbol;

  return (rawSymbol || mockDashboardData.ticker.symbol).trim().toUpperCase();
}

function getPageMessage(searchParams: Awaited<Props["searchParams"]>) {
  const error = getSearchParam(searchParams.error);
  const notice = getSearchParam(searchParams.notice);

  if (error) {
    return { tone: "error" as const, text: error };
  }

  if (notice) {
    return { tone: "notice" as const, text: notice };
  }

  return null;
}

function getSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
