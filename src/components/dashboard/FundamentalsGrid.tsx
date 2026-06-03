import type {
  FinancialStatementPeriod,
  FinancialStatementRow,
  FinancialStatements,
  FundamentalsSnapshot,
} from "@/lib/types";
import { asPercent } from "@/lib/financial/metrics";
import { DataFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber, formatPercent } from "./format";

type Props = {
  financialStatements: FinancialStatements;
  fundamentals: FundamentalsSnapshot | null;
  showDataSource?: boolean;
};

export function FundamentalsGrid({
  financialStatements,
  fundamentals,
  showDataSource = false,
}: Props) {
  const peAnalysis = analyzePeRatio(fundamentals);
  const roe = asPercent(fundamentals?.roe);
  const annualStatementRows = mergeStatementRows(financialStatements.annual);
  const quarterlyStatementRows = mergeStatementRows(financialStatements.quarterly);
  const statementAnalysis = analyzeFinancialStatements(
    annualStatementRows,
    quarterlyStatementRows
  );
  const metrics = [
    metric("Market cap", formatCurrency(fundamentals?.marketCap, true), "neutral", null),
    metric("P/E", formatNumber(fundamentals?.pe), peTone(fundamentals?.pe), scoreRange(fundamentals?.pe, 0, 40, true)),
    metric("Forward P/E", formatNumber(fundamentals?.forwardPe), peTone(fundamentals?.forwardPe), scoreRange(fundamentals?.forwardPe, 0, 40, true)),
    metric("PEG", formatNumber(fundamentals?.peg), pegTone(fundamentals?.peg), scoreRange(fundamentals?.peg, 0, 3, true)),
    metric("P/B", formatNumber(fundamentals?.pb), "neutral", scoreRange(fundamentals?.pb, 0, 10, true)),
    metric("ROE", formatPercent(roe), roeTone(roe), scoreRange(roe, 0, 30, false)),
    metric("Debt / Equity", formatNumber(fundamentals?.debtToEquity), debtTone(fundamentals?.debtToEquity), scoreRange(fundamentals?.debtToEquity, 0, 3, true)),
    metric("Dividend yield", formatPercent(fundamentals?.dividendYield), "neutral", scoreRange(fundamentals?.dividendYield, 0, 5, false)),
  ];

  return (
    <div className="space-y-3">
      <FundamentalAdvicePanel
        peAnalysis={peAnalysis}
        statementAnalysis={statementAnalysis}
      />

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
      </section>

      <FinancialStatementsTables
        annualRows={annualStatementRows}
        quarterlyRows={quarterlyStatementRows}
      />
    </div>
  );
}

