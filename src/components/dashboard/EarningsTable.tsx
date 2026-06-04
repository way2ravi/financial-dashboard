import type { EarningsQuarterly, FinancialStatements, OhlcDaily } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber } from "./format";

type Props = {
  earnings: EarningsQuarterly[];
  financialStatements?: FinancialStatements;
  ohlc?: OhlcDaily[];
  showDataSource?: boolean;
};

type EarningsReaction = {
  advice: string;
  fiveDayMove: number | null;
  initialMove: number | null;
  tone: "positive" | "negative" | "neutral";
};

export function EarningsTable({
  earnings,
  financialStatements,
  ohlc = [],
  showDataSource = false,
}: Props) {
  const freshness = latestFreshness(earnings);
  const candles = toValidCandles(ohlc);
  const quarterlyRevenue = getQuarterlyRevenueMap(financialStatements);

  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div className="flex flex-col gap-2 border-b app-border-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold app-heading">Quarterly Earnings</h2>
        <DataFreshness
          fetchedAt={freshness?.fetchedAt}
          showSource={showDataSource}
          source={freshness?.source}
        />
      </div>
      {earnings.length === 0 ? (
        <div className="m-4 rounded-lg border app-subtle p-3 text-xs app-muted">
          No quarterly earnings are cached yet. Refresh market data to populate this table.
        </div>
      ) : null}
      {earnings.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-subtle">
            <tr className="uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Quarter</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Report date</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">EPS actual</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">EPS estimate</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">EPS surprise</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Revenue actual</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Revenue estimate</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Revenue surprise</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Market reaction</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((item) => {
              const revenueActual =
                item.revenueActual ?? getStatementRevenueForEarnings(item, quarterlyRevenue);
              const revenueSurprise = getRevenueSurprisePercent(
                revenueActual,
                item.revenueEstimate
              );
              const reaction = getEarningsReaction(item, candles, revenueSurprise);

              return (
                <tr key={item.id} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                  <td className="border-b app-border-soft px-3 py-2.5 font-medium app-heading">
                    Q{item.fiscalQuarter} {item.fiscalYear}
                  </td>
                  <td className="border-b app-border-soft px-3 py-2.5">{item.reportDate}</td>
                  <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatNumber(item.epsActual)}</td>
                  <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatNumber(item.epsEstimate)}</td>
                  <td className={`border-b app-border-soft px-3 py-2.5 text-right ${getChangeClass(item.epsSurprisePercent ?? item.epsSurprise)}`}>
                    {formatEpsSurprise(item.epsSurprise, item.epsSurprisePercent)}
                  </td>
                  <td className="border-b app-border-soft px-3 py-2.5 text-right">
                    {formatCurrency(revenueActual, true)}
                    {item.revenueActual === null && revenueActual !== null ? (
                      <span className="ml-1 app-muted">*</span>
                    ) : null}
                  </td>
                  <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatCurrency(item.revenueEstimate, true)}</td>
                  <td className={`border-b app-border-soft px-3 py-2.5 text-right ${getChangeClass(revenueSurprise)}`}>
                    {formatSignedPercent(revenueSurprise)}
                  </td>
                  <td className="border-b app-border-soft px-3 py-2.5">
                    <ReactionCell reaction={reaction} />
                  </td>
                </tr>
              );
            })}
          </tbody>
            </table>
          </div>
          <div className="border-t app-border-soft px-4 py-2 text-[11px] app-muted">
            * Revenue actual can fall back to cached quarterly income statements when the earnings
            provider does not return revenue. Revenue estimates depend on provider availability.
          </div>
        </>
      ) : null}
    </section>
  );
}

function ReactionCell({ reaction }: { reaction: EarningsReaction }) {
  const toneClass =
    reaction.tone === "positive"
      ? "app-positive"
      : reaction.tone === "negative"
        ? "app-negative"
        : "app-muted";

  return (
    <div className="min-w-[220px]">
      <div className={`font-semibold ${toneClass}`}>
        {reaction.initialMove === null
          ? "Reaction unavailable"
          : `${formatSignedPercent(reaction.initialMove)} initial`}
        {reaction.fiveDayMove !== null ? ` / ${formatSignedPercent(reaction.fiveDayMove)} 5d` : ""}
      </div>
      <div className="mt-1 text-[11px] leading-4 app-muted">{reaction.advice}</div>
    </div>
  );
}

function getRevenueSurprisePercent(actual: number | null, estimate: number | null) {
  if (actual === null || estimate === null || estimate === 0) {
    return null;
  }

  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

function formatEpsSurprise(value: number | null, percent: number | null) {
  if (value === null && percent === null) {
    return "-";
  }

  if (percent === null) {
    return formatNumber(value);
  }

  return `${formatNumber(value)} / ${formatSignedPercent(percent)}`;
}

function formatSignedPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  const formatted = `${formatNumber(value, 1)}%`;

  return value > 0 ? `+${formatted}` : formatted;
}

function getChangeClass(value: number | null) {
  if (value === null) {
    return "app-muted";
  }

  return value >= 0 ? "app-positive" : "app-negative";
}

