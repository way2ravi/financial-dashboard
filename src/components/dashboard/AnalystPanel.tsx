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
  showDataSource?: boolean;
};

export function AnalystPanel({
  ratings,
  targets,
  quote,
  showDataSource = false,
}: Props) {
  const upside =
    quote?.price && targets?.targetMean
      ? ((targets.targetMean - quote.price) / quote.price) * 100
      : null;
  const rows = buildRatingRows(ratings, targets, upside);
  const totalRatings =
    (ratings?.strongBuy ?? 0) +
    (ratings?.buy ?? 0) +
    (ratings?.hold ?? 0) +
    (ratings?.sell ?? 0) +
    (ratings?.strongSell ?? 0);

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
            <DataFreshness
              fetchedAt={ratings?.fetchedAt}
              showSource={showDataSource}
              source={ratings?.source}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[360px]">
          <Target label="Low" value={formatCurrency(targets?.targetLow)} />
          <Target label="Mean" value={formatCurrency(targets?.targetMean)} />
          <Target label="High" value={formatCurrency(targets?.targetHigh)} />
          <div className="sm:col-span-3">
            <DataFreshness
              fetchedAt={targets?.fetchedAt}
              showSource={showDataSource}
              source={targets?.source}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b app-border-soft p-4 xl:grid-cols-[1.1fr_0.9fr]">
        <RatingDistribution ratings={ratings} total={totalRatings} />
        <PriceTargetGauge targets={targets} quote={quote} upside={upside} />
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

function RatingDistribution({
  ratings,
  total,
}: {
  ratings: AnalystRatingsSnapshot | null;
  total: number;
}) {
  const buckets = [
    { label: "Strong Buy", value: ratings?.strongBuy ?? 0, tone: "positive" },
    { label: "Buy", value: ratings?.buy ?? 0, tone: "positive" },
    { label: "Hold", value: ratings?.hold ?? 0, tone: "neutral" },
    { label: "Sell", value: ratings?.sell ?? 0, tone: "negative" },
    { label: "Strong Sell", value: ratings?.strongSell ?? 0, tone: "negative" },
  ] as const;
  const positive = (ratings?.strongBuy ?? 0) + (ratings?.buy ?? 0);
  const negative = (ratings?.sell ?? 0) + (ratings?.strongSell ?? 0);
  const positivePercent = total > 0 ? (positive / total) * 100 : 0;
  const negativePercent = total > 0 ? (negative / total) * 100 : 0;

  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
            Rating mix
          </div>
          <div className="mt-1 text-lg font-semibold app-heading">
            {ratings?.consensus ?? "No consensus"}
          </div>
          <p className="mt-1 text-xs leading-5 app-muted">
            {total > 0
              ? `${positivePercent.toFixed(0)}% bullish and ${negativePercent.toFixed(0)}% bearish across ${total} analysts.`
              : "No analyst rating count is cached yet."}
          </p>
        </div>
        <ConsensusDial positivePercent={positivePercent} />
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
        <div className="flex h-full">
          {buckets.map((bucket) => (
            <div
              key={bucket.label}
              className={getBucketClass(bucket.tone)}
              style={{ width: `${total > 0 ? (bucket.value / total) * 100 : 0}%` }}
              title={`${bucket.label}: ${bucket.value}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="rounded-md border app-surface px-2 py-2">
            <div className="text-[10px] font-medium app-muted">{bucket.label}</div>
            <div className={`mt-1 text-sm font-semibold ${getBucketTextClass(bucket.tone)}`}>
              {bucket.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceTargetGauge({
  quote,
  targets,
  upside,
}: {
  quote: QuoteLatest | null;
  targets: AnalystPriceTargetsSnapshot | null;
  upside: number | null;
}) {
  const low = targets?.targetLow ?? null;
  const mean = targets?.targetMean ?? null;
  const high = targets?.targetHigh ?? null;
  const price = quote?.price ?? null;
  const rangeMin = low ?? Math.min(...[price, mean, high].filter(isNumber));
  const rangeMax = high ?? Math.max(...[price, mean, high].filter(isNumber));
  const canDraw = isNumber(rangeMin) && isNumber(rangeMax) && rangeMax > rangeMin;
  const pricePosition = canDraw && isNumber(price) ? ((price - rangeMin) / (rangeMax - rangeMin)) * 100 : null;
  const meanPosition = canDraw && isNumber(mean) ? ((mean - rangeMin) / (rangeMax - rangeMin)) * 100 : null;

  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
            Price target range
          </div>
          <div className={`mt-1 text-lg font-semibold ${getUpsideClass(upside)}`}>
            {upside === null ? "Target unavailable" : `${formatSignedPercent(upside)} upside`}
          </div>
          <p className="mt-1 text-xs leading-5 app-muted">
            Current price compared with analyst low, mean, and high targets.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="relative h-3 rounded-full bg-[linear-gradient(90deg,var(--app-negative),var(--app-border),var(--app-positive))]">
          {pricePosition !== null ? <Marker label="Price" position={pricePosition} /> : null}
          {meanPosition !== null ? <Marker label="Mean" position={meanPosition} accent /> : null}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <TargetStat label="Price" value={formatCurrency(price)} />
          <TargetStat label="Low" value={formatCurrency(low)} />
          <TargetStat label="Mean" value={formatCurrency(mean)} />
          <TargetStat label="High" value={formatCurrency(high)} />
        </div>
      </div>
    </div>
  );
}

function ConsensusDial({ positivePercent }: { positivePercent: number }) {
  return (
    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border app-surface">
      <div
        className="grid h-16 w-16 place-items-center rounded-full text-center"
        style={{
          background: `conic-gradient(var(--app-positive) ${positivePercent}%, var(--app-border-soft) 0)`,
        }}
      >
        <div className="grid h-11 w-11 place-items-center rounded-full app-surface">
          <span className="text-xs font-semibold app-heading">{positivePercent.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function Marker({
  accent = false,
  label,
  position,
}: {
  accent?: boolean;
  label: string;
  position: number;
}) {
  const clamped = Math.max(0, Math.min(100, position));

  return (
    <span
      className={`absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full ${
        accent ? "bg-[var(--app-accent)]" : "bg-[var(--app-text)]"
      }`}
      style={{ left: `${clamped}%` }}
      title={label}
    />
  );
}

function TargetStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border app-surface px-2 py-2">
      <div className="text-[10px] font-medium app-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold app-heading">{value}</div>
    </div>
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

function getBucketClass(tone: "negative" | "neutral" | "positive") {
  if (tone === "positive") return "bg-[var(--app-positive)]";
  if (tone === "negative") return "bg-[var(--app-negative)]";

  return "bg-[var(--app-text-soft)]";
}

function getBucketTextClass(tone: "negative" | "neutral" | "positive") {
  if (tone === "positive") return "app-positive";
  if (tone === "negative") return "app-negative";

  return "app-heading";
}

function getUpsideClass(value: number | null) {
  if (value === null) return "app-heading";

  return value >= 0 ? "app-positive" : "app-negative";
}

function isNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
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
