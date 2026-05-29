import Link from "next/link";
import { AnalystPanel } from "@/components/dashboard/AnalystPanel";
import { EarningsTable } from "@/components/dashboard/EarningsTable";
import { FundamentalsGrid } from "@/components/dashboard/FundamentalsGrid";
import { NewsBlock } from "@/components/dashboard/NewsBlock";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { SupportResistancePanel } from "@/components/dashboard/SupportResistancePanel";
import type { DashboardData } from "@/lib/types";

type Props = {
  activeTab: TabId;
  data: DashboardData;
};

export type DashboardTabId = "analyst" | "earnings" | "fundamentals" | "chart" | "news";

type TabId = DashboardTabId;

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "analyst", label: "Analyst" },
  { id: "earnings", label: "Earnings" },
  { id: "fundamentals", label: "Fundamentals" },
  { id: "chart", label: "Chart" },
  { id: "news", label: "News" },
];

export function DashboardTabs({ activeTab, data }: Props) {
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

      {activeTab === "analyst" ? (
        <AnalystPanel
          ratings={data.analystRatings}
          targets={data.analystPriceTargets}
          quote={data.quote}
        />
      ) : null}

      {activeTab === "earnings" ? <EarningsTable earnings={data.earnings} /> : null}

      {activeTab === "fundamentals" ? (
        <FundamentalsGrid fundamentals={data.fundamentals} />
      ) : null}

      {activeTab === "chart" ? (
        <div className="space-y-3">
          <SupportResistancePanel ohlc={data.ohlc} />
          <PriceChart ohlc={data.ohlc} />
        </div>
      ) : null}

      {activeTab === "news" ? <NewsBlock news={data.news} /> : null}
    </section>
  );
}

function dashboardTabHref(symbol: string, tab: DashboardTabId) {
  const params = new URLSearchParams({ symbol });

  if (tab !== "analyst") {
    params.set("tab", tab);
  }

  return `/dashboard?${params.toString()}`;
}
