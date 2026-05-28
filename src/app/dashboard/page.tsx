import { AnalystPanel } from "@/components/dashboard/AnalystPanel";
import { AdminRefreshControl } from "@/components/dashboard/AdminRefreshControl";
import { EarningsTable } from "@/components/dashboard/EarningsTable";
import { FundamentalsGrid } from "@/components/dashboard/FundamentalsGrid";
import { OverviewStrip } from "@/components/dashboard/OverviewStrip";
import { PageMessage } from "@/components/dashboard/PageMessage";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { mockDashboardData } from "@/lib/mock/dashboard";
import { getDashboardBySymbol } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types";
import type { PageMessageValue } from "@/components/dashboard/PageMessage";

type Props = {
  searchParams: Promise<{
    error?: string | string[];
    notice?: string | string[];
    symbol?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const selectedSymbol = getSelectedSymbol(resolvedSearchParams);
  const message = getPageMessage(resolvedSearchParams);
  const { data, fallbackMessage } = await loadDashboardData(selectedSymbol);
  const pageMessage = message ?? fallbackMessage;

  return (
    <main className="min-h-screen app-bg">
      <OverviewStrip data={data} />

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <Watchlist currentSymbol={data.ticker.symbol} />
        <div className="min-w-0 space-y-4">
          <PageMessage message={pageMessage} />
          <div className="flex justify-end">
            <AdminRefreshControl symbol={data.ticker.symbol} />
          </div>
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

async function loadDashboardData(
  symbol: string
): Promise<{ data: DashboardData; fallbackMessage: PageMessageValue }> {
  try {
    const supabase = await createClient();
    return {
      data: await getDashboardBySymbol(supabase, symbol),
      fallbackMessage: null,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "dashboard data was unavailable";

    return {
      data: mockDashboardData,
      fallbackMessage: {
        tone: "notice",
        text: `Showing sample data because ${reason}. Run the Supabase setup SQL or refresh cached data.`,
      },
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
