import type { DashboardData } from "@/lib/types";
import { AppNav } from "./AppNav";
import { AuthStatus } from "./AuthStatus";
import { DataFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber, formatPercent } from "./format";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { TickerSearch } from "./TickerSearch";

type Props = {
  data: DashboardData;
};

export function OverviewStrip({ data }: Props) {
  const quote = data.quote;
  const positive = (quote?.change ?? 0) >= 0;

  return (
    <section className="border-b app-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm app-muted">
              <span>{data.ticker.exchange}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--app-border)]" />
              <span>{data.ticker.sector}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-3xl font-semibold tracking-normal app-heading">
                {data.ticker.symbol}
              </h1>
              <p className="text-lg app-muted">{data.ticker.name}</p>
            </div>
            <div className="mt-3">
              <DataFreshness fetchedAt={quote?.fetchedAt} source={quote?.source} />
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
              <AppNav current="dashboard" />
              <ThemeSwitcher />
              <AuthStatus />
            </div>
            <TickerSearch initialSymbol={data.ticker.symbol} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Last price" value={formatCurrency(quote?.price)} />
          <Metric
            label="Day change"
            value={`${positive ? "+" : ""}${formatCurrency(quote?.change)} (${positive ? "+" : ""}${formatPercent(quote?.changePercent)})`}
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
    <div className="rounded-lg border app-subtle px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-normal app-muted">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
