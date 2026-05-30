import type { EarningsQuarterly } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber } from "./format";

type Props = {
  earnings: EarningsQuarterly[];
  showDataSource?: boolean;
};

export function EarningsTable({ earnings, showDataSource = false }: Props) {
  const freshness = latestFreshness(earnings);

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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-xs">
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
            </tr>
          </thead>
          <tbody>
            {earnings.map((item) => {
              const revenueSurprise = getRevenueSurprisePercent(
                item.revenueActual,
                item.revenueEstimate
              );

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
                  <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatCurrency(item.revenueActual, true)}</td>
                  <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatCurrency(item.revenueEstimate, true)}</td>
                  <td className={`border-b app-border-soft px-3 py-2.5 text-right ${getChangeClass(revenueSurprise)}`}>
                    {formatSignedPercent(revenueSurprise)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : null}
    </section>
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
