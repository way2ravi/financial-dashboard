import type { OhlcDaily } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatPercent } from "./format";

type Props = {
  ohlc: OhlcDaily[];
};

type Level = {
  label: string;
  value: number | null;
  tone?: "neutral" | "support" | "resistance";
};

export function SupportResistancePanel({ ohlc }: Props) {
  const levels = calculateSupportResistance(ohlc);
  const freshness = latestFreshness(ohlc);

  if (!levels) {
    return (
      <section className="rounded-lg border app-surface p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold app-heading">Support / Resistance</h2>
            <p className="mt-1 text-sm app-muted">
              Daily OHLC history is needed to calculate technical levels.
            </p>
            <div className="mt-3">
              <DataFreshness fetchedAt={freshness?.fetchedAt} source={freshness?.source} />
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border app-subtle p-4 text-sm app-muted">
          Refresh market data to populate support, resistance, and pivot levels.
        </div>
      </section>
    );
  }

  const primaryLevels: Level[] = [
    { label: "Nearest support", value: levels.nearestSupport, tone: "support" },
    { label: "Pivot", value: levels.pivot },
    { label: "Nearest resistance", value: levels.nearestResistance, tone: "resistance" },
  ];
  const pivotLevels: Level[] = [
    { label: "S2", value: levels.s2, tone: "support" },
    { label: "S1", value: levels.s1, tone: "support" },
    { label: "R1", value: levels.r1, tone: "resistance" },
    { label: "R2", value: levels.r2, tone: "resistance" },
  ];

  return (
    <section className="rounded-lg border app-surface p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold app-heading">Support / Resistance</h2>
          <p className="mt-1 text-sm app-muted">
            Based on the latest candle and last {levels.lookbackDays} cached trading days.
          </p>
          <div className="mt-3">
            <DataFreshness fetchedAt={freshness?.fetchedAt} source={freshness?.source} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium app-muted">Last close</div>
          <div className="text-lg font-semibold app-heading">
            {formatCurrency(levels.latestClose)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
    <div className="rounded-lg border app-subtle px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-normal app-muted">{label}</div>
      <div className={`${compact ? "text-lg" : "text-2xl"} mt-1 font-semibold ${toneClass}`}>
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
  };
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
