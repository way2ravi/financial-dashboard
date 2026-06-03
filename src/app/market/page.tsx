import Link from "next/link";
import { AppHeader } from "@/components/dashboard/AppHeader";
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
  const readiness = buildFoReadiness(overview.markets, overview.mood);

  return (
    <main className="min-h-screen app-bg">
      <AppHeader
        current="market"
        title="Market Overview"
        description="Global market mood, regional breadth, and major equity market proxies for daily risk context."
      />

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

        <MarketReadinessPanel readiness={readiness} />

        <MarketTable markets={overview.markets} />
      </div>
    </main>
  );
}

function MarketReadinessPanel({ readiness }: { readiness: FoReadiness }) {
  const toneClass =
    readiness.tone === "positive"
      ? "text-emerald-300"
      : readiness.tone === "negative"
        ? "text-rose-300"
        : "text-amber-300";

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Market Posture & F&O Readiness</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 app-muted">
            A practical pre-trade read for futures and options planning. This uses market breadth,
            average index movement, US leadership, and current quote coverage. It is a readiness
            guide, not a trade signal.
          </p>
        </div>
        <div className="rounded-lg border app-subtle px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-wide app-muted">Posture</div>
          <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{readiness.label}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border app-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold app-heading">Readiness score</span>
            <span className="text-xs font-semibold app-muted">{readiness.score}/100</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full app-surface">
            <div
              className={`h-full rounded-full ${readiness.barClass}`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
          <p className="mt-4 text-xs leading-5 app-muted">{readiness.summary}</p>
          <div className="mt-4 rounded-md app-surface px-3 py-2 text-xs font-medium app-heading">
            F&O stance: {readiness.stance}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {readiness.factors.map((factor) => (
            <ReadinessFactor key={factor.label} factor={factor} />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {readiness.actions.map((action) => (
          <div key={action.title} className="rounded-lg border app-subtle px-3 py-2.5">
            <div className="text-xs font-semibold app-heading">{action.title}</div>
            <p className="mt-1 text-xs leading-5 app-muted">{action.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadinessFactor({ factor }: { factor: ReadinessFactor }) {
  const toneClass =
    factor.tone === "positive"
      ? "app-positive"
      : factor.tone === "negative"
        ? "app-negative"
        : "app-heading";

  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
        {factor.label}
      </div>
      <div className={`mt-1 text-base font-semibold ${toneClass}`}>{factor.value}</div>
      <p className="mt-1 text-[11px] leading-4 app-muted">{factor.detail}</p>
    </div>
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

type ReadinessTone = "positive" | "negative" | "neutral";

type ReadinessFactor = {
  label: string;
  value: string;
  detail: string;
  tone: ReadinessTone;
};

type FoReadiness = {
  actions: Array<{ title: string; body: string }>;
  barClass: string;
  factors: ReadinessFactor[];
  label: string;
  score: number;
  stance: string;
  summary: string;
  tone: ReadinessTone;
};

function buildFoReadiness(markets: GlobalMarketRow[], mood: MarketMood): FoReadiness {
  const quotedMarkets = markets.filter(
    (market) => market.quote?.changePercent !== null && market.quote?.changePercent !== undefined
  );
  const coverage = markets.length === 0 ? 0 : (quotedMarkets.length / markets.length) * 100;
  const usMarkets = quotedMarkets.filter((market) => market.region === "United States");
  const usAverage = averageChange(usMarkets);
  const globalAverage = mood.averageChange;
  const breadthPercent =
    quotedMarkets.length === 0 ? null : (mood.advancers / quotedMarkets.length) * 100;
  const spy = findChange(markets, "SPY");
  const qqq = findChange(markets, "QQQ");
  const iwm = findChange(markets, "IWM");
  const leadershipSpread =
    qqq !== null && spy !== null ? qqq - spy : iwm !== null && spy !== null ? iwm - spy : null;

  let score = 50;

  if (globalAverage !== null) score += Math.max(-22, Math.min(22, globalAverage * 9));
  if (breadthPercent !== null) score += Math.max(-18, Math.min(18, (breadthPercent - 50) * 0.55));
  if (usAverage !== null) score += Math.max(-12, Math.min(12, usAverage * 5));
  if (coverage < 70) score -= 8;
  if (leadershipSpread !== null && leadershipSpread > 0.35) score += 4;
  if (leadershipSpread !== null && leadershipSpread < -0.35) score -= 4;

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const tone: ReadinessTone =
    boundedScore >= 62 ? "positive" : boundedScore <= 42 ? "negative" : "neutral";
  const label =
    tone === "positive" ? "Risk-on setup" : tone === "negative" ? "Risk-off setup" : "Balanced setup";
  const barClass =
    tone === "positive" ? "bg-emerald-500" : tone === "negative" ? "bg-rose-500" : "bg-amber-500";
  const stance =
    tone === "positive"
      ? "Favour defined-risk bullish setups and avoid chasing overextended moves."
      : tone === "negative"
        ? "Prefer smaller size, hedges, or wait for stabilization before directional longs."
        : "Use neutral or defined-risk strategies until breadth or momentum confirms direction.";

  return {
    actions: buildReadinessActions(tone, coverage),
    barClass,
    factors: [
      {
        label: "Breadth",
        value: breadthPercent === null ? "-" : `${breadthPercent.toFixed(0)}% up`,
        detail: `${mood.advancers} advancing, ${mood.decliners} declining`,
        tone: getToneFromCenteredValue(breadthPercent, 55, 45),
      },
      {
        label: "Global momentum",
        value: globalAverage === null ? "-" : formatPercent(globalAverage),
        detail: "Average move across tracked markets",
        tone: getToneFromValue(globalAverage, 0.25, -0.25),
      },
      {
        label: "US lead",
        value: usAverage === null ? "-" : formatPercent(usAverage),
        detail: "SPY, QQQ, DIA, IWM average",
        tone: getToneFromValue(usAverage, 0.25, -0.25),
      },
      {
        label: "Tech vs broad",
        value: leadershipSpread === null ? "-" : formatPercent(leadershipSpread),
        detail: "QQQ relative to SPY where available",
        tone: getToneFromValue(leadershipSpread, 0.35, -0.35),
      },
    ],
    label,
    score: boundedScore,
    stance,
    summary: buildReadinessSummary(tone, boundedScore, coverage),
    tone,
  };
}

function buildReadinessActions(tone: ReadinessTone, coverage: number) {
  const dataAction =
    coverage < 70
      ? {
          title: "Data check",
          body: "Refresh market quotes before using this for F&O planning because quote coverage is low.",
        }
      : {
          title: "Data check",
          body: "Quote coverage is usable for a same-day market posture read.",
        };

  if (tone === "positive") {
    return [
      {
        title: "Directional bias",
        body: "Bullish setups can be considered, but keep risk defined because strong days can reverse late.",
      },
      {
        title: "Option structure",
        body: "Prefer spreads over naked premium if implied volatility is elevated when we add options-chain data.",
      },
      dataAction,
    ];
  }

  if (tone === "negative") {
    return [
      {
        title: "Directional bias",
        body: "Avoid forcing long trades. Watch for support breaks, failed bounces, or hedge opportunities.",
      },
      {
        title: "Option structure",
        body: "Defined-risk bearish spreads or protective puts fit better than oversized short-dated bets.",
      },
      dataAction,
    ];
  }

  return [
    {
      title: "Directional bias",
      body: "Market is mixed. Wait for confirmation or use neutral strategies where liquidity is strong.",
    },
    {
      title: "Option structure",
      body: "Iron condors, calendars, or debit spreads may fit better than one-way trades after options data is added.",
    },
    dataAction,
  ];
}

function buildReadinessSummary(tone: ReadinessTone, score: number, coverage: number) {
  const coverageText =
    coverage < 70
      ? " Quote coverage is thin, so treat this as preliminary."
      : " Quote coverage is sufficient for a broad market read.";

  if (tone === "positive") {
    return `Market posture is constructive with a ${score}/100 readiness score.${coverageText}`;
  }

  if (tone === "negative") {
    return `Market posture is defensive with a ${score}/100 readiness score.${coverageText}`;
  }

  return `Market posture is mixed with a ${score}/100 readiness score.${coverageText}`;
}

function averageChange(markets: GlobalMarketRow[]) {
  const values = markets
    .map((market) => market.quote?.changePercent)
    .filter((value): value is number => value !== null && value !== undefined);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function findChange(markets: GlobalMarketRow[], symbol: string) {
  return markets.find((market) => market.symbol === symbol)?.quote?.changePercent ?? null;
}

function getToneFromCenteredValue(
  value: number | null,
  positiveThreshold: number,
  negativeThreshold: number
): ReadinessTone {
  if (value === null) return "neutral";
  if (value >= positiveThreshold) return "positive";
  if (value <= negativeThreshold) return "negative";
  return "neutral";
}

function getToneFromValue(
  value: number | null,
  positiveThreshold: number,
  negativeThreshold: number
): ReadinessTone {
  if (value === null) return "neutral";
  if (value >= positiveThreshold) return "positive";
  if (value <= negativeThreshold) return "negative";
  return "neutral";
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
