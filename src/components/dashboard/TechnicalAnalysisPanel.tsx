import type { OhlcDaily } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber, formatPercent } from "./format";

type Props = {
  ohlc: OhlcDaily[];
};

type SignalTone = "bullish" | "bearish" | "neutral";

type SignalItem = {
  label: string;
  value: string;
  verdict: string;
  tone: SignalTone;
};

type Candle = {
  close: number;
  date: string;
  high: number;
  low: number;
  open: number;
  volume: number | null;
};

export function TechnicalAnalysisPanel({ ohlc }: Props) {
  const freshness = latestFreshness(ohlc);
  const candles = toCandles(ohlc);

  if (candles.length < 30) {
    return (
      <section className="rounded-lg border app-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold app-heading">Technical Analysis</h2>
            <p className="mt-1 text-xs leading-5 app-muted">
              More daily OHLC history is needed to calculate moving averages, RSI, MACD, and trend signals.
            </p>
            <div className="mt-2">
              <DataFreshness fetchedAt={freshness?.fetchedAt} source={freshness?.source} />
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border app-subtle p-3 text-xs app-muted">
          Refresh market data or load a ticker with at least 30 cached trading days.
        </div>
      </section>
    );
  }

  const analysis = buildTechnicalAnalysis(candles);

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Technical Analysis</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            Trend, momentum, moving average, volatility, and volume read from cached daily candles.
          </p>
          <div className="mt-2">
            <DataFreshness fetchedAt={freshness?.fetchedAt} source={freshness?.source} />
          </div>
        </div>
        <div className="rounded-lg border app-subtle px-3 py-2.5 lg:min-w-[320px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
                Summary
              </div>
              <div className={`mt-1 text-base font-semibold ${getToneClass(analysis.tone)}`}>
                {analysis.summary}
              </div>
              <div className="mt-1 text-xs app-muted">{analysis.verdict}</div>
            </div>
            <SignalMeter score={analysis.score} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {analysis.signals.map((signal) => (
          <SignalCard key={signal.label} signal={signal} />
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border app-subtle p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
                Moving averages
              </div>
              <div className="mt-1 text-xs app-muted">
                Price compared with common short, medium, and long trend averages.
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
                Last close
              </div>
              <div className="text-sm font-semibold app-heading">
                {formatCurrency(analysis.latestClose)}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {analysis.movingAverages.map((ma) => (
              <MovingAverageRow key={ma.label} ma={ma} />
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <RsiGauge value={analysis.rsi} />
          <MacdBars values={analysis.macd.histogram.slice(-18)} tone={analysis.macdTone} />
        </div>
      </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: SignalItem }) {
  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
        {signal.label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${getToneClass(signal.tone)}`}>
        {signal.value}
      </div>
      <div className="mt-1 text-xs leading-5 app-muted">{signal.verdict}</div>
    </div>
  );
}

function MovingAverageRow({
  ma,
}: {
  ma: { distance: number | null; label: string; tone: SignalTone; value: number | null };
}) {
  const width = ma.distance === null ? 0 : Math.min(Math.abs(ma.distance) * 5, 100);

  return (
    <div className="grid gap-2 sm:grid-cols-[90px_1fr_90px] sm:items-center">
      <div className="text-xs font-semibold app-heading">{ma.label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
        <div
          className={`h-full rounded-full ${
            ma.tone === "bullish"
              ? "bg-[var(--app-positive)]"
              : ma.tone === "bearish"
                ? "bg-[var(--app-negative)]"
                : "bg-[var(--app-text-soft)]"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="text-right text-xs app-muted">
        {formatCurrency(ma.value)}
        <span className={`ml-1 ${getToneClass(ma.tone)}`}>
          {ma.distance === null ? "" : formatSignedPercent(ma.distance)}
        </span>
      </div>
    </div>
  );
}

function SignalMeter({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(100, ((score + 6) / 12) * 100));

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border app-surface">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold app-heading"
        style={{
          background: `conic-gradient(var(--app-accent) ${normalized}%, var(--app-border-soft) 0)`,
        }}
      >
        {Math.round(normalized)}
      </div>
    </div>
  );
}

function RsiGauge({ value }: { value: number | null }) {
  const left = value === null ? 50 : Math.max(0, Math.min(100, value));
  const tone = value === null ? "neutral" : value >= 70 ? "bearish" : value <= 30 ? "bullish" : "neutral";

  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">RSI 14</div>
          <div className={`mt-1 text-sm font-semibold ${getToneClass(tone)}`}>
            {value === null ? "-" : formatNumber(value, 1)}
          </div>
        </div>
        <div className="text-right text-xs app-muted">
          {value === null
            ? "Need more data"
            : value >= 70
              ? "Overbought"
              : value <= 30
                ? "Oversold"
                : "Neutral range"}
        </div>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-[linear-gradient(90deg,var(--app-positive),var(--app-border),var(--app-negative))]">
        <div
          className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-[var(--app-text)]"
          style={{ left: `${left}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] app-muted">
        <span>30</span>
        <span>50</span>
        <span>70</span>
      </div>
    </div>
  );
}

function MacdBars({ values, tone }: { tone: SignalTone; values: number[] }) {
  const max = Math.max(...values.map((value) => Math.abs(value)), 1);

  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">MACD</div>
          <div className={`mt-1 text-sm font-semibold ${getToneClass(tone)}`}>
            {tone === "bullish" ? "Positive momentum" : tone === "bearish" ? "Negative momentum" : "Flat"}
          </div>
        </div>
      </div>
      <div className="mt-3 flex h-16 items-center gap-1">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex h-full flex-1 items-center">
            <div
              className={`w-full rounded-sm ${value >= 0 ? "bg-[var(--app-positive)]" : "bg-[var(--app-negative)]"}`}
              style={{
                height: `${Math.max(8, (Math.abs(value) / max) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function buildTechnicalAnalysis(candles: Candle[]) {
  const closes = candles.map((candle) => candle.close);
  const latest = candles.at(-1)!;
  const latestClose = latest.close;
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const ema20 = latestEma(closes, 20);
  const rsi = latestRsi(closes, 14);
  const macd = calculateMacd(closes);
  const bollinger = calculateBollinger(closes, 20);
  const volumeSignal = calculateVolumeSignal(candles);
  const movingAverages = [
    toMovingAverage("SMA 20", sma20, latestClose),
    toMovingAverage("EMA 20", ema20, latestClose),
    toMovingAverage("SMA 50", sma50, latestClose),
    toMovingAverage("SMA 200", sma200, latestClose),
  ];
  const macdLast = macd.histogram.at(-1) ?? null;
  const macdPrev = macd.histogram.at(-2) ?? null;
  const macdTone: SignalTone =
    macdLast === null ? "neutral" : macdLast > 0 ? "bullish" : macdLast < 0 ? "bearish" : "neutral";
  let score = 0;

  movingAverages.forEach((ma) => {
    if (ma.tone === "bullish") score += ma.label === "SMA 200" ? 2 : 1;
    if (ma.tone === "bearish") score -= ma.label === "SMA 200" ? 2 : 1;
  });
  if (rsi !== null && rsi > 70) score -= 1;
  if (rsi !== null && rsi < 30) score += 1;
  if (macdTone === "bullish") score += 1;
  if (macdTone === "bearish") score -= 1;
  if (volumeSignal.tone === "bullish") score += 1;
  if (volumeSignal.tone === "bearish") score -= 1;

  const tone: SignalTone = score >= 3 ? "bullish" : score <= -3 ? "bearish" : "neutral";
  const summary =
    tone === "bullish" ? "Bullish bias" : tone === "bearish" ? "Bearish bias" : "Mixed / neutral";
  const verdict =
    tone === "bullish"
      ? "Trend and momentum lean positive, but confirm with volume and support levels."
      : tone === "bearish"
        ? "Trend or momentum is weak; wait for a reclaim of key averages or stronger volume."
        : "Signals are mixed. This is better treated as a watchlist setup than a clear entry.";
  const rsiTone: SignalTone =
    rsi === null ? "neutral" : rsi >= 70 ? "bearish" : rsi <= 30 ? "bullish" : "neutral";
  const bollingerTone = getBollingerTone(latestClose, bollinger.lower, bollinger.upper);
  const signals: SignalItem[] = [
    {
      label: "Trend",
      value: getTrendValue(movingAverages),
      verdict: getTrendVerdict(movingAverages),
      tone: getTrendTone(movingAverages),
    },
    {
      label: "Momentum",
      value: rsi === null ? "RSI unavailable" : `RSI ${formatNumber(rsi, 1)}`,
      verdict:
        rsi === null
          ? "Need more closing prices."
          : rsi >= 70
            ? "Potentially overbought; pullback risk is higher."
            : rsi <= 30
              ? "Potentially oversold; bounce risk is higher."
              : "Momentum is in a normal range.",
      tone: rsiTone,
    },
    {
      label: "MACD",
      value: macdLast === null ? "Unavailable" : formatNumber(macdLast, 3),
      verdict:
        macdLast !== null && macdPrev !== null && macdLast > macdPrev
          ? "Momentum is improving."
          : macdLast !== null && macdPrev !== null && macdLast < macdPrev
            ? "Momentum is fading."
            : "Momentum is flat or unavailable.",
      tone: macdTone,
    },
    {
      label: "Volatility / volume",
      value: bollinger.label,
      verdict: `${bollinger.verdict} ${volumeSignal.verdict}`,
      tone: bollingerTone === "neutral" ? volumeSignal.tone : bollingerTone,
    },
  ];

  return {
    latestClose,
    macd,
    macdTone,
    movingAverages,
    rsi,
    score,
    signals,
    summary,
    tone,
    verdict,
  };
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
    }));
}

function toMovingAverage(label: string, value: number | null, close: number) {
  const distance = value === null || value === 0 ? null : ((close - value) / value) * 100;
  const tone: SignalTone =
    distance === null ? "neutral" : distance > 0 ? "bullish" : distance < 0 ? "bearish" : "neutral";

  return { distance, label, tone, value };
}

function sma(values: number[], period: number) {
  if (values.length < period) return null;

  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function latestEma(values: number[], period: number) {
  const series = emaSeries(values, period);
  return series.at(-1) ?? null;
}

function emaSeries(values: number[], period: number) {
  if (values.length < period) return [];

  const multiplier = 2 / (period + 1);
  const series: number[] = [];
  let previous = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  series.push(previous);

  values.slice(period).forEach((value) => {
    previous = (value - previous) * multiplier + previous;
    series.push(previous);
  });

  return series;
}

function latestRsi(values: number[], period: number) {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let index = values.length - period; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  if (averageLoss === 0) return 100;

  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

function calculateMacd(values: number[]) {
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  const offset = ema12.length - ema26.length;
  const macdLine = ema26.map((value, index) => ema12[index + offset] - value);
  const signalLine = emaSeries(macdLine, 9);
  const histogramOffset = macdLine.length - signalLine.length;
  const histogram = signalLine.map((value, index) => macdLine[index + histogramOffset] - value);

  return { histogram, line: macdLine, signal: signalLine };
}

function calculateBollinger(values: number[], period: number) {
  if (values.length < period) {
    return {
      label: "Bollinger unavailable",
      lower: null,
      upper: null,
      verdict: "Need more history for volatility bands.",
    };
  }

  const slice = values.slice(-period);
  const average = slice.reduce((sum, value) => sum + value, 0) / period;
  const variance =
    slice.reduce((sum, value) => sum + (value - average) ** 2, 0) / period;
  const deviation = Math.sqrt(variance);
  const lower = average - deviation * 2;
  const upper = average + deviation * 2;
  const close = values.at(-1)!;

  if (close > upper) {
    return {
      label: "Above upper band",
      lower,
      upper,
      verdict: "Price is stretched above its volatility band.",
    };
  }

  if (close < lower) {
    return {
      label: "Below lower band",
      lower,
      upper,
      verdict: "Price is stretched below its volatility band.",
    };
  }

  return {
    label: "Inside bands",
    lower,
    upper,
    verdict: "Price is trading inside normal volatility bands.",
  };
}

function calculateVolumeSignal(candles: Candle[]) {
  const recent = candles.slice(-20).map((candle) => candle.volume).filter(isNumber);
  const latestVolume = candles.at(-1)?.volume;

  if (recent.length < 10 || latestVolume === null || latestVolume === undefined) {
    return { tone: "neutral" as SignalTone, verdict: "Volume confirmation is unavailable." };
  }

  const average = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  const latestClose = candles.at(-1)!.close;
  const previousClose = candles.at(-2)?.close ?? latestClose;
  const rising = latestClose >= previousClose;

  if (latestVolume > average * 1.5 && rising) {
    return { tone: "bullish" as SignalTone, verdict: "Volume is above average on an up move." };
  }

  if (latestVolume > average * 1.5 && !rising) {
    return { tone: "bearish" as SignalTone, verdict: "Volume is above average on a down move." };
  }

  return { tone: "neutral" as SignalTone, verdict: "Volume is near normal." };
}

function getTrendTone(movingAverages: Array<{ tone: SignalTone }>): SignalTone {
  const bullish = movingAverages.filter((ma) => ma.tone === "bullish").length;
  const bearish = movingAverages.filter((ma) => ma.tone === "bearish").length;

  if (bullish > bearish) return "bullish";
  if (bearish > bullish) return "bearish";
  return "neutral";
}

function getTrendValue(movingAverages: Array<{ tone: SignalTone }>) {
  const bullish = movingAverages.filter((ma) => ma.tone === "bullish").length;
  const bearish = movingAverages.filter((ma) => ma.tone === "bearish").length;

  return `${bullish} bullish / ${bearish} bearish`;
}

function getTrendVerdict(movingAverages: Array<{ label: string; tone: SignalTone }>) {
  const aboveLongTerm = movingAverages.find((ma) => ma.label === "SMA 200")?.tone;

  if (aboveLongTerm === "bullish") {
    return "Price is above the long-term average.";
  }

  if (aboveLongTerm === "bearish") {
    return "Price is below the long-term average.";
  }

  return "Long-term trend needs more data.";
}

function getBollingerTone(
  close: number,
  lower: number | null,
  upper: number | null
): SignalTone {
  if (upper !== null && close > upper) return "bearish";
  if (lower !== null && close < lower) return "bullish";

  return "neutral";
}

function getToneClass(tone: SignalTone) {
  if (tone === "bullish") return "app-positive";
  if (tone === "bearish") return "app-negative";

  return "app-heading";
}

function formatSignedPercent(value: number) {
  const formatted = formatPercent(value, 1);

  return value > 0 ? `+${formatted}` : formatted;
}

function isNumber(value: number | null): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}
