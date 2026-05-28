import type { OhlcDaily } from "@/lib/types";
import { formatCurrency } from "./format";

type Props = {
  ohlc: OhlcDaily[];
};

export function PriceChart({ ohlc }: Props) {
  const closes = ohlc.map((point) => point.close ?? 0);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = Math.max(max - min, 1);
  const width = 720;
  const height = 240;
  const padding = 18;

  const points = ohlc
    .map((point, index) => {
      const x = padding + (index / Math.max(ohlc.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (((point.close ?? min) - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Price Trend</h2>
          <p className="mt-1 text-sm text-slate-500">
            {ohlc[0]?.date} to {ohlc.at(-1)?.date}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-slate-500">Close</div>
          <div className="text-lg font-semibold text-slate-950">{formatCurrency(ohlc.at(-1)?.close)}</div>
        </div>
      </div>

      <div className="mt-4 h-[260px] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mock closing price line chart">
          <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#cbd5e1" />
          <line x1={padding} x2={width - padding} y1={padding} y2={padding} stroke="#e2e8f0" />
          <polyline fill="none" points={points} stroke="#0f766e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {ohlc.map((point, index) => {
            const x = padding + (index / Math.max(ohlc.length - 1, 1)) * (width - padding * 2);
            const y = height - padding - (((point.close ?? min) - min) / range) * (height - padding * 2);
            return <circle key={point.id} cx={x} cy={y} fill="#0f766e" r="4" />;
          })}
        </svg>
      </div>
    </section>
  );
}

