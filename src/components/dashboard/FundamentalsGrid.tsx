import type { FundamentalsSnapshot } from "@/lib/types";
import { DataFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber, formatPercent } from "./format";

type Props = {
  fundamentals: FundamentalsSnapshot | null;
  showDataSource?: boolean;
};

export function FundamentalsGrid({ fundamentals, showDataSource = false }: Props) {
  const peAnalysis = analyzePeRatio(fundamentals);
  const metrics = [
    metric("Market cap", formatCurrency(fundamentals?.marketCap, true), "neutral", null),
    metric("P/E", formatNumber(fundamentals?.pe), peTone(fundamentals?.pe), scoreRange(fundamentals?.pe, 0, 40, true)),
    metric("Forward P/E", formatNumber(fundamentals?.forwardPe), peTone(fundamentals?.forwardPe), scoreRange(fundamentals?.forwardPe, 0, 40, true)),
    metric("PEG", formatNumber(fundamentals?.peg), pegTone(fundamentals?.peg), scoreRange(fundamentals?.peg, 0, 3, true)),
    metric("P/B", formatNumber(fundamentals?.pb), "neutral", scoreRange(fundamentals?.pb, 0, 10, true)),
    metric("ROE", formatPercent(fundamentals?.roe), roeTone(fundamentals?.roe), scoreRange(fundamentals?.roe, 0, 30, false)),
    metric("Debt / Equity", formatNumber(fundamentals?.debtToEquity), debtTone(fundamentals?.debtToEquity), scoreRange(fundamentals?.debtToEquity, 0, 3, true)),
    metric("Dividend yield", formatPercent(fundamentals?.dividendYield), "neutral", scoreRange(fundamentals?.dividendYield, 0, 5, false)),
  ];

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-sm font-semibold app-heading">Fundamentals</h2>
        <DataFreshness
          fetchedAt={fundamentals?.fetchedAt}
          showSource={showDataSource}
          source={fundamentals?.source}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-lg border app-subtle px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium app-muted">{item.label}</div>
              <span className={`h-2 w-2 rounded-full ${getToneDot(item.tone)}`} />
            </div>
            <div className="mt-1 text-base font-semibold app-heading">{item.value}</div>
            {item.score !== null ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
                <div
                  className={`h-full rounded-full ${getToneBar(item.tone)}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border app-subtle p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
              P/E read
            </div>
            <div className={`mt-1 text-base font-semibold ${peAnalysis.toneClass}`}>
              {peAnalysis.label}
            </div>
            <div className="mt-1 text-sm font-semibold app-heading">
              {peAnalysis.verdict}
            </div>
            <div className="mt-1 text-xs app-muted">
              Confidence: {peAnalysis.confidence}
            </div>
          </div>
          <div className="text-left text-xs leading-5 app-muted sm:max-w-[70%] sm:text-right">
            {peAnalysis.summary}
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {peAnalysis.points.map((point) => (
            <div key={point} className="rounded-md border app-surface px-3 py-2 text-xs app-muted">
              {point}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type MetricTone = "positive" | "negative" | "neutral";

function metric(label: string, value: string, tone: MetricTone, score: number | null) {
  return { label, score, tone, value };
}

function scoreRange(
  value: number | null | undefined,
  min: number,
  max: number,
  inverted: boolean
) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return inverted ? 100 - normalized : normalized;
}

function peTone(value: number | null | undefined): MetricTone {
  if (value === null || value === undefined || value <= 0) return "neutral";
  if (value <= 20) return "positive";
  if (value > 35) return "negative";
  return "neutral";
}

function pegTone(value: number | null | undefined): MetricTone {
  if (value === null || value === undefined || value <= 0) return "neutral";
  if (value <= 1.5) return "positive";
  if (value >= 2.5) return "negative";
  return "neutral";
}

function roeTone(value: number | null | undefined): MetricTone {
  if (value === null || value === undefined) return "neutral";
  if (value >= 15) return "positive";
  if (value < 5) return "negative";
  return "neutral";
}

function debtTone(value: number | null | undefined): MetricTone {
  if (value === null || value === undefined) return "neutral";
  if (value > 2) return "negative";
  if (value <= 1) return "positive";
  return "neutral";
}

function getToneDot(tone: MetricTone) {
  if (tone === "positive") return "bg-[var(--app-positive)]";
  if (tone === "negative") return "bg-[var(--app-negative)]";
  return "bg-[var(--app-text-soft)]";
}

function getToneBar(tone: MetricTone) {
  if (tone === "positive") return "bg-[var(--app-positive)]";
  if (tone === "negative") return "bg-[var(--app-negative)]";
  return "bg-[var(--app-text-soft)]";
}

function analyzePeRatio(fundamentals: FundamentalsSnapshot | null) {
  const pe = fundamentals?.pe ?? null;
  const forwardPe = fundamentals?.forwardPe ?? null;
  const peg = fundamentals?.peg ?? null;
  const roe = fundamentals?.roe ?? null;
  const debtToEquity = fundamentals?.debtToEquity ?? null;
  const points: string[] = [];
  let cheapEvidence = 0;
  let expensiveEvidence = 0;
  let riskEvidence = 0;
  let evidenceCount = 0;

  if (pe === null) {
    return {
      label: "No P/E signal",
      verdict: "No reliable verdict yet.",
      confidence: "Low",
      summary: "P/E cannot be judged without positive earnings. Use sales, book value, cash flow, and analyst estimates instead.",
      toneClass: "app-muted",
      points: [
        "P/E requires positive earnings.",
        "Market-standard valuation compares peers, growth, profitability, and balance sheet risk.",
        "Refresh fundamentals if this company should have current earnings data.",
      ],
    };
  }

  if (pe <= 0) {
    return {
      label: "P/E not meaningful",
      verdict: "Do not call this cheap from P/E.",
      confidence: "Medium",
      summary: "Negative or zero earnings make P/E unreliable. For this case, revenue trend, cash flow, debt, and dilution matter more.",
      toneClass: "app-negative",
      points: [
        `Trailing P/E is ${formatNumber(pe)}.`,
        "Loss-making or cyclical earnings can distort valuation.",
        "Use P/S, P/B, cash flow, and upcoming earnings before making a value call.",
      ],
    };
  }

  if (pe < 10) {
    cheapEvidence += 1;
    riskEvidence += 1;
    evidenceCount += 1;
    points.push(`Trailing P/E is low at ${formatNumber(pe)}. That can mean value, or the market is pricing in risk.`);
  } else if (pe <= 20) {
    cheapEvidence += 1;
    evidenceCount += 1;
    points.push(`Trailing P/E is moderate at ${formatNumber(pe)}. This is generally easier to justify than a high multiple.`);
  } else if (pe <= 35) {
    expensiveEvidence += 1;
    evidenceCount += 1;
    points.push(`Trailing P/E is elevated at ${formatNumber(pe)}. It needs growth, quality, or sector support.`);
  } else {
    expensiveEvidence += 2;
    evidenceCount += 1;
    points.push(`Trailing P/E is high at ${formatNumber(pe)}. That is hard to justify without strong growth.`);
  }

  if (forwardPe !== null && forwardPe > 0) {
    evidenceCount += 1;
    if (forwardPe <= pe * 0.85) {
      cheapEvidence += 1;
      points.push(`Forward P/E falls to ${formatNumber(forwardPe)}. Analysts expect earnings to improve.`);
    } else if (forwardPe >= pe * 1.15) {
      expensiveEvidence += 1;
      points.push(`Forward P/E rises to ${formatNumber(forwardPe)}. Estimates do not support the current multiple.`);
    } else {
      points.push(`Forward P/E is close to trailing P/E at ${formatNumber(forwardPe)}. Earnings expectations look stable.`);
    }
  }

  if (peg !== null && peg > 0) {
    evidenceCount += 1;
    if (peg < 1) {
      cheapEvidence += 2;
      points.push(`PEG is ${formatNumber(peg)}. Growth-adjusted valuation looks favorable if estimates are reliable.`);
    } else if (peg <= 1.5) {
      cheapEvidence += 1;
      points.push(`PEG is ${formatNumber(peg)}. Growth broadly supports the valuation.`);
    } else if (peg >= 2.5) {
      expensiveEvidence += 2;
      points.push(`PEG is ${formatNumber(peg)}. Growth does not appear to justify the multiple.`);
    } else {
      expensiveEvidence += 1;
      points.push(`PEG is ${formatNumber(peg)}. Valuation is a bit rich versus growth.`);
    }
  }

  if (roe !== null) {
    evidenceCount += 1;
    if (roe >= 15) {
      cheapEvidence += 1;
      points.push(`ROE is strong at ${formatPercent(roe)}. Profitability supports a higher P/E.`);
    } else if (roe < 5) {
      expensiveEvidence += 1;
      points.push(`ROE is low at ${formatPercent(roe)}. Profitability weakens the valuation case.`);
    }
  }

  if (debtToEquity !== null && debtToEquity > 2) {
    riskEvidence += 1;
    evidenceCount += 1;
    points.push(`Debt/equity is elevated at ${formatNumber(debtToEquity)}. A low P/E may reflect balance sheet risk.`);
  }

  const netScore = cheapEvidence - expensiveEvidence - riskEvidence;
  const confidence =
    evidenceCount >= 4 && (peg !== null || forwardPe !== null)
      ? "Medium"
      : evidenceCount >= 2
        ? "Low to medium"
        : "Low";
  const label =
    netScore >= 2 && riskEvidence === 0
      ? "Possible undervaluation"
      : netScore >= 1
        ? "Reasonable, with caveats"
        : netScore <= -2
          ? "Likely expensive or risky"
          : "Inconclusive";
  const toneClass =
    netScore >= 1 ? "app-positive" : netScore <= -2 ? "app-negative" : "app-heading";
  const verdict =
    netScore >= 2 && riskEvidence === 0
      ? "This looks potentially cheap, but only if peers and growth confirm it."
      : netScore >= 1
        ? "This looks acceptable, not a clear bargain."
        : netScore <= -2
          ? "This looks expensive or risky unless growth improves."
          : "No reliable verdict from P/E alone.";

  return {
    label,
    verdict,
    confidence,
    summary: "Market-standard P/E analysis compares the company with peers and its own history. This score uses available growth, profitability, and debt signals, so treat it as a screening read.",
    toneClass,
    points: points.slice(0, 4),
  };
}
