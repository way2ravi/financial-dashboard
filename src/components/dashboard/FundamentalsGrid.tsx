import type { FundamentalsSnapshot } from "@/lib/types";
import { DataFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber, formatPercent } from "./format";

type Props = {
  fundamentals: FundamentalsSnapshot | null;
};

export function FundamentalsGrid({ fundamentals }: Props) {
  const metrics = [
    ["Market cap", formatCurrency(fundamentals?.marketCap, true)],
    ["P/E", formatNumber(fundamentals?.pe)],
    ["Forward P/E", formatNumber(fundamentals?.forwardPe)],
    ["PEG", formatNumber(fundamentals?.peg)],
    ["P/B", formatNumber(fundamentals?.pb)],
    ["ROE", formatPercent(fundamentals?.roe)],
    ["Debt / Equity", formatNumber(fundamentals?.debtToEquity)],
    ["Dividend yield", formatPercent(fundamentals?.dividendYield)],
  ];

  return (
    <section className="rounded-lg border app-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-base font-semibold app-heading">Fundamentals</h2>
        <DataFreshness
          fetchedAt={fundamentals?.fetchedAt}
          source={fundamentals?.source}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border app-subtle p-3">
            <div className="text-xs font-medium app-muted">{label}</div>
            <div className="mt-1 text-lg font-semibold app-heading">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
