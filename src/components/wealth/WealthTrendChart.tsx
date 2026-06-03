import { formatCurrency, formatPercent } from "@/components/dashboard/format";
import type { WealthSnapshot } from "@/lib/types/wealth";

type Props = {
  currency: string;
  snapshots: WealthSnapshot[];
};

export function WealthTrendChart({ currency, snapshots }: Props) {
  const latest = snapshots.at(-1) ?? null;
  const first = snapshots[0] ?? null;
  const netWorthChange =
    latest && first ? latest.netWorth - first.netWorth : null;
  const netWorthChangePercent =
    latest && first && Math.abs(first.netWorth) > 0
      ? (netWorthChange ?? 0) / Math.abs(first.netWorth) * 100
      : null;

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Net Worth History</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            A daily snapshot is saved when you open Wealth. Over time this shows whether assets,
            liabilities, and net worth are moving in the right direction.
          </p>
        </div>
        <div className="rounded-lg border app-subtle px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-wide app-muted">Tracked days</div>
          <div className="mt-1 text-sm font-semibold app-heading">{snapshots.length}</div>
        </div>
      </div>

      {snapshots.length < 2 ? (
        <div className="mt-4 rounded-lg border border-dashed app-subtle p-4 text-xs leading-5 app-muted">
          History has started. Add or update entries on different days to build a useful trend.
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <TrendMetric
              label="Net worth change"
              value={formatSignedCurrency(netWorthChange, currency)}
              tone={(netWorthChange ?? 0) >= 0 ? "positive" : "negative"}
            />
            <TrendMetric
              label="Change %"
              value={
                netWorthChangePercent === null
                  ? "-"
                  : `${netWorthChangePercent >= 0 ? "+" : ""}${formatPercent(netWorthChangePercent)}`
              }
              tone={(netWorthChangePercent ?? 0) >= 0 ? "positive" : "negative"}
            />
            <TrendMetric
              label="Latest snapshot"
              value={latest?.snapshotDate ?? "-"}
            />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
            <NetWorthLine snapshots={snapshots} currency={currency} />
            <SnapshotBars latest={latest} currency={currency} />
          </div>
        </>
      )}
    </section>
  );
}

function NetWorthLine({
  snapshots,
  currency,
}: {
  snapshots: WealthSnapshot[];
  currency: string;
}) {
  const width = 620;
  const height = 220;
  const padding = 24;
  const values = snapshots.map((snapshot) => snapshot.netWorth);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(max - min, 1);
  const points = snapshots.map((snapshot, index) => {
    const x =
      snapshots.length === 1
        ? width / 2
        : padding + (index / (snapshots.length - 1)) * (width - padding * 2);
    const y = height - padding - ((snapshot.netWorth - min) / range) * (height - padding * 2);

    return { x, y, snapshot };
  });
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const zeroY = height - padding - ((0 - min) / range) * (height - padding * 2);

  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold app-heading">Net worth trend</span>
        <span className="app-muted">
          {formatCurrency(min, true, currency)} to {formatCurrency(max, true, currency)}
        </span>
      </div>
      <svg
        className="mt-3 h-[220px] w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Net worth history line chart"
      >
        <line
          x1={padding}
          x2={width - padding}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--app-border)"
          strokeDasharray="4 4"
        />
        <path d={path} fill="none" stroke="var(--app-positive)" strokeWidth="3" />
        {points.map((point) => (
          <circle
            key={point.snapshot.snapshotDate}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="var(--app-positive)"
          />
        ))}
        <text x={padding} y={18} className="fill-[var(--app-muted)] text-[10px]">
          {formatCurrency(max, true, currency)}
        </text>
        <text x={padding} y={height - 6} className="fill-[var(--app-muted)] text-[10px]">
          {formatCurrency(min, true, currency)}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-[11px] app-muted">
        <span>{snapshots[0]?.snapshotDate}</span>
        <span>{snapshots.at(-1)?.snapshotDate}</span>
      </div>
    </div>
  );
}

function SnapshotBars({
  latest,
  currency,
}: {
  latest: WealthSnapshot | null;
  currency: string;
}) {
  const max = Math.max(latest?.totalAssets ?? 0, latest?.totalLiabilities ?? 0, 1);

  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="text-xs font-semibold app-heading">Latest composition</div>
      <div className="mt-4 space-y-4">
        <SnapshotBar
          label="Assets"
          value={latest?.totalAssets ?? 0}
          max={max}
          currency={currency}
          tone="positive"
        />
        <SnapshotBar
          label="Liabilities"
          value={latest?.totalLiabilities ?? 0}
          max={max}
          currency={currency}
          tone="negative"
        />
        <SnapshotBar
          label="Investments"
          value={latest?.investments ?? 0}
          max={max}
          currency={currency}
          tone="neutral"
        />
      </div>
    </div>
  );
}

function SnapshotBar({
  label,
  value,
  max,
  currency,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  currency: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const color =
    tone === "positive" ? "bg-emerald-500" : tone === "negative" ? "bg-rose-500" : "bg-sky-500";

  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-xs">
        <span className="app-muted">{label}</span>
        <span className="font-semibold app-heading">{formatCurrency(value, true, currency)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full app-surface">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TrendMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "app-heading";

  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide app-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function formatSignedCurrency(value: number | null, currency: string) {
  if (value === null) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${formatCurrency(value, false, currency)}`;
}
