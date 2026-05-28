import type { AnalystPriceTargetsSnapshot, AnalystRatingsSnapshot, QuoteLatest } from "@/lib/types";
import { formatCurrency, formatNumber } from "./format";

type Props = {
  ratings: AnalystRatingsSnapshot | null;
  targets: AnalystPriceTargetsSnapshot | null;
  quote: QuoteLatest | null;
};

export function AnalystPanel({ ratings, targets, quote }: Props) {
  const upside =
    quote?.price && targets?.targetMean
      ? ((targets.targetMean - quote.price) / quote.price) * 100
      : null;

  const ratingItems = [
    ["Strong Buy", ratings?.strongBuy ?? 0],
    ["Buy", ratings?.buy ?? 0],
    ["Hold", ratings?.hold ?? 0],
    ["Sell", ratings?.sell ?? 0],
    ["Strong Sell", ratings?.strongSell ?? 0],
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Analyst Rating</h2>
            <p className="mt-1 text-sm text-slate-500">{ratings?.analystCount ?? 0} analysts</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-right">
            <div className="text-xs font-medium text-emerald-700">Consensus</div>
            <div className="text-xl font-semibold text-emerald-800">{ratings?.consensus ?? "-"}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2">
          {ratingItems.map(([label, count]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <div className="text-lg font-semibold text-slate-950">{count}</div>
              <div className="mt-1 text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Price Targets</h2>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Target label="Low" value={formatCurrency(targets?.targetLow)} />
          <Target label="Mean" value={formatCurrency(targets?.targetMean)} />
          <Target label="High" value={formatCurrency(targets?.targetHigh)} />
        </div>
        <div className="mt-4 rounded-lg bg-slate-950 px-4 py-3 text-white">
          <div className="text-xs text-slate-300">Implied upside</div>
          <div className="text-2xl font-semibold">{upside === null ? "-" : `${formatNumber(upside)}%`}</div>
        </div>
      </div>
    </section>
  );
}

function Target({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

