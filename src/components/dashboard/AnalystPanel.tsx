import type { AnalystPriceTargetsSnapshot, AnalystRatingsSnapshot, QuoteLatest } from "@/lib/types";
import { DataFreshness } from "./DataFreshness";
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
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border app-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold app-heading">Analyst Rating</h2>
            <p className="mt-1 text-sm app-muted">{ratings?.analystCount ?? 0} analysts</p>
            <div className="mt-3">
              <DataFreshness fetchedAt={ratings?.fetchedAt} source={ratings?.source} />
            </div>
          </div>
          <div className="rounded-lg bg-[color-mix(in_srgb,var(--app-positive)_12%,transparent)] px-3 py-2 text-right">
            <div className="text-xs font-medium app-positive">Consensus</div>
            <div className="text-xl font-semibold app-positive">{ratings?.consensus ?? "-"}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ratingItems.map(([label, count]) => (
            <div key={label} className="rounded-lg border app-subtle p-3 text-center">
              <div className="text-lg font-semibold app-heading">{count}</div>
              <div className="mt-1 text-xs app-muted">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border app-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-base font-semibold app-heading">Price Targets</h2>
          <DataFreshness fetchedAt={targets?.fetchedAt} source={targets?.source} />
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Target label="Low" value={formatCurrency(targets?.targetLow)} />
          <Target label="Mean" value={formatCurrency(targets?.targetMean)} />
          <Target label="High" value={formatCurrency(targets?.targetHigh)} />
        </div>
        <div className="mt-4 rounded-lg bg-[var(--app-primary)] px-4 py-3 text-[var(--app-primary-text)]">
          <div className="text-xs opacity-75">Implied upside</div>
          <div className="text-2xl font-semibold">{upside === null ? "-" : `${formatNumber(upside)}%`}</div>
        </div>
      </div>
    </section>
  );
}

function Target({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="text-xs font-medium app-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold app-heading">{value}</div>
    </div>
  );
}
