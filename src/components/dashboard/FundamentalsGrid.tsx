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
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-sm font-semibold app-heading">Fundamentals</h2>
        <DataFreshness
          fetchedAt={fundamentals?.fetchedAt}
          source={fundamentals?.source}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border app-subtle px-3 py-2.5">
            <div className="text-[11px] font-medium app-muted">{label}</div>
            <div className="mt-1 text-base font-semibold app-heading">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
