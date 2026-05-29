import type {
  AnalystPriceTargetsSnapshot,
  AnalystRatingsSnapshot,
  QuoteLatest,
} from "@/lib/types";
import { DataFreshness } from "./DataFreshness";
import { formatCurrency, formatPercent } from "./format";

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
  const rows = buildRatingRows(ratings, targets, upside);

  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div className="flex flex-col gap-3 border-b app-border-soft px-4 py-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold app-heading">Analyst Ratings</h2>
            <span className="flex h-4 w-4 items-center justify-center rounded-full border app-muted text-[10px]">
              i
            </span>
          </div>
          <p className="mt-1 text-xs app-muted">{ratings?.analystCount ?? 0} analysts</p>
          <div className="mt-2">
            <DataFreshness fetchedAt={ratings?.fetchedAt} source={ratings?.source} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[360px]">
          <Target label="Low" value={formatCurrency(targets?.targetLow)} />
          <Target label="Mean" value={formatCurrency(targets?.targetMean)} />
          <Target label="High" value={formatCurrency(targets?.targetHigh)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-subtle">
            <tr className="font-semibold uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2">Firm</th>
              <th className="border-b app-border-soft px-3 py-2">Article</th>
              <th className="border-b app-border-soft px-3 py-2">Position</th>
              <th className="border-b app-border-soft px-3 py-2 text-right">Price Target</th>
              <th className="border-b app-border-soft px-3 py-2 text-right">Upside / Downside</th>
              <th className="border-b app-border-soft px-3 py-2 text-right">From Price Target</th>
              <th className="border-b app-border-soft px-3 py-2">Action</th>
              <th className="border-b app-border-soft px-3 py-2 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.firm} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                <td className="border-b app-border-soft px-3 py-2.5 font-semibold app-heading">
                  {row.firm}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--app-primary)] text-[10px] font-semibold text-[var(--app-primary)]">
                    Doc
                  </span>
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <RatingText value={row.position} />
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right font-semibold app-heading">
                  {row.priceTarget}
                </td>
                <td className={`border-b app-border-soft px-3 py-2.5 text-right font-semibold ${row.upsideClass}`}>
                  {row.upside}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right font-semibold app-heading">
                  {row.fromPriceTarget}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">{row.action}</td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatDate(row.date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildRatingRows(
  ratings: AnalystRatingsSnapshot | null,
  targets: AnalystPriceTargetsSnapshot | null,
  upside: number | null
) {
  const asOfDate = ratings?.asOfDate ?? targets?.asOfDate ?? null;
  const targetRows = [
    {
      firm: "Consensus",
      position: ratings?.consensus ?? "-",
      priceTarget: formatCurrency(targets?.targetMean),
      upside,
      fromPriceTarget: formatCurrency(targets?.targetMedian),
      action: "Latest",
      date: asOfDate,
    },
    ratingBucket("Strong Buy", ratings?.strongBuy, asOfDate),
    ratingBucket("Buy", ratings?.buy, asOfDate),
    ratingBucket("Hold", ratings?.hold, asOfDate),
    ratingBucket("Sell", ratings?.sell, asOfDate),
    ratingBucket("Strong Sell", ratings?.strongSell, asOfDate),
  ];

  return targetRows.map((row) => ({
    ...row,
    upside: row.upside === null ? "-" : formatSignedPercent(row.upside),
    upsideClass:
      row.upside === null ? "app-muted" : row.upside >= 0 ? "app-positive" : "app-negative",
  }));
}

function ratingBucket(label: string, count: number | undefined, date: string | null) {
  return {
    firm: label,
    position: label,
    priceTarget: "-",
    upside: null,
    fromPriceTarget: "-",
    action: `${count ?? 0} analysts`,
    date,
  };
}

function RatingText({ value }: { value: string | null }) {
  const positive = value === "Strong Buy" || value === "Buy";
  const negative = value === "Sell" || value === "Strong Sell";

  return (
    <span
      className={`font-semibold ${
        positive ? "app-positive" : negative ? "app-negative" : "app-heading"
      }`}
    >
      {value || "-"}
    </span>
  );
}

function Target({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border app-subtle px-3 py-2">
      <div className="text-[11px] font-medium app-muted">{label}</div>
      <div className="mt-1 text-base font-semibold app-heading">{value}</div>
    </div>
  );
}

function formatSignedPercent(value: number) {
  const formatted = formatPercent(value);

  return value > 0 ? `+${formatted}` : formatted;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
