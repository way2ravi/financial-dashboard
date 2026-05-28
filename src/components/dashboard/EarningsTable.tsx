import type { EarningsQuarterly } from "@/lib/types";
import { formatCurrency, formatNumber } from "./format";

type Props = {
  earnings: EarningsQuarterly[];
};

export function EarningsTable({ earnings }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-950">Quarterly Earnings</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-normal text-slate-500">
              <th className="border-b border-slate-200 pb-2 font-medium">Quarter</th>
              <th className="border-b border-slate-200 pb-2 font-medium">Report date</th>
              <th className="border-b border-slate-200 pb-2 font-medium">EPS</th>
              <th className="border-b border-slate-200 pb-2 font-medium">Estimate</th>
              <th className="border-b border-slate-200 pb-2 font-medium">Surprise</th>
              <th className="border-b border-slate-200 pb-2 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((item) => (
              <tr key={item.id} className="text-slate-700">
                <td className="border-b border-slate-100 py-3 font-medium text-slate-950">
                  Q{item.fiscalQuarter} {item.fiscalYear}
                </td>
                <td className="border-b border-slate-100 py-3">{item.reportDate}</td>
                <td className="border-b border-slate-100 py-3">{formatNumber(item.epsActual)}</td>
                <td className="border-b border-slate-100 py-3">{formatNumber(item.epsEstimate)}</td>
                <td className="border-b border-slate-100 py-3 text-emerald-700">
                  {formatNumber(item.epsSurprise)}
                </td>
                <td className="border-b border-slate-100 py-3">{formatCurrency(item.revenueActual, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

