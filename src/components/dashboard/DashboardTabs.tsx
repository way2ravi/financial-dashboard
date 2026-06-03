import Link from "next/link";
import { AnalystPanel } from "@/components/dashboard/AnalystPanel";
import { EarningsTable } from "@/components/dashboard/EarningsTable";
import { FundamentalsGrid } from "@/components/dashboard/FundamentalsGrid";
import { NewsBlock } from "@/components/dashboard/NewsBlock";
import {
  PriceChart,
  VolumeAnalytics,
  type ChartInterval,
  type ChartRange,
  type ChartType,
} from "@/components/dashboard/PriceChart";
import { ProtectedInsight } from "@/components/dashboard/ProtectedInsight";
import { SummaryPanel } from "@/components/dashboard/SummaryPanel";
import {
  TechnicalAnalysisPanel,
  type TechnicalSubTab,
} from "@/components/dashboard/TechnicalAnalysisPanel";
import type { DashboardData } from "@/lib/types";

type Props = {
  activeChartInterval: ChartInterval;
  activeChartRange: ChartRange;
  activeChartType: ChartType;
  activeTab: TabId;
  activeTechnicalTab: TechnicalSubTab;
  data: DashboardData;
  isAuthenticated?: boolean;
  showDataSource?: boolean;
};

export type DashboardTabId =
  | "summary"
  | "chart"
  | "volume"
  | "technical"
  | "analyst"
  | "earnings"
  | "fundamentals"
  | "news";

type TabId = DashboardTabId;

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "chart", label: "Chart" },
  { id: "volume", label: "Volume" },
  { id: "technical", label: "Technical" },
  { id: "analyst", label: "Analyst" },
  { id: "earnings", label: "Earnings" },
  { id: "fundamentals", label: "Fundamentals" },
  { id: "news", label: "News" },
];

export function DashboardTabs({
  activeChartInterval,
  activeChartRange,
  activeChartType,
  activeTab,
  activeTechnicalTab,
  data,
  isAuthenticated = false,
  showDataSource = false,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="overflow-x-auto rounded-lg border app-surface p-1 shadow-sm">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-[var(--app-primary)] text-white shadow-sm"
                  : "app-muted hover:bg-[color-mix(in_srgb,var(--app-teal)_14%,transparent)] hover:text-[var(--app-primary)]"
              }`}
              href={dashboardTabHref(data.ticker.symbol, tab.id)}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {activeTab === "summary" ? (
        <ProtectedInsight
          isAuthenticated={isAuthenticated}
          message="Sign in to view the consolidated buy, hold, or sell-style screening summary."
          title="Summary intelligence locked"
        >
          <SummaryPanel data={data} />
        </ProtectedInsight>
      ) : null}

      {activeTab === "chart" ? (
        <PriceChart
          chartType={activeChartType}
          interval={activeChartInterval}
          ohlc={data.ohlc}
          range={activeChartRange}
          showDataSource={showDataSource}
          symbol={data.ticker.symbol}
        />
      ) : null}

      {activeTab === "volume" ? (
        <ProtectedInsight
          isAuthenticated={isAuthenticated}
          message="Sign in to view volume pressure, buy/sell volume estimates, and recent activity."
          title="Volume analysis locked"
        >
          <VolumeAnalytics
            interval={activeChartInterval}
            ohlc={data.ohlc}
            range={activeChartRange}
            showDataSource={showDataSource}
          />
        </ProtectedInsight>
      ) : null}

      {activeTab === "technical" ? (
        <ProtectedInsight
          isAuthenticated={isAuthenticated}
          message="Sign in to view technical indicators, stop/limit analysis, and support/resistance levels."
          title="Technical analysis locked"
        >
          <div className="space-y-3">
            <TechnicalAnalysisPanel
              activeSubTab={activeTechnicalTab}
              ohlc={data.ohlc}
              showDataSource={showDataSource}
            />
          </div>
        </ProtectedInsight>
      ) : null}

      {activeTab === "analyst" ? (
        <ProtectedInsight
          isAuthenticated={isAuthenticated}
          message="Sign in to view analyst ratings, rating distribution, and target price data."
          title="Analyst insight locked"
        >
          <AnalystPanel
            ratings={data.analystRatings}
            targets={data.analystPriceTargets}
            quote={data.quote}
            showDataSource={showDataSource}
          />
        </ProtectedInsight>
      ) : null}

      {activeTab === "earnings" ? (
        <EarningsTable earnings={data.earnings} showDataSource={showDataSource} />
      ) : null}

      {activeTab === "fundamentals" ? (
        <ProtectedInsight
          isAuthenticated={isAuthenticated}
          message="Sign in to view fundamentals, financial statements, and valuation commentary."
          title="Fundamental analysis locked"
        >
          <FundamentalsGrid
            financialStatements={data.financialStatements}
            fundamentals={data.fundamentals}
            showDataSource={showDataSource}
          />
        </ProtectedInsight>
      ) : null}

      {activeTab === "news" ? (
        <NewsBlock news={data.news} showDataSource={showDataSource} />
      ) : null}
    </section>
  );
}

function dashboardTabHref(symbol: string, tab: DashboardTabId) {
  const params = new URLSearchParams({ symbol });

  if (tab !== "summary") {
    params.set("tab", tab);
  }

  return `/dashboard?${params.toString()}`;
}
