import type { DashboardData } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "./format";
import { TickerSearch } from "./TickerSearch";

type Props = {
  data: DashboardData;
};

export function OverviewStrip({ data }: Props) {
  const quote = data.quote;
  const positive = (quote?.change ?? 0) >= 0;

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{data.ticker.exchange}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{data.ticker.sector}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
                {data.ticker.symbol}
              </h1>
              <p className="text-lg text-slate-600">{data.ticker.name}</p>
            </div>
          </div>

          <TickerSearch initialSymbol={data.ticker.symbol} />
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
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-rose-700"
        : "text-slate-950";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-normal text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
