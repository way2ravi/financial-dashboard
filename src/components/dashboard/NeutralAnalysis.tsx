import type { DashboardData, OhlcDaily } from "@/lib/types";
import { calculateAtr, calculateBollinger, calculateLimitAnalysis, calculateMacd, calculateStopLoss, buildRangeLevels, latestEma, sma, toCandles } from "@/lib/technical/analysis";
import { wilderRsi } from "@/lib/technical/indicators";
import { formatCurrency, formatNumber, formatPercent } from "./format";

export function NeutralSummary({ data }: { data: DashboardData }) {
  return <section className="space-y-4 border-b app-border-soft py-4">
    <h2 className="text-sm font-semibold app-heading">Market Data Summary</h2>
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Fact label="Latest price" value={formatCurrency(data.quote?.price)} />
      <Fact label="Daily change" value={formatPercent(data.quote?.changePercent)} />
      <Fact label="Market capitalisation" value={formatCurrency(data.fundamentals?.marketCap, true)} />
      <Fact label="P/E" value={formatNumber(data.fundamentals?.pe)} />
    </dl>
    <p className="text-xs app-muted">Recorded market observations, without a trading recommendation.</p>
  </section>;
}

export function NeutralAnalyst({ data }: { data: DashboardData }) {
  const targets = data.analystPriceTargets;
  return <section className="space-y-4 py-4">
    <h2 className="text-sm font-semibold app-heading">Published Analyst Estimates</h2>
    <p className="text-xs app-muted">Third-party estimates, not recommended order prices. Estimates may differ from realised prices.</p>
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Fact label="Low estimate" value={formatCurrency(targets?.targetLow)} /><Fact label="Mean estimate" value={formatCurrency(targets?.targetMean)} /><Fact label="High estimate" value={formatCurrency(targets?.targetHigh)} /><Fact label="As of" value={targets?.asOfDate ?? "Unavailable"} /></dl>
  </section>;
}

export function NeutralTechnical({ ohlc }: { ohlc: OhlcDaily[] }) {
  const candles = toCandles(ohlc).sort((a, b) => a.date.localeCompare(b.date));
  if (candles.length < 30) return <p className="py-4 text-sm app-muted">At least 30 daily price observations are needed for technical comparisons.</p>;
  const closes = candles.map(c => c.close);
  const latest = candles.at(-1)!;
  const average = sma(closes, 20);
  const bands = calculateBollinger(closes, 20);
  const downside = calculateStopLoss(candles, latest.close, average);
  const upside = calculateLimitAnalysis(candles, latest.close, average, bands.upper);
  const ratio = Math.abs(downside.balanced.riskPercent) > 0 ? upside.balanced.gainPercent / Math.abs(downside.balanced.riskPercent) : null;
  const methodDescription: Record<string, string> = {
    support: "Nearest recent low below reference x 0.98", "atr-2": "Reference +/- 2 x ATR(14)",
    "atr-1.25": "Reference - 1.25 x ATR(14)", sma20: "SMA(20) x 0.97 (downside) or 1.02 (upside)",
    sma50: "SMA(50) x 0.97 (downside) or 1.02 (upside)", "swing-low": "Lowest 20-day low x 0.985",
    "trailing-high": "Highest 20-day high x 0.90", "fixed-8": "Reference x 0.92",
    resistance: "Nearest recent high above reference x 0.99", "atr-1": "Reference + ATR(14)",
    "bollinger-upper": "SMA(20) + 2 standard deviations", "swing-high": "Highest 20-day high x 0.99",
    "wide-swing-high": "Highest 60-day high x 0.985", "fixed-10": "Reference x 1.10",
  };
  const methods = (items: Array<{ method: string; label: string; price: number; weight: number }>) => <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs"><thead><tr className="border-b app-border-soft"><th className="p-2">Method</th><th className="p-2">Calculation</th><th className="p-2 text-right">Level</th><th className="p-2 text-right">Distance</th><th className="p-2 text-right">Weight</th></tr></thead><tbody>{items.map(item => <tr key={item.method} className="border-b app-border-soft"><td className="p-2">{item.label.replace(/target/gi, "level")}</td><td className="p-2 app-muted">{methodDescription[item.method] ?? item.method}</td><td className="p-2 text-right">{formatCurrency(item.price)}</td><td className="p-2 text-right">{formatPercent(((item.price - latest.close) / latest.close) * 100)}</td><td className="p-2 text-right">{item.weight}</td></tr>)}</tbody></table></div>;
  return <div className="space-y-6 py-4">
    <div><h2 className="text-sm font-semibold app-heading">Technical Observations</h2><p className="mt-1 text-xs app-muted">Reference close: {formatCurrency(latest.close)} | Price date: {latest.date} | Data fetched: {ohlc.at(-1)?.fetchedAt ?? "Unavailable"}</p></div>
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Fact label="SMA 20" value={formatCurrency(average)} /><Fact label="SMA 50" value={formatCurrency(sma(closes, 50))} /><Fact label="SMA 200" value={formatCurrency(sma(closes, 200))} /><Fact label="EMA 20" value={formatCurrency(latestEma(closes, 20))} />
      <Fact label="RSI 14" value={formatNumber(wilderRsi(closes, 14), 2)} /><Fact label="MACD histogram" value={formatNumber(calculateMacd(closes).histogram.at(-1), 3)} /><Fact label="ATR 14" value={formatNumber(calculateAtr(candles, 14), 3)} /><Fact label="Bollinger lower / upper" value={`${formatCurrency(bands.lower)} / ${formatCurrency(bands.upper)}`} />
    </dl>
    <section><h3 className="text-sm font-semibold">Technical Downside Levels - Method Comparison</h3><p className="my-2 text-xs app-muted">Composite Technical Level: {formatCurrency(downside.balanced.price)}. Calculated using the composite methodology.</p>{methods(downside.methods)}</section>
    <section><h3 className="text-sm font-semibold">Technical Upside Levels</h3><dl className="my-3 grid gap-4 sm:grid-cols-3"><Fact label="Near-Term Resistance Level" value={formatCurrency(upside.shortTerm.price)} /><Fact label="Composite Upside Level" value={formatCurrency(upside.balanced.price)} /><Fact label="Extended Technical Level" value={formatCurrency(upside.position.price)} /></dl>{methods(upside.methods)}</section>
    <p className="text-xs leading-5 app-muted">Composite Technical Level: the existing method nearest the weighted average of available method prices. No method is selected as a preferred trading level. Hypothetical upside/downside price-distance ratio: {formatNumber(ratio, 2)}. This is not a forecast or an execution-based reward-to-risk estimate.</p>
    <section><h3 className="text-sm font-semibold">Historical Ranges</h3><dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">{buildRangeLevels(candles, latest.close).map(range => <Fact key={range.label} label={range.label} value={`${formatCurrency(range.low)} - ${formatCurrency(range.high)}`} />)}</dl></section>
  </div>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs app-muted">{label}</dt><dd className="mt-1 break-words text-sm font-semibold app-heading">{value}</dd></div>;
}