function getEarningsReaction(
  item: EarningsQuarterly,
  candles: Array<{ close: number; date: string }>,
  revenueSurprise: number | null
): EarningsReaction {
  const fallback = getFundamentalOnlyReaction(item, revenueSurprise);

  if (!item.reportDate || candles.length < 2) {
    return fallback;
  }

  const reportIndex = candles.findIndex((candle) => candle.date >= item.reportDate!);

  if (reportIndex <= 0) {
    return fallback;
  }

  const previous = candles[reportIndex - 1];
  const firstAfter = candles[reportIndex];
  const fifthAfter = candles[Math.min(reportIndex + 4, candles.length - 1)];

  if (!previous || !firstAfter || previous.close <= 0) {
    return fallback;
  }

  const initialMove = ((firstAfter.close - previous.close) / previous.close) * 100;
  const fiveDayMove =
    fifthAfter && firstAfter.close > 0
      ? ((fifthAfter.close - firstAfter.close) / firstAfter.close) * 100
      : null;
  const score = getEarningsScore(item, revenueSurprise);
  const tone = getReactionTone(initialMove, fiveDayMove);
  const advice = buildReactionAdvice({ fiveDayMove, initialMove, score });

  return {
    advice,
    fiveDayMove,
    initialMove,
    tone,
  };
}

function getFundamentalOnlyReaction(
  item: EarningsQuarterly,
  revenueSurprise: number | null
): EarningsReaction {
  const score = getEarningsScore(item, revenueSurprise);

  if (score >= 2) {
    return {
      advice: "Earnings looked stronger than expected, but price reaction needs more cached OHLC history.",
      fiveDayMove: null,
      initialMove: null,
      tone: "positive",
    };
  }

  if (score <= -2) {
    return {
      advice: "Earnings looked weaker than expected, but price reaction needs more cached OHLC history.",
      fiveDayMove: null,
      initialMove: null,
      tone: "negative",
    };
  }

  return {
    advice: "Mixed earnings result. Add or refresh OHLC history to see how the market reacted.",
    fiveDayMove: null,
    initialMove: null,
    tone: "neutral",
  };
}

function getEarningsScore(item: EarningsQuarterly, revenueSurprise: number | null) {
  let score = 0;
  const epsSurprise = item.epsSurprisePercent ?? item.epsSurprise;

  if (epsSurprise !== null) {
    if (epsSurprise >= 5) score += 1;
    if (epsSurprise <= -5) score -= 1;
  }

  if (revenueSurprise !== null) {
    if (revenueSurprise >= 2) score += 1;
    if (revenueSurprise <= -2) score -= 1;
  }

  return score;
}

function getReactionTone(initialMove: number, fiveDayMove: number | null): EarningsReaction["tone"] {
  const followThrough = fiveDayMove ?? 0;
  const combined = initialMove + followThrough * 0.5;

  if (combined >= 2) return "positive";
  if (combined <= -2) return "negative";
  return "neutral";
}

function buildReactionAdvice({
  fiveDayMove,
  initialMove,
  score,
}: {
  fiveDayMove: number | null;
  initialMove: number;
  score: number;
}) {
  const positiveReaction = initialMove >= 2;
  const negativeReaction = initialMove <= -2;
  const positiveFollowThrough = fiveDayMove !== null && fiveDayMove >= 1;
  const negativeFollowThrough = fiveDayMove !== null && fiveDayMove <= -1;

  if (score >= 2 && positiveReaction && !negativeFollowThrough) {
    return "Good report and the market rewarded it. Bias improves unless valuation or guidance says otherwise.";
  }

  if (score >= 2 && negativeReaction) {
    return "Numbers beat, but the market sold it. That usually means guidance, margins, or valuation worried investors.";
  }

  if (score <= -2 && negativeReaction) {
    return "Weak report and price confirmed it. Treat as bearish until buyers reclaim the post-earnings level.";
  }

  if (score <= -2 && positiveReaction) {
    return "Numbers looked weak, but price rose. The market may be looking past the miss or reacting to guidance.";
  }

  if (positiveReaction && positiveFollowThrough) {
    return "Market reaction was constructive with follow-through. Momentum improved after the report.";
  }

  if (negativeReaction && negativeFollowThrough) {
    return "Market reaction was poor with follow-through selling. Be cautious until trend stabilizes.";
  }

  if (Math.abs(initialMove) < 1) {
    return "Muted reaction. The report did not materially change market opinion.";
  }

  return "Reaction was mixed. Use the 5-day follow-through and technical levels before drawing a strong conclusion.";
}

function toValidCandles(ohlc: OhlcDaily[]) {
  return ohlc
    .filter(
      (point): point is OhlcDaily & { close: number } =>
        Boolean(point.date) && point.close !== null && Number.isFinite(point.close)
    )
    .map((point) => ({ close: point.close, date: point.date }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function getQuarterlyRevenueMap(financialStatements: FinancialStatements | undefined) {
  const rows =
    financialStatements?.quarterly.filter(
      (row) => row.statementType === "income" && row.totalRevenue !== null
    ) ?? [];

  return new Map(rows.map((row) => [row.fiscalDate, row.totalRevenue]));
}

function getStatementRevenueForEarnings(
  item: EarningsQuarterly,
  quarterlyRevenue: Map<string, number | null>
) {
  const candidates = [item.period, item.reportDate].filter(
    (value): value is string => Boolean(value)
  );

  for (const candidate of candidates) {
    const exact = quarterlyRevenue.get(candidate);
    if (exact !== undefined) {
      return exact;
    }
  }

  return null;
}
