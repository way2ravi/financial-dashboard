import type { DashboardData } from "@/lib/types";
import { AppNav } from "./AppNav";
import { AuthStatus } from "./AuthStatus";
import { BrandMark } from "./BrandMark";
import { DataFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber, formatPercent } from "./format";
import { TickerLogo } from "./TickerLogo";
import { TickerSearch } from "./TickerSearch";

type Props = {
  data: DashboardData;
  showDataSource?: boolean;
};

export function OverviewStrip({ data, showDataSource = false }: Props) {
  const quote = data.quote;
  const hasDayChange = quote?.change !== null && quote?.change !== undefined;
  const positive = (quote?.change ?? 0) >= 0;
  const dayChange = hasDayChange
    ? `${positive ? "+" : ""}${formatCurrency(quote?.change)} (${positive ? "+" : ""}${formatPercent(quote?.changePercent)})`
    : "-";

  return (
    <section className="border-b app-brand-header">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <BrandMark />

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1 lg:justify-end">
            <AppNav current="dashboard" />
            <AuthStatus />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/15 pt-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <TickerLogo ticker={data.ticker} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-header-muted)]">
                <span>{data.ticker.exchange}</span>
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span>{data.ticker.sector}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h1 className="brand-display text-3xl font-bold tracking-normal text-white">
                  {data.ticker.symbol}
                </h1>
                <p className="text-sm text-[var(--app-header-muted)]">{data.ticker.name}</p>
              </div>
              <div className="mt-2">
                <DataFreshness
                  fetchedAt={quote?.fetchedAt}
                  showSource={showDataSource}
                  source={quote?.source}
                />
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-[620px] lg:items-end">
            <TickerSearch initialSymbol={data.ticker.symbol} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Last price" value={formatCurrency(quote?.price)} />
          <Metric
            label="Day change"
            value={dayChange}
            tone={positive ? "positive" : "negative"}
          />
          <Metric label="Open" value={formatCurrency(quote?.open)} />
          <Metric label="Day range" value={`${formatCurrency(quote?.dayLow)} - ${formatCurrency(quote?.dayHigh)}`} />
          <Metric label="Volume" value={formatNumber(quote?.volume, 0)} />
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "app-positive"
      : tone === "negative"
        ? "app-negative"
        : "app-heading";

  return (
    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-normal text-[var(--app-header-muted)]">{label}</div>
      <div className={`mt-1 text-base font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
