import type { OhlcDaily } from "@/lib/types";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency } from "./format";

type Props = {
  ohlc: OhlcDaily[];
};

export function PriceChart({ ohlc }: Props) {
  const validPoints = ohlc.filter((point) => point.close !== null);
  const closes = validPoints.map((point) => point.close ?? 0);
  const latestClose = validPoints.at(-1)?.close ?? null;
  const freshness = latestFreshness(ohlc);

  if (validPoints.length < 2) {
    return (
      <section className="rounded-lg border app-surface p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold app-heading">Price Trend</h2>
            <p className="mt-1 text-sm app-muted">Daily OHLC cache is not populated yet.</p>
            <div className="mt-3">
              <DataFreshness fetchedAt={freshness?.fetchedAt} source={freshness?.source} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium app-muted">Close</div>
            <div className="text-lg font-semibold app-heading">{formatCurrency(latestClose)}</div>
          </div>
        </div>
        <div className="mt-4 flex h-[260px] items-center justify-center rounded-lg border app-subtle px-4 text-center text-sm app-muted">
          Refresh market data to draw the price chart.
        </div>
      </section>
    );
  }

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = Math.max(max - min, 1);
  const width = 720;
  const height = 240;
  const padding = 18;

  const points = validPoints
    .map((point, index) => {
      const x = padding + (index / Math.max(ohlc.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (((point.close ?? min) - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-lg border app-surface p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold app-heading">Price Trend</h2>
          <p className="mt-1 text-sm app-muted">
            {validPoints[0]?.date} to {validPoints.at(-1)?.date}
          </p>
          <div className="mt-3">
            <DataFreshness fetchedAt={freshness?.fetchedAt} source={freshness?.source} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium app-muted">Close</div>
          <div className="text-lg font-semibold app-heading">{formatCurrency(latestClose)}</div>
        </div>
      </div>

      <div className="mt-4 h-[260px] w-full overflow-hidden rounded-lg border app-subtle">
        <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mock closing price line chart">
          <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="var(--app-border)" />
          <line x1={padding} x2={width - padding} y1={padding} y2={padding} stroke="var(--app-border-soft)" />
          <polyline fill="none" points={points} stroke="var(--app-accent)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {validPoints.map((point, index) => {
            const x = padding + (index / Math.max(validPoints.length - 1, 1)) * (width - padding * 2);
            const y = height - padding - (((point.close ?? min) - min) / range) * (height - padding * 2);
            return <circle key={point.id} cx={x} cy={y} fill="var(--app-accent)" r="4" />;
          })}
        </svg>
      </div>
    </section>
  );
}