function FundamentalAdvicePanel({
  peAnalysis,
  statementAnalysis,
}: {
  peAnalysis: PeAnalysis;
  statementAnalysis: StatementAnalysis;
}) {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
            Fundamental summary
          </div>
          <h2 className={`mt-1 text-xl font-semibold ${statementAnalysis.toneClass}`}>
            {statementAnalysis.verdict}
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 app-muted">
            {statementAnalysis.summary}
          </p>
        </div>
        <div className="rounded-lg border app-subtle px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-wide app-muted">Confidence</div>
          <div className="mt-1 text-sm font-semibold app-heading">
            {statementAnalysis.confidence}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-4">
        {statementAnalysis.cards.map((card) => (
          <div key={card.label} className="rounded-lg border app-subtle px-3 py-2.5">
            <div className="text-[11px] font-medium app-muted">{card.label}</div>
            <div className={`mt-1 text-sm font-semibold ${card.toneClass}`}>{card.value}</div>
            <p className="mt-1 text-[11px] leading-4 app-muted">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border app-subtle p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
              Valuation read
            </div>
            <div className={`mt-1 text-base font-semibold ${peAnalysis.toneClass}`}>
              {peAnalysis.label}
            </div>
            <div className="mt-1 text-sm font-semibold app-heading">{peAnalysis.verdict}</div>
          </div>
          <div className="text-left text-xs leading-5 app-muted sm:max-w-[68%] sm:text-right">
            {peAnalysis.summary}
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {[...statementAnalysis.advice, ...peAnalysis.points].slice(0, 6).map((point) => (
            <div key={point} className="rounded-md border app-surface px-3 py-2 text-xs app-muted">
              {point}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinancialStatementsTables({
  annualRows,
  quarterlyRows,
}: {
  annualRows: StatementDisplayRow[];
  quarterlyRows: StatementDisplayRow[];
}) {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold app-heading">Financial Statements</h2>
        <p className="mt-1 text-xs leading-5 app-muted">
          Annual covers the last 5 fiscal years. Quarterly covers the latest 4 quarters when
          provider data is available.
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <StatementTable
          title="Annual statements"
          periodType="annual"
          rows={annualRows}
        />
        <StatementTable
          title="Quarterly statements"
          periodType="quarter"
          rows={quarterlyRows}
        />
      </div>
    </section>
  );
}

type StatementDisplayRow = {
  fiscalDate: string;
  period: string | null;
  income?: FinancialStatementRow;
  balance?: FinancialStatementRow;
  cashflow?: FinancialStatementRow;
};

function StatementTable({
  title,
  periodType,
  rows,
}: {
  title: string;
  periodType: FinancialStatementPeriod;
  rows: StatementDisplayRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border app-subtle p-3 text-xs app-muted">
        {title}: no cached statement rows yet. Select the ticker again to refresh from FMP after
        running the financial statement SQL.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide app-muted">{title}</h3>
        <span className="text-[11px] app-muted">
          {periodType === "annual" ? "Last 5 years" : "Last 4 quarters"}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border app-subtle">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-subtle">
            <tr className="uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Period</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Revenue</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Gross profit</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Operating income</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Net income</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Total assets</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Current liabilities</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Total equity</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Levered FCF</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Cash ops</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Cash investing</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Cash financing</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Net cash change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const previousRow = rows[index + 1];

              return (
              <tr key={row.fiscalDate} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                <td className="border-b app-border-soft px-3 py-2.5 font-semibold app-heading">
                  {row.period ?? row.fiscalDate}
                  <div className="text-[11px] font-normal app-muted">{row.fiscalDate}</div>
                </td>
                <MoneyCell value={row.income?.totalRevenue} previousValue={previousRow?.income?.totalRevenue} />
                <MoneyCell value={row.income?.grossProfit} previousValue={previousRow?.income?.grossProfit} />
                <MoneyCell value={row.income?.operatingIncome} previousValue={previousRow?.income?.operatingIncome} />
                <MoneyCell value={row.income?.netIncome} previousValue={previousRow?.income?.netIncome} />
                <MoneyCell value={row.balance?.totalAssets} previousValue={previousRow?.balance?.totalAssets} />
                <MoneyCell value={row.balance?.totalCurrentLiabilities} previousValue={previousRow?.balance?.totalCurrentLiabilities} lowerIsBetter />
                <MoneyCell value={row.balance?.totalEquity} previousValue={previousRow?.balance?.totalEquity} />
                <MoneyCell value={row.cashflow?.leveredFreeCashFlow} previousValue={previousRow?.cashflow?.leveredFreeCashFlow} positiveValueFallback />
                <MoneyCell value={row.cashflow?.cashFromOperations} previousValue={previousRow?.cashflow?.cashFromOperations} positiveValueFallback />
                <MoneyCell value={row.cashflow?.cashFromInvesting} previousValue={previousRow?.cashflow?.cashFromInvesting} positiveValueFallback />
                <MoneyCell value={row.cashflow?.cashFromFinancing} previousValue={previousRow?.cashflow?.cashFromFinancing} positiveValueFallback />
                <MoneyCell value={row.cashflow?.netChangeInCash} previousValue={previousRow?.cashflow?.netChangeInCash} positiveValueFallback />
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MoneyCell({
  lowerIsBetter = false,
  positiveValueFallback = false,
  previousValue,
  value,
}: {
  lowerIsBetter?: boolean;
  positiveValueFallback?: boolean;
  previousValue?: number | null;
  value: number | null | undefined;
}) {
  const performance = getStatementPerformance(value, previousValue, {
    lowerIsBetter,
    positiveValueFallback,
  });

  return (
    <td className={`border-b app-border-soft px-3 py-2.5 text-right font-semibold ${performance.className}`}>
      <div>{formatCurrency(value, true)}</div>
      {performance.delta ? (
        <div className="mt-0.5 text-[10px] font-medium">{performance.delta}</div>
      ) : null}
    </td>
  );
}

function getStatementPerformance(
  value: number | null | undefined,
  previousValue: number | null | undefined,
  options: { lowerIsBetter: boolean; positiveValueFallback: boolean }
) {
  if (value === null || value === undefined) {
    return { className: "app-muted", delta: null };
  }

  if (previousValue !== null && previousValue !== undefined && previousValue !== 0) {
    const change = ((value - previousValue) / Math.abs(previousValue)) * 100;

    if (Math.abs(change) < 0.1) {
      return { className: "app-heading", delta: "flat" };
    }

    const improved = options.lowerIsBetter ? change < 0 : change > 0;

    return {
      className: improved ? "app-positive" : "app-negative",
      delta: `${change > 0 ? "+" : ""}${formatPercent(change)}`,
    };
  }

  if (options.positiveValueFallback && value !== 0) {
    return {
      className: value > 0 ? "app-positive" : "app-negative",
      delta: null,
    };
  }

  return { className: "app-heading", delta: null };
}

function mergeStatementRows(rows: FinancialStatementRow[]): StatementDisplayRow[] {
  const byDate = new Map<string, StatementDisplayRow>();

  for (const row of rows) {
    const current = byDate.get(row.fiscalDate) ?? {
      fiscalDate: row.fiscalDate,
      period: row.period,
    };

    current[row.statementType] = row;
    current.period = current.period ?? row.period;
    byDate.set(row.fiscalDate, current);
  }

  return [...byDate.values()].sort((left, right) =>
    right.fiscalDate.localeCompare(left.fiscalDate)
  );
}

type PeAnalysis = ReturnType<typeof analyzePeRatio>;

type StatementAnalysis = {
  advice: string[];
  cards: Array<{
    label: string;
    note: string;
    toneClass: string;
    value: string;
  }>;
  confidence: string;
  summary: string;
  toneClass: string;
  verdict: string;
};

function analyzeFinancialStatements(
  annualRows: StatementDisplayRow[],
  quarterlyRows: StatementDisplayRow[]
): StatementAnalysis {
  const annualLatest = annualRows[0] ?? null;
  const annualOldest = annualRows.at(-1) ?? null;
  const quarterLatest = quarterlyRows[0] ?? null;
  const quarterPrevious = quarterlyRows[1] ?? null;
  const revenueGrowth = growthPercent(
    annualOldest?.income?.totalRevenue,
    annualLatest?.income?.totalRevenue
  );
  const quarterlyRevenueGrowth = growthPercent(
    quarterPrevious?.income?.totalRevenue,
    quarterLatest?.income?.totalRevenue
  );
  const netIncomeGrowth = growthPercent(
    annualOldest?.income?.netIncome,
    annualLatest?.income?.netIncome
  );
  const latestRevenue =
    annualLatest?.income?.totalRevenue ?? quarterLatest?.income?.totalRevenue ?? null;
  const latestGrossProfit =
    annualLatest?.income?.grossProfit ?? quarterLatest?.income?.grossProfit ?? null;
  const latestOperatingIncome =
    annualLatest?.income?.operatingIncome ?? quarterLatest?.income?.operatingIncome ?? null;
  const latestNetIncome =
    annualLatest?.income?.netIncome ?? quarterLatest?.income?.netIncome ?? null;
  const latestFreeCashFlow =
    annualLatest?.cashflow?.leveredFreeCashFlow ??
    quarterLatest?.cashflow?.leveredFreeCashFlow ??
    null;
  const latestCashFromOperations =
    annualLatest?.cashflow?.cashFromOperations ??
    quarterLatest?.cashflow?.cashFromOperations ??
    null;
  const latestAssets =
    annualLatest?.balance?.totalAssets ?? quarterLatest?.balance?.totalAssets ?? null;
  const latestCurrentLiabilities =
    annualLatest?.balance?.totalCurrentLiabilities ??
    quarterLatest?.balance?.totalCurrentLiabilities ??
    null;
  const latestEquity =
    annualLatest?.balance?.totalEquity ?? quarterLatest?.balance?.totalEquity ?? null;
  const grossMargin = marginPercent(latestGrossProfit, latestRevenue);
  const operatingMargin = marginPercent(latestOperatingIncome, latestRevenue);
  const netMargin = marginPercent(latestNetIncome, latestRevenue);
  const liabilityCoverage =
    latestAssets !== null && latestCurrentLiabilities !== null && latestCurrentLiabilities !== 0
      ? latestAssets / latestCurrentLiabilities
      : null;
  const equityRatio = marginPercent(latestEquity, latestAssets);
  const hasStatements = annualRows.length > 0 || quarterlyRows.length > 0;
  const advice: string[] = [];
  let positiveSignals = 0;
  let negativeSignals = 0;

  if (!hasStatements) {
    return {
      advice: [
        "Financial statement rows are not cached yet. Run the Supabase schema/RLS update, then select the ticker again to refresh FMP statements.",
        "Until statements load, rely on ratios, earnings, analyst data, technicals, and news rather than full fundamental trend analysis.",
      ],
      cards: [
        card("Revenue trend", "-", "No statement rows cached", "app-muted"),
        card("Profitability", "-", "No income statement cached", "app-muted"),
        card("Cash quality", "-", "No cash flow statement cached", "app-muted"),
        card("Balance sheet", "-", "No balance sheet cached", "app-muted"),
      ],
      confidence: "Low",
      summary:
        "The financial statement cache is empty, so this tab cannot yet judge revenue quality, profitability trend, balance sheet strength, or cash generation.",
      toneClass: "app-muted",
      verdict: "Statement data needed",
    };
  }

  if (revenueGrowth !== null) {
    if (revenueGrowth > 10) {
      positiveSignals += 1;
      advice.push(`Revenue is up ${formatSignedPercent(revenueGrowth)} over the available annual period.`);
    } else if (revenueGrowth < -10) {
      negativeSignals += 1;
      advice.push(`Revenue is down ${formatSignedPercent(revenueGrowth)} over the available annual period.`);
    } else {
      advice.push(`Revenue is broadly stable at ${formatSignedPercent(revenueGrowth)} over the available annual period.`);
    }
  }

  if (quarterlyRevenueGrowth !== null) {
    if (quarterlyRevenueGrowth > 5) {
      positiveSignals += 1;
      advice.push(`Latest quarterly revenue improved ${formatSignedPercent(quarterlyRevenueGrowth)} versus the prior quarter.`);
    } else if (quarterlyRevenueGrowth < -5) {
      negativeSignals += 1;
      advice.push(`Latest quarterly revenue fell ${formatSignedPercent(quarterlyRevenueGrowth)} versus the prior quarter.`);
    }
  }

  if (netIncomeGrowth !== null) {
    if (netIncomeGrowth > 10) {
      positiveSignals += 1;
      advice.push(`Net income trend is improving at ${formatSignedPercent(netIncomeGrowth)}.`);
    } else if (netIncomeGrowth < -10) {
      negativeSignals += 1;
      advice.push(`Net income trend is weakening at ${formatSignedPercent(netIncomeGrowth)}.`);
    }
  }

  if (netMargin !== null) {
    if (netMargin >= 15) {
      positiveSignals += 1;
      advice.push(`Net margin is healthy at ${formatPercent(netMargin)}.`);
    } else if (netMargin < 5) {
      negativeSignals += 1;
      advice.push(`Net margin is thin at ${formatPercent(netMargin)}.`);
    }
  }

  if (latestFreeCashFlow !== null || latestCashFromOperations !== null) {
    if ((latestFreeCashFlow ?? 0) > 0 && (latestCashFromOperations ?? 0) > 0) {
      positiveSignals += 1;
      advice.push("Cash generation is positive, which supports earnings quality.");
    } else {
      negativeSignals += 1;
      advice.push("Cash generation is weak or negative, so accounting profits need extra caution.");
    }
  }

  if (liabilityCoverage !== null) {
    if (liabilityCoverage >= 2) {
      positiveSignals += 1;
      advice.push(`Assets cover current liabilities by about ${formatNumber(liabilityCoverage)}x.`);
    } else if (liabilityCoverage < 1.2) {
      negativeSignals += 1;
      advice.push(`Current liability coverage is tight at about ${formatNumber(liabilityCoverage)}x.`);
    }
  }

  const netScore = positiveSignals - negativeSignals;
  const toneClass =
    netScore >= 3 ? "app-positive" : netScore <= -2 ? "app-negative" : "app-heading";
  const verdict =
    netScore >= 3
      ? "Financial statements look supportive"
      : netScore <= -2
        ? "Financial statements show pressure"
        : "Financial statements are mixed";
  const summary =
    netScore >= 3
      ? "Revenue, profit quality, cash generation, or balance sheet signals are broadly constructive based on cached statement rows."
      : netScore <= -2
        ? "The statement trend has enough weak points that valuation should be treated carefully until growth, margins, or cash flow improves."
        : "There are both positives and cautions. Use this with valuation, earnings, analyst data, and technical trend before deciding.";

  return {
    advice:
      advice.length > 0
        ? advice
        : ["Financial statement rows are cached, but not enough comparable values exist for a reliable trend."],
    cards: [
      card(
        "Revenue trend",
        revenueGrowth === null ? "-" : formatSignedPercent(revenueGrowth),
        "Annual trend from oldest to latest cached year",
        getToneClass(revenueGrowth, 10, -10)
      ),
      card(
        "Profitability",
        netMargin === null ? "-" : formatPercent(netMargin),
        `Gross ${formatPercent(grossMargin)} / operating ${formatPercent(operatingMargin)}`,
        getToneClass(netMargin, 15, 5, true)
      ),
      card(
        "Cash quality",
        formatCurrency(latestFreeCashFlow, true),
        `CFO ${formatCurrency(latestCashFromOperations, true)}`,
        getToneClass(latestFreeCashFlow, 0, 0, true)
      ),
      card(
        "Balance sheet",
        equityRatio === null ? "-" : formatPercent(equityRatio),
        `Assets/current liabilities ${liabilityCoverage === null ? "-" : `${formatNumber(liabilityCoverage)}x`}`,
        getToneClass(liabilityCoverage, 2, 1.2, true)
      ),
    ],
    confidence: annualRows.length >= 6 && quarterlyRows.length >= 6 ? "High" : "Medium",
    summary,
    toneClass,
    verdict,
  };
}

function card(label: string, value: string, note: string, toneClass: string) {
  return { label, note, toneClass, value };
}

function growthPercent(
  start: number | null | undefined,
  end: number | null | undefined
) {
  if (start === null || start === undefined || end === null || end === undefined || start === 0) {
    return null;
  }

  return ((end - start) / Math.abs(start)) * 100;
}

function marginPercent(
  numerator: number | null | undefined,
  denominator: number | null | undefined
) {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    denominator === 0
  ) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function formatSignedPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${formatPercent(value)}`;
}

function getToneClass(
  value: number | null | undefined,
  positiveThreshold: number,
  negativeThreshold: number,
  higherIsBetter = false
) {
  if (value === null || value === undefined) {
    return "app-heading";
  }

  if (higherIsBetter) {
    if (value >= positiveThreshold) return "app-positive";
    if (value < negativeThreshold) return "app-negative";
    return "app-heading";
  }

  if (value >= positiveThreshold) return "app-positive";
  if (value <= negativeThreshold) return "app-negative";
  return "app-heading";
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
  const roe = asPercent(fundamentals?.roe ?? null);
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
