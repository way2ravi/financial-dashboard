import type { WealthBreakdownSlice } from "@/lib/types/wealth";
import { formatCurrency, formatPercent } from "@/components/dashboard/format";

type Props = {
  currency: string;
  assetSlices: WealthBreakdownSlice[];
  liabilitySlices: WealthBreakdownSlice[];
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
};

const chartColors = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export function WealthCharts({
  currency,
  assetSlices,
  liabilitySlices,
  netWorth,
  totalAssets,
  totalLiabilities,
}: Props) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ChartCard title="Asset allocation">
        <DonutChart
          currency={currency}
          centerLabel="Total assets"
          centerValue={totalAssets}
          slices={assetSlices}
        />
        <SliceLegend currency={currency} slices={assetSlices} />
      </ChartCard>

      <ChartCard title="Debt breakdown">
        <DonutChart
          currency={currency}
          centerLabel="Total debt"
          centerValue={totalLiabilities}
          slices={liabilitySlices}
        />
        <SliceLegend currency={currency} slices={liabilitySlices} />
      </ChartCard>

      <ChartCard title="Net worth composition" className="lg:col-span-2">
        <NetWorthBar
          currency={currency}
          netWorth={netWorth}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
        />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border app-surface p-4 shadow-sm ${className}`}
    >
      <h2 className="text-sm font-semibold app-heading">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DonutChart({
  currency,
  centerLabel,
  centerValue,
  slices,
}: {
  currency: string;
  centerLabel: string;
  centerValue: number;
  slices: WealthBreakdownSlice[];
}) {
  const size = 200;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed app-subtle text-xs app-muted">
        No data yet
      </div>
    );
  }

  const segments = slices.reduce<
    Array<{ slice: WealthBreakdownSlice; index: number; offset: number; dash: number }>
  >((accumulated, slice, index) => {
    const dash = (slice.value / total) * circumference;
    const offset =
      accumulated.length > 0
        ? accumulated[accumulated.length - 1].offset + accumulated[accumulated.length - 1].dash
        : 0;

    accumulated.push({ slice, index, offset, dash });
    return accumulated;
  }, []);

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map(({ slice, index, offset, dash }) => (
            <circle
              key={slice.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={chartColors[index % chartColors.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          className="fill-[var(--app-muted)] text-[10px]"
        >
          {centerLabel}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          className="fill-[var(--app-heading)] text-[13px] font-semibold"
        >
          {formatCurrency(centerValue, true, currency)}
        </text>
      </svg>
    </div>
  );
}

function SliceLegend({
  currency,
  slices,
}: {
  currency: string;
  slices: WealthBreakdownSlice[];
}) {
  if (slices.length === 0) {
    return null;
  }

  return (
    <ul className="mt-3 space-y-1.5">
      {slices.map((slice, index) => (
        <li
          key={slice.key}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <span className="flex min-w-0 items-center gap-2 app-muted">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: chartColors[index % chartColors.length] }}
            />
            <span className="truncate">{slice.label}</span>
          </span>
          <span className="shrink-0 font-medium app-heading">
            {formatCurrency(slice.value, false, currency)}{" "}
            <span className="app-muted">({formatPercent(slice.percent, 0)})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function NetWorthBar({
  currency,
  netWorth,
  totalAssets,
  totalLiabilities,
}: {
  currency: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}) {
  const max = Math.max(totalAssets, totalLiabilities, 1);
  const assetWidth = (totalAssets / max) * 100;
  const liabilityWidth = (totalLiabilities / max) * 100;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="app-muted">Assets</span>
          <span className="font-medium app-heading">
            {formatCurrency(totalAssets, false, currency)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full app-subtle">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${assetWidth}%` }}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="app-muted">Liabilities</span>
          <span className="font-medium app-heading">
            {formatCurrency(totalLiabilities, false, currency)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full app-subtle">
          <div
            className="h-full rounded-full bg-rose-500"
            style={{ width: `${liabilityWidth}%` }}
          />
        </div>
      </div>

      <div className="rounded-lg border app-subtle px-3 py-2 text-center">
        <p className="text-[11px] uppercase tracking-wide app-muted">Net worth</p>
        <p
          className={`text-xl font-semibold ${
            netWorth >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatCurrency(netWorth, false, currency)}
        </p>
      </div>
    </div>
  );
}
