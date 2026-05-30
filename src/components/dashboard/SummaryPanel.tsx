import type { DashboardData, OhlcDaily } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "./format";

type SignalTone = "positive" | "negative" | "neutral";

type Signal = {
  label: string;
  score: number;
  tone: SignalTone;
  verdict: string;
  detail: string;
};

type Props = {
  data: DashboardData;
};

export function SummaryPanel({ data }: Props) {
  const signals = buildSignals(data);
  const score = signals.reduce((total, signal) => total + signal.score, 0);
  const confidence = getConfidence(signals);
  const decision = getDecision(score, confidence);

  return (
    <section className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        <div className="rounded-lg border app-surface p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
            Consolidated view
          </div>
          <div className="mt-3 flex items-center gap-4">
            <DecisionDial score={score} />
            <div>
              <div className={`text-2xl font-semibold ${decision.className}`}>
                {decision.label}
              </div>
              <p className="mt-1 text-xs leading-5 app-muted">{decision.summary}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniStat label="Signal score" value={formatSignedScore(score)} />
            <MiniStat label="Confidence" value={confidence} />
            <MiniStat label="Last price" value={formatCurrency(data.quote?.price)} />
            <MiniStat label="Target mean" value={formatCurrency(data.analystPriceTargets?.targetMean)} />
          </div>
        </div>

        <div className="rounded-lg border app-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold app-heading">Plain English Summary</h2>
          <p className="mt-2 text-sm leading-6 app-heading">{decision.narrative}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {signals.map((signal) => (
              <SignalCard key={signal.label} signal={signal} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const width = Math.max(8, Math.min(100, Math.abs(signal.score) * 35));
  const barClass =
    signal.tone === "positive"
      ? "bg-[var(--app-positive)]"
      : signal.tone === "negative"
        ? "bg-[var(--app-negative)]"
        : "bg-[var(--app-text-soft)]";

  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
          {signal.label}
        </div>
        <span className={`text-xs font-semibold ${getToneClass(signal.tone)}`}>
          {signal.verdict}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
      <p className="mt-2 text-xs leading-5 app-muted">{signal.detail}</p>
    </div>
  );
}

function DecisionDial({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(100, ((score + 8) / 16) * 100));

  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full border app-subtle">
      <div
        className="absolute inset-2 rounded-full"
        style={{
          background: `conic-gradient(var(--app-positive) ${normalized}%, var(--app-border-soft) 0)`,
        }}
      />
      <div className="relative grid h-20 w-20 place-items-center rounded-full app-surface">
        <div className="text-center">
          <div className="text-xl font-semibold app-heading">{Math.round(normalized)}</div>
          <div className="text-[10px] uppercase app-muted">Score</div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border app-subtle px-3 py-2">
      <div className="text-[11px] font-medium app-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold app-heading">{value}</div>
    </div>
  );
}

function buildSignals(data: DashboardData): Signal[] {
  return [
    buildAnalystSignal(data),
    buildEarningsSignal(data),
    buildFundamentalSignal(data),
    buildTechnicalSignal(data.ohlc),
    buildNewsSignal(data),
  ];
}

function buildAnalystSignal(data: DashboardData): Signal {
  const consensus = data.analystRatings?.consensus ?? null;
  const price = data.quote?.price ?? null;
  const target = data.analystPriceTargets?.targetMean ?? null;
  const upside = price && target ? ((target - price) / price) * 100 : null;
  let score = 0;

  if (consensus === "Strong Buy") score += 2;
  else if (consensus === "Buy") score += 1;
  else if (consensus === "Sell") score -= 1;
  else if (consensus === "Strong Sell") score -= 2;

  if (upside !== null && upside >= 20) score += 2;
  else if (upside !== null && upside >= 8) score += 1;
  else if (upside !== null && upside <= -10) score -= 2;
  else if (upside !== null && upside < 0) score -= 1;

  return {
    label: "Analyst view",
    score,
    tone: toTone(score),
    verdict: score > 0 ? "Supportive" : score < 0 ? "Weak" : "Mixed",
    detail:
      upside === null
        ? `Consensus is ${consensus ?? "unavailable"}; price target upside is not available yet.`
        : `Consensus is ${consensus ?? "unavailable"} with about ${formatSignedPercent(upside)} to the mean target.`,
  };
}

function buildEarningsSignal(data: DashboardData): Signal {
  const latest = data.earnings[0];

  if (!latest) {
    return {
      label: "Earnings",
      score: 0,
      tone: "neutral",
      verdict: "No data",
      detail: "No recent quarterly earnings are cached for this ticker yet.",
    };
  }

  let score = 0;
  const revenueSurprise = getRevenueSurprisePercent(latest.revenueActual, latest.revenueEstimate);

  if ((latest.epsSurprisePercent ?? latest.epsSurprise ?? 0) > 0) score += 1;
  if ((latest.epsSurprisePercent ?? latest.epsSurprise ?? 0) < 0) score -= 1;
  if (revenueSurprise !== null && revenueSurprise > 0) score += 1;
  if (revenueSurprise !== null && revenueSurprise < 0) score -= 1;

  return {
    label: "Earnings",
    score,
    tone: toTone(score),
    verdict: score > 0 ? "Beat" : score < 0 ? "Miss" : "Mixed",
    detail: `Latest quarter: EPS surprise ${formatPercent(latest.epsSurprisePercent ?? latest.epsSurprise)}, revenue surprise ${formatPercent(revenueSurprise)}.`,
  };
}

function buildFundamentalSignal(data: DashboardData): Signal {
  const f = data.fundamentals;

  if (!f) {
    return {
      label: "Fundamentals",
      score: 0,
      tone: "neutral",
      verdict: "No data",
      detail: "Fundamental ratios are not cached yet.",
    };
  }

  let score = 0;

  if (f.pe !== null && f.pe > 0 && f.pe <= 20) score += 1;
  if (f.pe !== null && f.pe > 35) score -= 1;
  if (f.peg !== null && f.peg > 0 && f.peg <= 1.5) score += 1;
  if (f.peg !== null && f.peg >= 2.5) score -= 1;
  if (f.roe !== null && f.roe >= 15) score += 1;
  if (f.debtToEquity !== null && f.debtToEquity > 2) score -= 1;

  return {
    label: "Fundamentals",
    score,
    tone: toTone(score),
    verdict: score > 0 ? "Healthy" : score < 0 ? "Stretched" : "Mixed",
    detail: `P/E ${formatNumber(f.pe)}, PEG ${formatNumber(f.peg)}, ROE ${formatPercent(f.roe)}, debt/equity ${formatNumber(f.debtToEquity)}.`,
  };
}

function buildTechnicalSignal(ohlc: OhlcDaily[]): Signal {
  const closes = ohlc
    .filter((point) => point.close !== null && Number.isFinite(point.close))
    .map((point) => point.close!);

  if (closes.length < 30) {
    return {
      label: "Technical",
      score: 0,
      tone: "neutral",
      verdict: "Limited",
      detail: "More daily candles are needed for a reliable trend read.",
    };
  }

  const close = closes.at(-1)!;
  const sma20 = average(closes.slice(-20));
  const sma50 = closes.length >= 50 ? average(closes.slice(-50)) : null;
  const rsi = latestRsi(closes, 14);
  let score = 0;

  if (close > sma20) score += 1;
  else score -= 1;
  if (sma50 !== null && close > sma50) score += 1;
  if (sma50 !== null && close < sma50) score -= 1;
  if (rsi !== null && rsi < 30) score += 1;
  if (rsi !== null && rsi > 70) score -= 1;

  return {
    label: "Technical",
    score,
    tone: toTone(score),
    verdict: score > 0 ? "Constructive" : score < 0 ? "Weak" : "Mixed",
    detail: `Last close is ${formatCurrency(close)} versus SMA20 ${formatCurrency(sma20)} and RSI ${formatNumber(rsi, 1)}.`,
  };
}

function buildNewsSignal(data: DashboardData): Signal {
  const scored = data.news
    .map((article) => article.sentimentScore)
    .filter((value): value is number => value !== null && value !== undefined);

  if (scored.length === 0) {
    return {
      label: "News",
      score: 0,
      tone: "neutral",
      verdict: "No signal",
      detail: "No provider news sentiment is cached yet.",
    };
  }

  const averageScore = scored.reduce((sum, value) => sum + value, 0) / scored.length;
  const score = averageScore > 0.15 ? 1 : averageScore < -0.15 ? -1 : 0;

  return {
    label: "News",
    score,
    tone: toTone(score),
    verdict: score > 0 ? "Positive" : score < 0 ? "Negative" : "Neutral",
    detail: `Average sentiment from ${scored.length} recent headline${scored.length === 1 ? "" : "s"} is ${formatNumber(averageScore, 2)}.`,
  };
}

function getDecision(score: number, confidence: string) {
  if (score >= 4) {
    return {
      label: "Buy Watch",
      className: "app-positive",
      summary: "Most available signals lean positive.",
      narrative:
        "This ticker has more green lights than red flags. It is not an automatic buy, but the setup looks constructive enough to consider an entry plan, position size, and stop loss.",
    };
  }

  if (score <= -4) {
    return {
      label: "Avoid / Sell Bias",
      className: "app-negative",
      summary: "Several available signals lean negative.",
      narrative:
        "The combined data is not supportive right now. For an existing position, this deserves tighter risk control. For a new position, waiting for better earnings, trend, or analyst confirmation looks more sensible.",
    };
  }

  return {
    label: "Hold / Watch",
    className: "app-heading",
    summary: `Signals are mixed and confidence is ${confidence.toLowerCase()}.`,
    narrative:
      "The data does not give a clean buy or sell message. This is a watchlist setup: review the chart, earnings quality, valuation, and news before acting.",
  };
}

function getConfidence(signals: Signal[]) {
  const nonNeutral = signals.filter((signal) => signal.score !== 0).length;

  if (nonNeutral >= 4) return "High";
  if (nonNeutral >= 2) return "Medium";
  return "Low";
}

function toTone(score: number): SignalTone {
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

function getToneClass(tone: SignalTone) {
  if (tone === "positive") return "app-positive";
  if (tone === "negative") return "app-negative";
  return "app-heading";
}

function getRevenueSurprisePercent(actual: number | null, estimate: number | null) {
  if (actual === null || estimate === null || estimate === 0) {
    return null;
  }

  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

  return 100 - 100 / (1 + averageGain / averageLoss);
}

function formatSignedScore(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatSignedPercent(value: number) {
  const formatted = formatPercent(value, 1);

  return value > 0 ? `+${formatted}` : formatted;
}
