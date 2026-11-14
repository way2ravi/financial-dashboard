import Link from "next/link";
import { getContentPolicy } from "@/lib/content/settings";
import { recommendationFeatures } from "@/lib/content/policy";
import { filterDashboardContent } from "@/lib/content/dashboardPolicy";
import { NeutralSummary, NeutralAnalyst, NeutralTechnical } from "./NeutralAnalysis";
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

export async function DashboardTabs({
  activeChartInterval,
  activeChartRange,
  activeChartType,
  activeTab,
  activeTechnicalTab,
  data: rawData,
  isAuthenticated = false,
  showDataSource = false,
}: Props) {
  const policy = await getContentPolicy();
  const data = filterDashboardContent(rawData, policy);
  // Legacy consolidated views mix multiple recommendation types. Require every
  // relevant permission before invoking them; partial approvals stay neutral.
  const consolidatedAllowed = recommendationFeatures.every(key => policy[key]);
  return (
    <section className="space-y-3">
      <div className="research-tabs overflow-x-auto border-b app-border-soft">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`border-b-2 px-3 py-3 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "border-[var(--app-primary)] text-[var(--app-primary)]"
                  : "border-transparent app-muted hover:text-[var(--app-primary)]"
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
          message="Sign in to view the consolidated financial data summary."
          title="Summary intelligence locked"
        >
          {consolidatedAllowed ? <SummaryPanel data={data} /> : <NeutralSummary data={data} />}
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
            {!policy.informationalAnalysisEnabled ? <p className="py-4 text-sm app-muted">Technical analysis is currently unavailable.</p> : consolidatedAllowed ? <TechnicalAnalysisPanel
              activeSubTab={activeTechnicalTab}
              ohlc={data.ohlc}
              showDataSource={showDataSource}
            /> : <NeutralTechnical ohlc={data.ohlc} />}
          </div>
        </ProtectedInsight>
      ) : null}

      {activeTab === "analyst" ? (
        <ProtectedInsight
          isAuthenticated={isAuthenticated}
          message="Sign in to view analyst ratings, rating distribution, and target price data."
          title="Analyst insight locked"
        >
          {consolidatedAllowed ? <AnalystPanel
            ratings={data.analystRatings}
            targets={data.analystPriceTargets}
            quote={data.quote}
            showDataSource={showDataSource}
          /> : <NeutralAnalyst data={data} />}
        </ProtectedInsight>
      ) : null}

      {activeTab === "earnings" ? (
        <EarningsTable
          earnings={data.earnings}
          financialStatements={data.financialStatements}
          ohlc={data.ohlc}
          showDataSource={showDataSource}
        />
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

  return `/stock?${params.toString()}`;
}
