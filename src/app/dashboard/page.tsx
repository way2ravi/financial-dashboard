import {
  DashboardTabs,
  type DashboardTabId,
} from "@/components/dashboard/DashboardTabs";
import type {
  ChartInterval,
  ChartRange,
  ChartType,
} from "@/components/dashboard/PriceChart";
import type { TechnicalSubTab } from "@/components/dashboard/TechnicalAnalysisPanel";
import { OverviewStrip } from "@/components/dashboard/OverviewStrip";
import { PageMessage } from "@/components/dashboard/PageMessage";
import { mockDashboardData } from "@/lib/mock/dashboard";
import {
  getDashboardBySymbol,
  getTickerBySymbol,
  currentUserIsAdmin,
  refreshMarketDataForSymbol,
  searchTickerDirectory,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types";
import type { PageMessageValue } from "@/components/dashboard/PageMessage";

type Props = {
  searchParams: Promise<{
    autoload?: string | string[];
    chart?: string | string[];
    error?: string | string[];
    interval?: string | string[];
    notice?: string | string[];
    range?: string | string[];
    symbol?: string | string[];
    tab?: string | string[];
    tech?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const selectedSymbol = getSelectedSymbol(resolvedSearchParams);
  const selectedTab = getSelectedTab(resolvedSearchParams);
  const selectedTechnicalTab = getSelectedTechnicalTab(resolvedSearchParams);
  const selectedChartType = getSelectedChartType(resolvedSearchParams);
  const selectedChartRange = getSelectedChartRange(resolvedSearchParams);
  const selectedChartInterval = getSelectedChartInterval(resolvedSearchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);
  const showDataSource = await currentUserIsAdmin(supabase);
  const message = getPageMessage(resolvedSearchParams);
  const autoloadRequested = getSearchParam(resolvedSearchParams.autoload) === "1";
  const autoloadMessage = selectedSymbol && isAuthenticated && autoloadRequested
    ? await maybeAutoloadDashboardData(selectedSymbol, resolvedSearchParams)
    : null;
  const { data, fallbackMessage } = selectedSymbol
    ? isAuthenticated
      ? await loadDashboardData(selectedSymbol, selectedTab, {
          refreshIncomplete: !autoloadRequested,
        })
      : await loadPublicDashboardData(selectedSymbol)
    : { data: emptyDashboardData(emptyTicker()), fallbackMessage: null };
  const pageMessage = message ?? autoloadMessage ?? fallbackMessage;

  return (
    <main className="min-h-screen app-bg">
      <OverviewStrip
        data={data}
        showDataSource={showDataSource}
      />

      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <PageMessage message={pageMessage} />
        {selectedSymbol ? (
          <DashboardTabs
            activeChartInterval={selectedChartInterval}
            activeChartRange={selectedChartRange}
            activeChartType={selectedChartType}
            activeTab={selectedTab}
            activeTechnicalTab={selectedTechnicalTab}
            data={data}
            isAuthenticated={isAuthenticated}
            showDataSource={showDataSource}
          />
        ) : (
          <EmptyDashboardState />
        )}
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
    await refreshMarketDataForSymbol(supabase, symbol);

    return null;
  } catch (error) {
    return {
      tone: "error",
      text: error instanceof Error ? error.message : `Could not load ${symbol}.`,
    };
  }
}

async function loadDashboardData(
  symbol: string,
  selectedTab: DashboardTabId,
  options: { refreshIncomplete?: boolean } = {}
): Promise<{ data: DashboardData; fallbackMessage: PageMessageValue }> {
  try {
    const supabase = await createClient();
    const data = await getDashboardBySymbol(supabase, symbol);

    if (options.refreshIncomplete !== false && shouldRefreshDashboardData(data, selectedTab)) {
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
        text: `${symbol} is in the ticker directory, but some dashboard data is not cached yet. Select the ticker again or wait for provider limits to reset. Reason: ${reason}.`,
      },
    };
  }
}

async function loadPublicDashboardData(
  symbol: string
): Promise<{ data: DashboardData; fallbackMessage: PageMessageValue }> {
  try {
    const supabase = await createClient();

    return {
      data: await getDashboardBySymbol(supabase, symbol),
      fallbackMessage: null,
    };
  } catch {
    return {
      data: emptyDashboardData({
        ...mockDashboardData.ticker,
        symbol,
        name: `${symbol} ticker`,
        exchange: null,
        sector: null,
        industry: null,
        logoUrl: null,
      }),
      fallbackMessage: null,
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

function shouldRefreshDashboardData(data: DashboardData, selectedTab: DashboardTabId) {
  if (isDashboardCacheEmpty(data)) {
    return true;
  }

  if (selectedTab === "chart") {
    return data.ohlc.length < 2;
  }

  if (selectedTab === "technical" || selectedTab === "volume") {
    return data.ohlc.length < 30;
  }

  if (selectedTab === "analyst") {
    return !data.analystRatings || !data.analystPriceTargets;
  }

  if (selectedTab === "earnings") {
    return data.earnings.length === 0 || data.ohlc.length < 2;
  }

  if (selectedTab === "fundamentals") {
    return (
      !data.fundamentals ||
      (data.financialStatements.annual.length === 0 &&
        data.financialStatements.quarterly.length === 0)
    );
  }

  if (selectedTab === "news") {
    return data.news.length === 0;
  }

  return false;
}

async function loadFallbackDashboardData(symbol: string): Promise<DashboardData> {
  try {
    const supabase = await createClient();
    const ticker = await getTickerBySymbol(supabase, symbol);

    return emptyDashboardData(ticker);
  } catch {
    return emptyDashboardData({
        ...mockDashboardData.ticker,
        symbol,
        name: `${symbol} ticker`,
        exchange: null,
        sector: null,
        industry: null,
        logoUrl: null,
      });
  }
}

function emptyDashboardData(ticker: DashboardData["ticker"]): DashboardData {
  return {
    ticker,
    quote: null,
    analystRatings: null,
    analystPriceTargets: null,
    earnings: [],
    fundamentals: null,
    financialStatements: { annual: [], quarterly: [] },
    ohlc: [],
    news: [],
  };
}

function emptyTicker(): DashboardData["ticker"] {
  return {
    id: 0,
    symbol: "",
    exchange: null,
    name: "Search a ticker",
    sector: null,
    industry: null,
    currency: null,
    logoUrl: null,
    isActive: true,
  };
}

function EmptyDashboardState() {
  return (
    <section className="rounded-lg border app-surface p-6 text-center shadow-sm">
      <div className="mx-auto max-w-xl">
        <h2 className="text-base font-semibold app-heading">Search a ticker to begin</h2>
        <p className="mt-2 text-sm leading-6 app-muted">
          Use the ticker search above to load a company dashboard. No stock is selected by default.
        </p>
      </div>
    </section>
  );
}

function getSelectedSymbol(searchParams: Awaited<Props["searchParams"]>) {
  const rawSymbol = Array.isArray(searchParams.symbol)
    ? searchParams.symbol[0]
    : searchParams.symbol;

  const symbol = rawSymbol?.trim().toUpperCase() ?? "";

  return symbol || null;
}

function getSelectedTab(searchParams: Awaited<Props["searchParams"]>): DashboardTabId {
  const tab = getSearchParam(searchParams.tab);

  if (tab === "support-resistance") {
    return "technical";
  }

  if (
    tab === "summary" ||
    tab === "chart" ||
    tab === "volume" ||
    tab === "technical" ||
    tab === "analyst" ||
    tab === "earnings" ||
    tab === "fundamentals" ||
    tab === "news"
  ) {
    return tab;
  }

  return "summary";
}

function getSelectedTechnicalTab(
  searchParams: Awaited<Props["searchParams"]>
): TechnicalSubTab {
  const tech = getSearchParam(searchParams.tech);
  const tab = getSearchParam(searchParams.tab);

  if (
    tech === "signals" ||
    tech === "ranges" ||
    tech === "moving-averages" ||
    tech === "momentum" ||
    tech === "stop-limit" ||
    tech === "support-resistance"
  ) {
    return tech;
  }

  if (tech === "stop-loss") {
    return "stop-limit";
  }

  if (tab === "support-resistance") {
    return "support-resistance";
  }

  return "stop-limit";
}

function getSelectedChartType(searchParams: Awaited<Props["searchParams"]>): ChartType {
  const chart = getSearchParam(searchParams.chart);

  if (chart === "line" || chart === "candles" || chart === "ohlc" || chart === "area") {
    return chart;
  }

  return "area";
}

function getSelectedChartRange(searchParams: Awaited<Props["searchParams"]>): ChartRange {
  const range = getSearchParam(searchParams.range);

  if (range === "1m" || range === "3m" || range === "6m" || range === "1y" || range === "all") {
    return range;
  }

  return "6m";
}

function getSelectedChartInterval(
  searchParams: Awaited<Props["searchParams"]>
): ChartInterval {
  const interval = getSearchParam(searchParams.interval);

  if (interval === "weekly" || interval === "monthly" || interval === "daily") {
    return interval;
  }

  return "daily";
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
