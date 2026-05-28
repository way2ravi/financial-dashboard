import type { EarningsQuarterly } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber } from "./format";

type Props = {
  earnings: EarningsQuarterly[];
};

export function EarningsTable({ earnings }: Props) {
  const freshness = latestFreshness(earnings);

  return (
    <section className="rounded-lg border app-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-base font-semibold app-heading">Quarterly Earnings</h2>
        <DataFreshness fetchedAt={freshness?.fetchedAt} source={freshness?.source} />
      </div>
      {earnings.length === 0 ? (
        <div className="mt-4 rounded-lg border app-subtle p-4 text-sm app-muted">
          No quarterly earnings are cached yet. Refresh market data to populate this table.
        </div>
      ) : null}
      {earnings.length > 0 ? (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft pb-2 font-medium">Quarter</th>
              <th className="border-b app-border-soft pb-2 font-medium">Report date</th>
              <th className="border-b app-border-soft pb-2 font-medium">EPS</th>
              <th className="border-b app-border-soft pb-2 font-medium">Estimate</th>
              <th className="border-b app-border-soft pb-2 font-medium">Surprise</th>
              <th className="border-b app-border-soft pb-2 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((item) => (
              <tr key={item.id} className="app-muted">
                <td className="border-b app-border-soft py-3 font-medium app-heading">
                  Q{item.fiscalQuarter} {item.fiscalYear}
                </td>
                <td className="border-b app-border-soft py-3">{item.reportDate}</td>
                <td className="border-b app-border-soft py-3">{formatNumber(item.epsActual)}</td>
                <td className="border-b app-border-soft py-3">{formatNumber(item.epsEstimate)}</td>
                <td className="border-b app-border-soft py-3 app-positive">
                  {formatNumber(item.epsSurprise)}
                </td>
                <td className="border-b app-border-soft py-3">{formatCurrency(item.revenueActual, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}
    </section>
  );
}
