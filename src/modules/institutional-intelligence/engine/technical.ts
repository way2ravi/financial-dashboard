import { SMA, RSI, MACD, OBV, ADL } from "technicalindicators";
import type { PriceBar } from "../types";

export function technicalEvidence(
  input: PriceBar[],
  benchmark: PriceBar[],
  now = Date.now(),
) {
  const bars = [...input].sort((a, b) => a.date.localeCompare(b.date));
  const valid = bars.every(
    (b) =>
      [b.open, b.high, b.low, b.close, b.volume].every(Number.isFinite) &&
      b.close > 0 &&
      b.high >= b.low &&
      b.volume >= 0,
  );
  if (
    !valid ||
    bars.length < 21 ||
    !bars.every((b) => b.adjusted) ||
    now < Date.parse(bars.at(-1)!.date) ||
    now - Date.parse(bars.at(-1)!.date) > 7 * 86400000
  )
    return null;
  const close = bars.map((b) => b.close),
    high = bars.map((b) => b.high),
    low = bars.map((b) => b.low),
    volume = bars.map((b) => b.volume);
  const last = bars.at(-1)!;
  const averageVolume = volume.slice(-21, -1).reduce((s, v) => s + v, 0) / 20;
  const flow = bars
    .slice(-20)
    .map((b) =>
      b.high === b.low
        ? 0
        : ((2 * b.close - b.high - b.low) / (b.high - b.low)) * b.volume,
    );
  const periodVolume = volume.slice(-20).reduce((s, v) => s + v, 0);
  const start = bars.at(-21)!;
  const benchStart = benchmark.find((b) => b.date === start.date && b.adjusted),
    benchEnd = benchmark.find((b) => b.date === last.date && b.adjusted);
  return {
    sma20: SMA.calculate({ period: 20, values: close }).at(-1) ?? null,
    sma50: SMA.calculate({ period: 50, values: close }).at(-1) ?? null,
    sma200: SMA.calculate({ period: 200, values: close }).at(-1) ?? null,
    rsi: RSI.calculate({ period: 14, values: close }).at(-1) ?? null,
    macd:
      MACD.calculate({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
        values: close,
      }).at(-1)?.histogram ?? null,
    relativeVolume: averageVolume > 0 ? last.volume / averageVolume : null,
    obv: OBV.calculate({ close, volume }).at(-1) ?? null,
    adl: ADL.calculate({ high, low, close, volume }).at(-1) ?? null,
    cmf:
      periodVolume > 0 ? flow.reduce((s, v) => s + v, 0) / periodVolume : null,
    relativeStrength:
      benchStart && benchEnd && benchStart.close > 0 && benchEnd.close > 0
        ? (last.close / start.close / (benchEnd.close / benchStart.close) - 1) *
          100
        : null,
    latestClose: last.close,
    averageVolume,
    date: last.date,
  };
}
