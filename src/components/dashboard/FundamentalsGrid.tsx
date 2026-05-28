import type { FundamentalsSnapshot } from "@/lib/types";
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
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">Fundamentals</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

