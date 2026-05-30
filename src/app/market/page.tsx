import Link from "next/link";
import { AppNav } from "@/components/dashboard/AppNav";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { ThemeSwitcher } from "@/components/dashboard/ThemeSwitcher";
import { formatCurrency, formatNumber, formatPercent } from "@/components/dashboard/format";
import {
  getMarketOverview,
  type GlobalMarketRegion,
  type GlobalMarketRow,
  type MarketMood,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = {
  searchParams: Promise<{
    refresh?: string | string[];
  }>;
};

const regions: GlobalMarketRegion[] = [
  "United States",
  "Europe",
  "Asia-Pacific",
  "Emerging Markets",
];

export default async function MarketPage({ searchParams }: Props) {
  const params = await searchParams;
  const refresh = getSearchParam(params.refresh) === "1";
  const overview = await getMarketOverview(createAdminClient(), { refresh });
  const regionSummaries = summarizeRegions(overview.markets);

  return (
    <main className="min-h-screen app-bg">
      <header className="border-b app-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal app-heading">
              Market Overview
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 app-muted">
              Global market mood, regional breadth, and major equity market proxies for daily risk context.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppNav current="market" />
            <ThemeSwitcher />
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <section className="grid gap-3 xl:grid-cols-[360px_1fr]">
          <FearGreedGauge mood={overview.mood} refreshedAt={overview.refreshedAt} />

          <div className="rounded-lg border app-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold app-heading">Global Markets</h2>
                <p className="mt-1 max-w-3xl text-xs leading-5 app-muted">
                  These are liquid index and country-market proxies that work with the current free quote providers. They give a practical same-day read across US, Europe, Asia-Pacific, and emerging markets.
                </p>
              </div>
              <Link
                className="h-9 rounded-lg app-primary-button px-4 py-2 text-center text-xs font-semibold"
                href="/market?refresh=1"
              >
                Load markets
              </Link>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {regions.map((region) => (
                <RegionCard
                  key={region}
                  region={region}
                  summary={regionSummaries.get(region) ?? getEmptyRegionSummary()}
                />
              ))}
            </div>
          </div>
        </section>

        <MarketTable markets={overview.markets} />
      </div>
    </main>
  );
}

function FearGreedGauge({
  mood,
  refreshedAt,
}: {
  mood: MarketMood;
  refreshedAt: string | null;
}) {
  const needleRotation = -90 + mood.score * 1.8;
  const labelClass =
    mood.tone === "positive"
      ? "app-positive"
      : mood.tone === "negative"
        ? "app-negative"
        : "app-heading";

  return (
    <div className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
            Market fear & greed
          </div>
          <div className={`mt-1 text-xl font-semibold ${labelClass}`}>{mood.label}</div>
        </div>
        <div className="rounded-full border app-subtle px-2 py-1 text-xs font-semibold app-heading">
          {Math.round(mood.score)}
        </div>
      </div>

      <div className="relative mx-auto mt-4 h-36 max-w-[280px] overflow-hidden">
        <div
          className="absolute left-1/2 top-4 h-56 w-56 -translate-x-1/2 rounded-full"
          style={{
            background:
              "conic-gradient(from 270deg, var(--app-negative) 0deg 44deg, #f59e0b 44deg 80deg, var(--app-text-soft) 80deg 100deg, #84cc16 100deg 136deg, var(--app-positive) 136deg 180deg, transparent 180deg 360deg)",
          }}
        />
        <div className="absolute left-1/2 top-[48px] h-40 w-40 -translate-x-1/2 rounded-full app-surface" />
        <div
          className="absolute left-1/2 top-[124px] h-1.5 w-24 origin-left rounded-full bg-[var(--app-text)] shadow-sm transition-transform"
          style={{ transform: `rotate(${needleRotation}deg)` }}
        />
        <div className="absolute left-1/2 top-[118px] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[var(--app-text)] app-surface" />
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] font-semibold uppercase app-muted">
          <span>Fear</span>
          <span>Neutral</span>
          <span>Greed</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px] font-medium app-muted">
        <span>Extreme fear</span>
        <span>Fear</span>
        <span>Neutral</span>
        <span>Greed</span>
        <span>Extreme greed</span>
      </div>
      <p className="mt-3 text-xs leading-5 app-muted">{mood.summary}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Advancers" value={formatNumber(mood.advancers, 0)} />
        <MiniStat label="Decliners" value={formatNumber(mood.decliners, 0)} />
        <MiniStat label="Avg move" value={formatPercent(mood.averageChange)} />
      </div>
      <p className="mt-3 text-[11px] app-muted">
        {refreshedAt ? `Updated ${formatDateTime(refreshedAt)}` : "No market quote cache yet"}
      </p>
    </div>
  );
}

