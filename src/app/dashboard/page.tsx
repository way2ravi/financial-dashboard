import { AnalystPanel } from "@/components/dashboard/AnalystPanel";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { EarningsTable } from "@/components/dashboard/EarningsTable";
import { FundamentalsGrid } from "@/components/dashboard/FundamentalsGrid";
import { OverviewStrip } from "@/components/dashboard/OverviewStrip";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { mockDashboardData } from "@/lib/mock/dashboard";
import { getDashboardBySymbol } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types";

type Props = {
  searchParams: Promise<{
    symbol?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const selectedSymbol = getSelectedSymbol(await searchParams);
  const data = await loadDashboardData(selectedSymbol);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <OverviewStrip data={data} />

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_280px] lg:px-8">
        <div className="space-y-4">
          <div className="flex justify-end">
            <AuthStatus />
          </div>
          <AnalystPanel
            ratings={data.analystRatings}
            targets={data.analystPriceTargets}
            quote={data.quote}
          />
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <EarningsTable earnings={data.earnings} />
            <FundamentalsGrid fundamentals={data.fundamentals} />
          </div>
          <PriceChart ohlc={data.ohlc} />
        </div>
        <Watchlist currentSymbol={data.ticker.symbol} />
      </div>
    </main>
  );
}

async function loadDashboardData(symbol: string): Promise<DashboardData> {
  try {
    const supabase = await createClient();
    return await getDashboardBySymbol(supabase, symbol);
  } catch {
    return mockDashboardData;
  }
}

function getSelectedSymbol(searchParams: Awaited<Props["searchParams"]>) {
  const rawSymbol = Array.isArray(searchParams.symbol)
    ? searchParams.symbol[0]
    : searchParams.symbol;

  return (rawSymbol || mockDashboardData.ticker.symbol).trim().toUpperCase();
}
