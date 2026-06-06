import type { OhlcDaily } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatPercent } from "./format";

type Props = {
  ohlc: OhlcDaily[];
  showDataSource?: boolean;
};

type Level = {
  label: string;
  value: number | null;
  tone?: "neutral" | "support" | "resistance";
};

type RangeContext = {
  high: number;
  label: string;
  low: number;
  positionPercent: number;
};

export function SupportResistancePanel({ ohlc, showDataSource = false }: Props) {
  const levels = calculateSupportResistance(ohlc);
  const freshness = latestFreshness(ohlc);

  if (!levels) {
    return (
      <section className="rounded-lg border app-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold app-heading">Support / Resistance</h2>
            <p className="mt-1 text-xs leading-5 app-muted">
              Daily OHLC history is needed to calculate technical levels.
            </p>
            <div className="mt-2">
              <DataFreshness
                fetchedAt={freshness?.fetchedAt}
                showSource={showDataSource}
                source={freshness?.source}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border app-subtle p-3 text-xs app-muted">
          Refresh market data to populate support, resistance, and pivot levels.
        </div>
      </section>
    );
  }

  const primaryLevels: Level[] = [
    { label: "Nearest actionable support", value: levels.nearestSupport, tone: "support" },
    { label: "Pivot", value: levels.pivot },
    { label: "Nearest actionable resistance", value: levels.nearestResistance, tone: "resistance" },
  ];
  const pivotLevels: Level[] = [
    { label: "S2", value: levels.s2, tone: "support" },
    { label: "S1", value: levels.s1, tone: "support" },
    { label: "R1", value: levels.r1, tone: "resistance" },
    { label: "R2", value: levels.r2, tone: "resistance" },
  ];

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Support / Resistance</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            Shows nearby actionable levels from the last {levels.lookbackDays} cached trading days.
            These can differ from interval lows/highs because range levels are period extremes.
          </p>
          <div className="mt-2">
            <DataFreshness
              fetchedAt={freshness?.fetchedAt}
              showSource={showDataSource}
              source={freshness?.source}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium app-muted">Last close</div>
          <div className="text-base font-semibold app-heading">
            {formatCurrency(levels.latestClose)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {primaryLevels.map((level) => (
          <LevelCard
            key={level.label}
            label={level.label}
            value={level.value}
            tone={level.tone}
            distance={getDistance(level.value, levels.latestClose)}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {pivotLevels.map((level) => (
          <LevelCard
            key={level.label}
            label={level.label}
            value={level.value}
            tone={level.tone}
            compact
          />
        ))}
      </div>

      <div className="mt-3 rounded-lg border app-subtle p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
              Range context
            </div>
            <p className="mt-1 text-xs leading-5 app-muted">
              Interval lows/highs show the full trading boundary for each period. Support and
              resistance above are the nearest levels around the latest close.
            </p>
          </div>
          <div className="text-xs app-muted">
            Close: <span className="font-semibold app-heading">{formatCurrency(levels.latestClose)}</span>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {levels.rangeContext.map((range) => (
            <div key={range.label} className="rounded-lg border app-surface px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-normal app-heading">
                  {range.label}
                </div>
                <div className="text-[11px] app-muted">
                  {formatPercent(range.positionPercent, 0)} of range
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="app-positive">{formatCurrency(range.low)}</span>
                <span className="app-negative">{formatCurrency(range.high)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--app-primary)]"
                  style={{ width: `${Math.max(4, Math.min(100, range.positionPercent))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LevelCard({
  label,
  value,
  tone = "neutral",
  distance,
  compact = false,
}: {
  label: string;
  value: number | null;
  tone?: Level["tone"];
  distance?: number | null;
  compact?: boolean;
}) {
  const toneClass =
    tone === "support"
      ? "app-positive"
      : tone === "resistance"
        ? "text-[var(--app-accent)]"
        : "app-heading";

  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-normal app-muted">{label}</div>
      <div className={`${compact ? "text-base" : "text-xl"} mt-1 font-semibold ${toneClass}`}>
        {formatCurrency(value)}
      </div>
      {distance !== undefined ? (
        <div className="mt-1 text-xs app-muted">
          {distance === null ? "-" : `${formatSignedPercent(distance)} from close`}
        </div>
      ) : null}
    </div>
  );
}

function calculateSupportResistance(ohlc: OhlcDaily[]) {
  const candles = ohlc.filter(
    (candle) =>
      candle.high !== null &&
      candle.low !== null &&
      candle.close !== null &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
  );

  if (candles.length < 5) {
    return null;
  }

  const latest = candles.at(-1)!;
  const latestHigh = latest.high!;
  const latestLow = latest.low!;
  const latestClose = latest.close!;
  const pivot = (latestHigh + latestLow + latestClose) / 3;
  const range = latestHigh - latestLow;
  const lookback = candles.slice(-60);
  const rangeContext = buildRangeContext(candles, latestClose);
  const supports = lookback
    .map((candle) => candle.low!)
    .filter((low) => low <= latestClose)
    .sort((a, b) => b - a);
  const resistances = lookback
    .map((candle) => candle.high!)
    .filter((high) => high >= latestClose)
    .sort((a, b) => a - b);

  return {
    latestClose,
    lookbackDays: lookback.length,
    nearestSupport: supports[0] ?? Math.min(...lookback.map((candle) => candle.low!)),
    nearestResistance:
      resistances[0] ?? Math.max(...lookback.map((candle) => candle.high!)),
    pivot,
    s1: 2 * pivot - latestHigh,
    s2: pivot - range,
    r1: 2 * pivot - latestLow,
    r2: pivot + range,
    rangeContext,
  };
}

function buildRangeContext(candles: OhlcDaily[], latestClose: number): RangeContext[] {
  const intervals = [
    { label: "5D", days: 5 },
    { label: "1M", days: 21 },
    { label: "3M", days: 63 },
    { label: "6M", days: 126 },
  ];

  return intervals
    .map((interval) => {
      const slice = candles.slice(-Math.min(interval.days, candles.length));
      const low = Math.min(...slice.map((candle) => candle.low!));
      const high = Math.max(...slice.map((candle) => candle.high!));
      const range = Math.max(high - low, 0.01);
      const positionPercent = ((latestClose - low) / range) * 100;

      return {
        high,
        label: interval.label,
        low,
        positionPercent: Math.max(0, Math.min(100, positionPercent)),
      };
    })
    .filter((range) => Number.isFinite(range.low) && Number.isFinite(range.high));
}

function getDistance(level: number | null, close: number) {
  if (level === null || close === 0) {
    return null;
  }

  return ((level - close) / close) * 100;
}

function formatSignedPercent(value: number) {
  const formatted = formatPercent(value);

  return value > 0 ? `+${formatted}` : formatted;
}