function RegionCard({
  region,
  summary,
}: {
  region: GlobalMarketRegion;
  summary: RegionSummary;
}) {
  const tone =
    summary.averageChange === null
      ? "app-heading"
      : summary.averageChange >= 0
        ? "app-positive"
        : "app-negative";

  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
        {region}
      </div>
      <div className={`mt-1 text-lg font-semibold ${tone}`}>
        {summary.averageChange === null
          ? "-"
          : `${summary.averageChange >= 0 ? "+" : ""}${formatPercent(summary.averageChange)}`}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs app-muted">
        <span>{summary.up} up</span>
        <span>{summary.down} down</span>
        <span>{summary.flat} flat</span>
      </div>
    </div>
  );
}

function MarketTable({ markets }: { markets: GlobalMarketRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div className="border-b app-border-soft px-4 py-3">
        <h2 className="text-sm font-semibold app-heading">Major Markets Today</h2>
        <p className="mt-1 text-xs app-muted">
          Sorted by region. Open each symbol for ticker-level chart, technicals, analyst data, and news when available.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-subtle">
            <tr className="uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Market</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Region</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Proxy</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Price</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Change</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Volume</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Read</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => (
              <tr key={market.symbol} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                <td className="border-b app-border-soft px-3 py-2.5">
                  <div className="font-semibold app-heading">{market.name}</div>
                  <div className="text-[11px] app-muted">{market.country}</div>
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">{market.region}</td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <Link
                    className="font-semibold app-heading hover:underline"
                    href={`/dashboard?symbol=${market.symbol}`}
                  >
                    {market.symbol}
                  </Link>
                  <div className="text-[11px] app-muted">{market.benchmark}</div>
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatCurrency(market.quote?.price)}
                </td>
                <td className={`border-b app-border-soft px-3 py-2.5 text-right font-semibold ${getChangeClass(market.quote?.changePercent)}`}>
                  {formatMarketChange(market.quote)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatNumber(market.quote?.volume, 0)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <MarketRead changePercent={market.quote?.changePercent} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MarketRead({ changePercent }: { changePercent: number | null | undefined }) {
  if (changePercent === null || changePercent === undefined) {
    return <span className="rounded-full border app-subtle px-2 py-1 text-[11px]">No quote</span>;
  }

  if (changePercent >= 1) {
    return <span className="rounded-full bg-[color-mix(in_srgb,var(--app-positive)_14%,transparent)] px-2 py-1 text-[11px] font-semibold app-positive">Risk-on</span>;
  }

  if (changePercent <= -1) {
    return <span className="rounded-full bg-[color-mix(in_srgb,var(--app-negative)_14%,transparent)] px-2 py-1 text-[11px] font-semibold app-negative">Risk-off</span>;
  }

  return <span className="rounded-full border app-subtle px-2 py-1 text-[11px]">Mixed</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border app-subtle px-3 py-2">
      <div className="text-[11px] font-medium app-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold app-heading">{value}</div>
    </div>
  );
}

type RegionSummary = {
  averageChange: number | null;
  down: number;
  flat: number;
  up: number;
};

function summarizeRegions(markets: GlobalMarketRow[]) {
  const summaries = new Map<GlobalMarketRegion, RegionSummary>();

  regions.forEach((region) => {
    const values = markets
      .filter((market) => market.region === region)
      .map((market) => market.quote?.changePercent)
      .filter((value): value is number => value !== null && value !== undefined);

    summaries.set(region, {
      averageChange:
        values.length === 0
          ? null
          : values.reduce((sum, value) => sum + value, 0) / values.length,
      down: values.filter((value) => value < -0.05).length,
      flat: values.filter((value) => value >= -0.05 && value <= 0.05).length,
      up: values.filter((value) => value > 0.05).length,
    });
  });

  return summaries;
}

function getEmptyRegionSummary(): RegionSummary {
  return {
    averageChange: null,
    down: 0,
    flat: 0,
    up: 0,
  };
}

function formatMarketChange(quote: GlobalMarketRow["quote"]) {
  if (!quote) {
    return "-";
  }

  const positive = (quote.changePercent ?? 0) >= 0;

  return `${positive ? "+" : ""}${formatCurrency(quote.change)} (${positive ? "+" : ""}${formatPercent(quote.changePercent)})`;
}

function getChangeClass(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "app-heading";
  }

  return value >= 0 ? "app-positive" : "app-negative";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
