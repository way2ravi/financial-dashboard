import type { EarningsQuarterly } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber } from "./format";

type Props = {
  earnings: EarningsQuarterly[];
};

export function EarningsTable({ earnings }: Props) {
  const freshness = latestFreshness(earnings);

  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div className="flex flex-col gap-2 border-b app-border-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold app-heading">Quarterly Earnings</h2>
        <DataFreshness fetchedAt={freshness?.fetchedAt} source={freshness?.source} />
      </div>
      {earnings.length === 0 ? (
        <div className="m-4 rounded-lg border app-subtle p-3 text-xs app-muted">
          No quarterly earnings are cached yet. Refresh market data to populate this table.
        </div>
      ) : null}
      {earnings.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-subtle">
            <tr className="uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Quarter</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Report date</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">EPS</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Estimate</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Surprise</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((item) => (
              <tr key={item.id} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                <td className="border-b app-border-soft px-3 py-2.5 font-medium app-heading">
                  Q{item.fiscalQuarter} {item.fiscalYear}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">{item.reportDate}</td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatNumber(item.epsActual)}</td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatNumber(item.epsEstimate)}</td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right app-positive">
                  {formatNumber(item.epsSurprise)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatCurrency(item.revenueActual, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}
    </section>
  );
}
