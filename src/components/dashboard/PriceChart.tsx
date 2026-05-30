import Link from "next/link";
import type { OhlcDaily } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatPercent } from "./format";

type Props = {
  chartType: ChartType;
  interval: ChartInterval;
  ohlc: OhlcDaily[];
  range: ChartRange;
  showDataSource?: boolean;
  symbol: string;
};

export type ChartType = "area" | "line" | "candles" | "ohlc";
export type ChartRange = "1m" | "3m" | "6m" | "1y" | "all";
export type ChartInterval = "daily" | "weekly" | "monthly";

type Candle = {
  close: number;
  date: string;
  high: number;
  low: number;
  open: number;
  volume: number | null;
};

const chartTypes: Array<{ id: ChartType; label: string }> = [
  { id: "area", label: "Area" },
  { id: "line", label: "Line" },
  { id: "candles", label: "Candles" },
  { id: "ohlc", label: "OHLC" },
];

const ranges: Array<{ id: ChartRange; label: string }> = [
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
];

const intervals: Array<{ id: ChartInterval; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export function PriceChart({
  chartType,
  interval,
  ohlc,
  range,
  showDataSource = false,
  symbol,
}: Props) {
  const freshness = latestFreshness(ohlc);
  const baseCandles = toCandles(ohlc);
  const candles = aggregateCandles(filterByRange(baseCandles, range), interval);
  const latest = candles.at(-1) ?? null;
  const previous = candles.at(-2) ?? null;
  const change = latest && previous ? latest.close - previous.close : null;
  const changePercent = latest && previous ? (change! / previous.close) * 100 : null;

  if (baseCandles.length < 2) {
    return (
      <section className="rounded-lg border app-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold app-heading">Stock Chart</h2>
            <p className="mt-1 text-xs app-muted">Daily OHLC cache is not populated yet.</p>
            <div className="mt-2">
              <DataFreshness
                fetchedAt={freshness?.fetchedAt}
                showSource={showDataSource}
                source={freshness?.source}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium app-muted">Close</div>
            <div className="text-base font-semibold app-heading">-</div>
          </div>
        </div>
        <div className="mt-3 flex h-[300px] items-center justify-center rounded-lg border app-subtle px-4 text-center text-xs app-muted">
          Refresh market data to draw the price chart.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Stock Chart</h2>
          <p className="mt-1 text-xs app-muted">
            {candles[0]?.date} to {latest?.date} · {intervalLabel(interval)} from cached OHLC
          </p>
          <div className="mt-2">
            <DataFreshness
              fetchedAt={freshness?.fetchedAt}
              showSource={showDataSource}
              source={freshness?.source}
            />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
          <ChartStat label="Close" value={formatCurrency(latest?.close)} />
          <ChartStat
            label="Change"
            tone={(change ?? 0) >= 0 ? "positive" : "negative"}
            value={formatSignedCurrency(change)}
          />
          <ChartStat
            label="Change %"
            tone={(changePercent ?? 0) >= 0 ? "positive" : "negative"}
            value={formatSignedPercent(changePercent)}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-center">
        <SegmentedControl
          label="Chart type"
          options={chartTypes}
          value={chartType}
          getHref={(next) => chartHref(symbol, next, range, interval)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <SegmentedControl
            label="Range"
            options={ranges}
            value={range}
            getHref={(next) => chartHref(symbol, chartType, next, interval)}
          />
          <SegmentedControl
            label="Interval"
            options={intervals}
            value={interval}
            getHref={(next) => chartHref(symbol, chartType, range, next)}
          />
        </div>
      </div>

      <div className="mt-3 rounded-lg border app-subtle p-3">
        <ChartCanvas candles={candles} type={chartType} />
      </div>

      <VolumeAnalytics candles={candles} />
    </section>
  );
}

function VolumeAnalytics({ candles }: { candles: Candle[] }) {
  const recent = candles.slice(-20);
  const latest = candles.at(-1) ?? null;
  const latestVolume = latest?.volume ?? null;
  const average20 = averageVolume(recent);
  const volumeRatio =
    latestVolume !== null && average20 !== null && average20 > 0
      ? latestVolume / average20
      : null;
  const volumeTone =
    volumeRatio === null
      ? "neutral"
      : volumeRatio >= 1.5
        ? latest && latest.close >= latest.open
          ? "positive"
          : "negative"
        : "neutral";
  const latestPressure = latest ? getVolumePressure(latest, volumeRatio) : null;

  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_380px]">
      <section className="rounded-lg border app-subtle p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold app-heading">Volume Analysis</h3>
            <p className="mt-1 text-xs app-muted">
              Latest volume, 20-candle average, and buy/sell pressure for the selected interval.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[300px]">
            <VolumeStat label="Latest" value={formatNumberCompact(latestVolume)} />
            <VolumeStat label="20 avg" value={formatNumberCompact(average20)} />
            <VolumeStat
              label="Activity"
              tone={volumeTone}
              value={volumeRatio === null ? "-" : `${formatNumberPlain(volumeRatio, 2)}x`}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
          <VolumePressureCircle pressure={latestPressure} />
          <div className="rounded-lg border app-surface p-3">
            <div className={`text-sm font-semibold ${getVolumeToneClass(volumeTone)}`}>
              {getVolumeVerdict(volumeRatio, latest)}
            </div>
            <p className="mt-1 text-xs leading-5 app-muted">
              Buy/sell pressure is estimated from candle direction and relative volume. It is a practical read, not actual order-flow data.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <VolumeStat
                label="Indicator"
                tone={latestPressure?.tone ?? "neutral"}
                value={latestPressure?.label ?? "-"}
              />
              <VolumeStat
                label="Candle move"
                tone={latestPressure?.tone ?? "neutral"}
                value={formatSignedPercent(latestPressure?.movePercent ?? null)}
              />
              <VolumeStat
                label="Buy / Sell"
                tone={latestPressure?.tone ?? "neutral"}
                value={
                  latestPressure
                    ? `${formatNumberCompact(latestPressure.buyVolume)} / ${formatNumberCompact(latestPressure.sellVolume)}`
                    : "-"
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border app-subtle">
        <div className="border-b app-border-soft px-3 py-2">
          <h3 className="text-sm font-semibold app-heading">Recent Volume</h3>
        </div>
        <div className="max-h-[330px] overflow-y-auto">
          <table className="w-full border-separate border-spacing-0 text-left text-xs">
            <thead className="app-subtle">
              <tr className="uppercase tracking-normal app-muted">
                <th className="border-b app-border-soft px-3 py-2 font-semibold">Date</th>
                <th className="border-b app-border-soft px-3 py-2 font-semibold">Indicator</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Buy vol</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Sell vol</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Move</th>
              </tr>
            </thead>
            <tbody>
              {recent
                .slice()
                .reverse()
                .map((candle) => {
                  const move =
                    candle.open === 0 ? null : ((candle.close - candle.open) / candle.open) * 100;
                  const pressure = getVolumePressure(candle, average20 && candle.volume ? candle.volume / average20 : null);

                  return (
                    <tr key={candle.date} className="app-muted hover:bg-[var(--app-surface-muted)]">
                      <td className="border-b app-border-soft px-3 py-2.5 font-medium app-heading">
                        {candle.date}
                      </td>
                      <td className="border-b app-border-soft px-3 py-2.5">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${getPressurePillClass(pressure.tone)}`}>
                          {pressure.label}
                        </span>
                      </td>
                      <td className="border-b app-border-soft px-3 py-2.5 text-right app-positive">
                        {formatNumberCompact(pressure.buyVolume)}
                      </td>
                      <td className="border-b app-border-soft px-3 py-2.5 text-right app-negative">
                        {formatNumberCompact(pressure.sellVolume)}
                      </td>
                      <td className={`border-b app-border-soft px-3 py-2.5 text-right ${getMoveClass(move)}`}>
                        {formatSignedPercent(move)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ChartCanvas({ candles, type }: { candles: Candle[]; type: ChartType }) {
  const width = 920;
  const priceHeight = 330;
  const volumeHeight = 80;
  const gap = 18;
  const height = priceHeight + volumeHeight + gap;
  const padding = { bottom: 18, left: 44, right: 18, top: 18 };
  const prices = candles.flatMap((candle) => [candle.high, candle.low, candle.close]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 0.01);
  const maxVolume = Math.max(...candles.map((candle) => candle.volume ?? 0), 1);
  const usableWidth = width - padding.left - padding.right;
  const pointGap = usableWidth / Math.max(candles.length - 1, 1);
  const candleWidth = Math.max(3, Math.min(14, pointGap * 0.58));
  const linePoints = candles
    .map((candle, index) => `${xFor(index)},${yFor(candle.close)}`)
    .join(" ");
  const areaPoints = `${padding.left},${priceHeight - padding.bottom} ${linePoints} ${
    width - padding.right
  },${priceHeight - padding.bottom}`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const price = min + range * ratio;
    return { price, y: yFor(price) };
  });

  function xFor(index: number) {
    return padding.left + index * pointGap;
  }

  function yFor(price: number) {
    return priceHeight - padding.bottom - ((price - min) / range) * (priceHeight - padding.top - padding.bottom);
  }

  return (
    <div className="h-[430px] w-full overflow-hidden">
      <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${type} stock chart`}>
        <defs>
          <linearGradient id="chartAreaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--app-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--app-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <rect fill="transparent" height={height} width={width} />
        {yTicks.map((tick) => (
          <g key={tick.price}>
            <line
              stroke="var(--app-border-soft)"
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text
              className="fill-[var(--app-text-soft)] text-[10px]"
              textAnchor="end"
              x={padding.left - 8}
              y={tick.y + 4}
            >
              {formatCurrency(tick.price)}
            </text>
          </g>
        ))}

        {(type === "area" || type === "line") ? (
          <>
            {type === "area" ? <polygon fill="url(#chartAreaFill)" points={areaPoints} /> : null}
            <polyline
              fill="none"
              points={linePoints}
              stroke="var(--app-accent)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </>
        ) : null}

        {type === "candles"
          ? candles.map((candle, index) => (
              <CandleGlyph
                key={candle.date}
                candle={candle}
                width={candleWidth}
                x={xFor(index)}
                yFor={yFor}
              />
            ))
          : null}

        {type === "ohlc"
          ? candles.map((candle, index) => (
              <OhlcGlyph
                key={candle.date}
                candle={candle}
                width={candleWidth}
                x={xFor(index)}
                yFor={yFor}
              />
            ))
          : null}

        <line
          stroke="var(--app-border)"
          x1={padding.left}
          x2={width - padding.right}
          y1={priceHeight - padding.bottom}
          y2={priceHeight - padding.bottom}
        />

        {candles.map((candle, index) => {
          const volume = candle.volume ?? 0;
          const barHeight = (volume / maxVolume) * (volumeHeight - 14);
          const positive = candle.close >= candle.open;
          const x = xFor(index) - candleWidth / 2;
          const y = priceHeight + gap + volumeHeight - barHeight;

          return (
            <rect
              key={`${candle.date}-volume`}
              fill={positive ? "var(--app-positive)" : "var(--app-negative)"}
              height={Math.max(1, barHeight)}
              opacity="0.55"
              rx="1"
              width={Math.max(2, candleWidth)}
              x={x}
              y={y}
            />
          );
        })}

        <text className="fill-[var(--app-text-soft)] text-[10px]" x={padding.left} y={priceHeight + gap + 12}>
          Volume
        </text>
        <text className="fill-[var(--app-text-soft)] text-[10px]" textAnchor="end" x={width - padding.right} y={height - 2}>
          {candles[0]?.date} · {candles.at(-1)?.date}
        </text>
      </svg>
    </div>
  );
}

function CandleGlyph({
  candle,
  width,
  x,
  yFor,
}: {
  candle: Candle;
  width: number;
  x: number;
  yFor: (price: number) => number;
}) {
  const positive = candle.close >= candle.open;
  const top = yFor(Math.max(candle.open, candle.close));
  const bottom = yFor(Math.min(candle.open, candle.close));
  const bodyHeight = Math.max(2, bottom - top);

  return (
    <g>
      <line
        stroke={positive ? "var(--app-positive)" : "var(--app-negative)"}
        strokeWidth="1.5"
        x1={x}
        x2={x}
        y1={yFor(candle.high)}
        y2={yFor(candle.low)}
      />
      <rect
        fill={positive ? "var(--app-positive)" : "var(--app-negative)"}
        height={bodyHeight}
        opacity="0.85"
        rx="1"
        width={width}
        x={x - width / 2}
        y={top}
      />
    </g>
  );
}

function OhlcGlyph({
  candle,
  width,
  x,
  yFor,
}: {
  candle: Candle;
  width: number;
  x: number;
  yFor: (price: number) => number;
}) {
  const positive = candle.close >= candle.open;
  const color = positive ? "var(--app-positive)" : "var(--app-negative)";

  return (
    <g stroke={color} strokeLinecap="round" strokeWidth="1.7">
      <line x1={x} x2={x} y1={yFor(candle.high)} y2={yFor(candle.low)} />
      <line x1={x - width / 2} x2={x} y1={yFor(candle.open)} y2={yFor(candle.open)} />
      <line x1={x} x2={x + width / 2} y1={yFor(candle.close)} y2={yFor(candle.close)} />
    </g>
  );
}

function SegmentedControl<T extends string>({
  getHref,
  label,
  options,
  value,
}: {
  getHref: (value: T) => string;
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-normal app-muted">
        {label}
      </div>
      <div className="flex min-w-max rounded-lg border app-surface p-1">
        {options.map((option) => (
          <Link
            key={option.id}
            aria-current={value === option.id ? "page" : undefined}
            className={`h-8 rounded-md px-2.5 text-xs font-semibold transition ${
              value === option.id
                ? "app-primary-button"
                : "app-muted hover:bg-[var(--app-subtle)] hover:text-[var(--app-heading)]"
            }`}
            href={getHref(option.id)}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function chartHref(
  symbol: string,
  chartType: ChartType,
  range: ChartRange,
  interval: ChartInterval
) {
  const params = new URLSearchParams({
    symbol,
    tab: "chart",
  });

  if (chartType !== "area") params.set("chart", chartType);
  if (range !== "6m") params.set("range", range);
  if (interval !== "daily") params.set("interval", interval);

  return `/dashboard?${params.toString()}`;
}

function ChartStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "negative" | "neutral" | "positive";
}) {
  const toneClass =
    tone === "positive"
      ? "app-positive"
      : tone === "negative"
        ? "app-negative"
        : "app-heading";

  return (
    <div className="rounded-lg border app-subtle px-3 py-2">
      <div className="text-[11px] font-medium app-muted">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function VolumeStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "negative" | "neutral" | "positive";
}) {
  return (
    <div className="rounded-lg border app-surface px-2.5 py-2 text-right">
      <div className="text-[10px] font-medium app-muted">{label}</div>
      <div className={`mt-1 text-xs font-semibold ${getVolumeToneClass(tone)}`}>{value}</div>
    </div>
  );
}

function VolumePressureCircle({
  pressure,
}: {
  pressure: ReturnType<typeof getVolumePressure> | null;
}) {
  const buyPercent = pressure?.buyPercent ?? 50;
  const sellPercent = pressure?.sellPercent ?? 50;
  const buyEnd = buyPercent;
  const neutralEnd = buyPercent + Math.max(0, 100 - buyPercent - sellPercent);

  return (
    <div
      className={`grid place-items-center rounded-lg p-4 ${
        pressure?.tone === "negative"
          ? "bg-[color-mix(in_srgb,var(--app-negative)_8%,var(--app-surface))]"
          : pressure?.tone === "positive"
            ? "bg-[color-mix(in_srgb,var(--app-positive)_8%,var(--app-surface))]"
            : "app-surface"
      }`}
    >
      <div
        className="grid h-36 w-36 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#16a34a 0 ${buyEnd}%, #9ca3af ${buyEnd}% ${neutralEnd}%, #dc2626 ${neutralEnd}% 100%)`,
        }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full app-surface text-center">
          <div>
            <div className={`text-sm font-semibold ${getVolumeToneClass(pressure?.tone ?? "neutral")}`}>
              {pressure?.label ?? "-"}
            </div>
            <div className="mt-1 grid gap-0.5 text-[10px] leading-4">
              <span className="app-positive">
                Buy {formatNumberCompact(pressure?.buyVolume)} · {formatNumberPlain(pressure?.buyPercent, 0)}%
              </span>
              <span className="app-negative">
                Sell {formatNumberCompact(pressure?.sellVolume)} · {formatNumberPlain(pressure?.sellPercent, 0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-center text-[11px] font-medium uppercase tracking-normal app-muted">
        Day pressure
      </div>
    </div>
  );
}

function toCandles(ohlc: OhlcDaily[]): Candle[] {
  return ohlc
    .filter(
      (point) =>
        point.close !== null &&
        point.high !== null &&
        point.low !== null &&
        point.open !== null &&
        Number.isFinite(point.close) &&
        Number.isFinite(point.high) &&
        Number.isFinite(point.low) &&
        Number.isFinite(point.open)
    )
    .map((point) => ({
      close: point.close!,
      date: point.date,
      high: point.high!,
      low: point.low!,
      open: point.open!,
      volume: point.volume,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function filterByRange(candles: Candle[], range: ChartRange) {
  if (range === "all" || candles.length === 0) {
    return candles;
  }

  const latest = new Date(candles.at(-1)!.date);
  const start = new Date(latest);

  if (range === "1m") start.setMonth(start.getMonth() - 1);
  if (range === "3m") start.setMonth(start.getMonth() - 3);
  if (range === "6m") start.setMonth(start.getMonth() - 6);
  if (range === "1y") start.setFullYear(start.getFullYear() - 1);

  return candles.filter((candle) => new Date(candle.date) >= start);
}

function aggregateCandles(candles: Candle[], interval: ChartInterval) {
  if (interval === "daily") {
    return candles;
  }

  const groups = new Map<string, Candle[]>();

  candles.forEach((candle) => {
    const key = interval === "weekly" ? getWeekKey(candle.date) : candle.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), candle]);
  });

  return [...groups.values()].map((group) => {
    const first = group[0];
    const last = group.at(-1)!;

    return {
      close: last.close,
      date: last.date,
      high: Math.max(...group.map((candle) => candle.high)),
      low: Math.min(...group.map((candle) => candle.low)),
      open: first.open,
      volume: group.reduce((sum, candle) => sum + (candle.volume ?? 0), 0),
    };
  });
}

function getWeekKey(date: string) {
  const parsed = new Date(date);
  const firstDay = new Date(parsed.getFullYear(), 0, 1);
  const days = Math.floor((parsed.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((days + firstDay.getDay() + 1) / 7);

  return `${parsed.getFullYear()}-${week.toString().padStart(2, "0")}`;
}

function intervalLabel(interval: ChartInterval) {
  if (interval === "weekly") return "weekly candles";
  if (interval === "monthly") return "monthly candles";
  return "daily candles";
}

function averageVolume(candles: Candle[]) {
  const values = candles
    .map((candle) => candle.volume)
    .filter((value): value is number => value !== null && value !== undefined);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getVolumePressure(candle: Candle, volumeRatio: number | null) {
  const movePercent =
    candle.open === 0 ? null : ((candle.close - candle.open) / candle.open) * 100;
  const volume = candle.volume ?? 0;
  const closeLocation =
    candle.high === candle.low ? 0.5 : (candle.close - candle.low) / (candle.high - candle.low);
  const directionalTilt = candle.close > candle.open ? 0.08 : candle.close < candle.open ? -0.08 : 0;
  const buyPercent = Math.max(15, Math.min(85, (closeLocation + directionalTilt) * 100));
  const sellPercent = 100 - buyPercent;
  const buyVolume = volume * (buyPercent / 100);
  const sellVolume = volume - buyVolume;
  const isBuy = buyVolume > sellVolume;
  const isSell = sellVolume > buyVolume;
  const activityBoost =
    volumeRatio === null ? 0 : volumeRatio >= 1.5 ? 25 : volumeRatio >= 1.1 ? 12 : 0;
  const moveBoost =
    movePercent === null ? 0 : Math.min(25, Math.abs(movePercent) * 5);
  const strength = Math.round(Math.min(100, 45 + activityBoost + moveBoost));
  const imbalance = Math.abs(buyPercent - sellPercent);

  if (isBuy) {
    return {
      label:
        volumeRatio !== null && volumeRatio >= 1.5 && imbalance >= 15
          ? "Strong buy pressure"
          : "Buy pressure",
      buyPercent,
      buyVolume,
      movePercent,
      sellPercent,
      sellVolume,
      strength,
      tone: "positive" as const,
    };
  }

  if (isSell) {
    return {
      label:
        volumeRatio !== null && volumeRatio >= 1.5 && imbalance >= 15
          ? "Strong sell pressure"
          : "Sell pressure",
      buyPercent,
      buyVolume,
      movePercent,
      sellPercent,
      sellVolume,
      strength,
      tone: "negative" as const,
    };
  }

  return {
    label: "Neutral",
    buyPercent,
    buyVolume,
    movePercent,
    sellPercent,
    sellVolume,
    strength: Math.max(20, Math.round(strength * 0.5)),
    tone: "neutral" as const,
  };
}

function getVolumeVerdict(volumeRatio: number | null, latest: Candle | null) {
  if (volumeRatio === null || !latest) {
    return "Volume signal is unavailable.";
  }

  if (volumeRatio >= 1.5 && latest.close >= latest.open) {
    return "Unusual bullish volume.";
  }

  if (volumeRatio >= 1.5 && latest.close < latest.open) {
    return "Unusual bearish volume.";
  }

  if (volumeRatio >= 1.1) {
    return "Volume is slightly above normal.";
  }

  if (volumeRatio <= 0.7) {
    return "Volume is quieter than normal.";
  }

  return "Volume is near normal.";
}

function getVolumeToneClass(tone: "negative" | "neutral" | "positive") {
  if (tone === "positive") return "app-positive";
  if (tone === "negative") return "app-negative";
  return "app-heading";
}

function getMoveClass(value: number | null) {
  if (value === null) return "app-muted";
  return value >= 0 ? "app-positive" : "app-negative";
}

function getPressurePillClass(tone: "negative" | "neutral" | "positive") {
  if (tone === "positive") {
    return "bg-[color-mix(in_srgb,var(--app-positive)_12%,transparent)] app-positive";
  }

  if (tone === "negative") {
    return "bg-[color-mix(in_srgb,var(--app-negative)_12%,transparent)] app-negative";
  }

  return "app-subtle";
}

function formatNumberCompact(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function formatNumberPlain(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

function formatSignedCurrency(value: number | null) {
  if (value === null) {
    return "-";
  }

  const formatted = formatCurrency(value);

  return value > 0 ? `+${formatted}` : formatted;
}

function formatSignedPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  const formatted = formatPercent(value, 2);

  return value > 0 ? `+${formatted}` : formatted;
}
