import Link from "next/link";
import { AnalystPanel } from "@/components/dashboard/AnalystPanel";
import { EarningsTable } from "@/components/dashboard/EarningsTable";
import { FundamentalsGrid } from "@/components/dashboard/FundamentalsGrid";
import { NewsBlock } from "@/components/dashboard/NewsBlock";
import {
  PriceChart,
  type ChartInterval,
  type ChartRange,
  type ChartType,
} from "@/components/dashboard/PriceChart";
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
  showDataSource?: boolean;
};

export type DashboardTabId =
  | "summary"
  | "chart"
  | "technical"
  | "analyst"
  | "earnings"
  | "fundamentals"
  | "news";

type TabId = DashboardTabId;

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "chart", label: "Chart" },
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
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "app-primary-button"
                  : "app-muted hover:bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] hover:text-[var(--app-text)]"
              }`}
              href={dashboardTabHref(data.ticker.symbol, tab.id)}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {activeTab === "summary" ? <SummaryPanel data={data} /> : null}

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

      {activeTab === "technical" ? (
        <div className="space-y-3">
          <TechnicalAnalysisPanel
            activeSubTab={activeTechnicalTab}
            ohlc={data.ohlc}
            showDataSource={showDataSource}
          />
        </div>
      ) : null}

      {activeTab === "analyst" ? (
        <AnalystPanel
          ratings={data.analystRatings}
          targets={data.analystPriceTargets}
          quote={data.quote}
          showDataSource={showDataSource}
        />
      ) : null}

      {activeTab === "earnings" ? (
        <EarningsTable earnings={data.earnings} showDataSource={showDataSource} />
      ) : null}

      {activeTab === "fundamentals" ? (
        <FundamentalsGrid
          fundamentals={data.fundamentals}
          showDataSource={showDataSource}
        />
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
