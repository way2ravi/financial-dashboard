import Link from "next/link";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { formatCurrency, formatNumber, formatPercent } from "@/components/dashboard/format";
import {
  getDashboardBySymbol,
  getMarketOverview,
  getPortfolioSummariesForUser,
  getWatchlistForUser,
  getWealthDashboardForUser,
  type MarketMood,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type {
  CompanyNewsArticle,
  PortfolioSummary,
  WatchlistItem,
  WealthAdviceItem,
  WealthDashboard,
} from "@/lib/types";
import { getPortalCurrencyOption } from "@/lib/types/currency";

type DbClient = SupabaseClient<Database>;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [wealth, portfolios, watchlist, market] = await Promise.all([
    loadWealth(supabase, user),
    loadPortfolios(supabase, user),
    loadWatchlist(supabase, user),
    loadMarket(),
  ]);
  const watchlistNews = await loadWatchlistNews(supabase, watchlist.items);
  const currency = getPortalCurrencyOption(wealth.dashboard.settings?.baseCurrency).code;
  const portfolioRollup = summarizePortfolios(portfolios.items);
  const growthRead = buildGrowthRead(wealth.dashboard, portfolioRollup, market.mood);
  const topAdvice = wealth.dashboard.advice.slice(0, 3);

  return (
    <main className="min-h-screen app-bg">
      <AppHeader
        current="dashboard"
        title="Dashboard"
        description="A consolidated view of wealth, portfolios, market posture, watchlists, and stock news."
      />

      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
        {!user ? <SignInPanel /> : null}

        <section className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <WealthSummaryCard
            currency={currency}
            growthRead={growthRead}
            setupError={wealth.setupError}
            wealth={wealth.dashboard}
          />
          <MarketMoodCard mood={market.mood} refreshedAt={market.refreshedAt} />
        </section>

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            href="/wealth"
            label="Net worth"
            tone={wealth.dashboard.netWorth >= 0 ? "positive" : "negative"}
            value={formatCurrency(wealth.dashboard.netWorth, true, currency)}
          />
          <Metric
            href="/portfolio"
            label="Portfolio value"
            tone={portfolioRollup.totalGain >= 0 ? "positive" : "negative"}
            value={formatCurrency(portfolioRollup.marketValue, true, portfolioRollup.currency)}
          />
          <Metric
            href="/watchlist"
            label="Watchlist"
            value={`${formatNumber(watchlist.items.length, 0)} saved stocks`}
          />
          <Metric
            href="/market"
            label="Market mood"
            tone={market.mood.tone}
            value={market.mood.label}
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <PortfolioCard
            rollup={portfolioRollup}
            setupError={portfolios.setupError}
          />
          <WatchlistCard watchlist={watchlist.items} />
        </section>

        <section className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <StockNewsCard news={watchlistNews} watchlistCount={watchlist.items.length} />
          <AdviceCard advice={topAdvice} setupError={wealth.setupError} />
        </section>
      </div>
    </main>
  );
}

function SignInPanel() {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Sign in for your personal picture</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            The dashboard can combine wealth entries, portfolios, watchlists, and saved stock news
            once you are signed in.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-lg app-primary-button px-4 text-xs font-semibold"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}

function WealthSummaryCard({
  currency,
  growthRead,
  setupError,
  wealth,
}: {
  currency: string;
  growthRead: GrowthRead;
  setupError: boolean;
  wealth: WealthDashboard;
}) {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-normal ${growthRead.className}`}>
            {growthRead.label}
          </div>
          <h2 className="mt-2 text-2xl font-semibold app-heading">
            {formatCurrency(wealth.netWorth, false, currency)}
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 app-muted">{growthRead.summary}</p>
        </div>
        <Link
          href="/wealth"
          className="inline-flex h-9 items-center justify-center rounded-lg app-primary-button px-4 text-xs font-semibold"
        >
          Wealth
        </Link>
      </div>

      {setupError ? (
        <p className="mt-3 rounded-lg border app-subtle p-3 text-xs app-muted">
          Wealth setup is pending. Run the wealth SQL to unlock the full balance-sheet view.
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Assets" value={formatCurrency(wealth.totalAssets, true, currency)} />
        <MiniStat label="Liabilities" value={formatCurrency(wealth.totalLiabilities, true, currency)} />
        <MiniStat label="Growth assets" value={formatCurrency(wealth.investments, true, currency)} />
      </div>
    </section>
  );
}

function MarketMoodCard({
  mood,
  refreshedAt,
}: {
  mood: MarketMood;
  refreshedAt: string | null;
}) {
  const toneClass = getToneClass(mood.tone);

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
            Market posture
          </div>
          <h2 className={`mt-1 text-xl font-semibold ${toneClass}`}>{mood.label}</h2>
        </div>
        <div className="rounded-full border app-subtle px-2.5 py-1 text-xs font-semibold app-heading">
          {Math.round(mood.score)}/100
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full app-subtle">
        <div
          className={`h-full rounded-full ${getBarClass(mood.tone)}`}
          style={{ width: `${Math.max(0, Math.min(100, mood.score))}%` }}
        />
      </div>
      <p className="mt-3 text-xs leading-5 app-muted">{mood.summary}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="Advancers" value={formatNumber(mood.advancers, 0)} />
        <MiniStat label="Decliners" value={formatNumber(mood.decliners, 0)} />
        <MiniStat label="Avg move" value={formatPercent(mood.averageChange)} />
      </div>
      <p className="mt-3 text-[11px] app-muted">
        {refreshedAt ? `Updated ${formatDateTime(refreshedAt)}` : "No market cache yet"}
      </p>
    </section>
  );
}

function PortfolioCard({
  rollup,
  setupError,
}: {
  rollup: PortfolioRollup;
  setupError: boolean;
}) {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold app-heading">Portfolio consolidated</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            Holdings and trade performance rolled up across all portfolios.
          </p>
        </div>
        <Link href="/portfolio" className="text-xs font-semibold app-heading hover:underline">
          Open
        </Link>
      </div>

      {setupError ? (
        <p className="mt-3 rounded-lg border app-subtle p-3 text-xs app-muted">
          Portfolio setup is pending. Run the portfolio SQL to enable rollups.
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Value" value={formatCurrency(rollup.marketValue, true, rollup.currency)} />
        <MiniStat label="Invested" value={formatCurrency(rollup.investedCapital, true, rollup.currency)} />
        <MiniStat label="Gain" value={formatCurrency(rollup.totalGain, true, rollup.currency)} />
        <MiniStat label="Return" value={formatPercent(rollup.totalGainPercent)} />
      </div>
      <p className="mt-3 text-xs app-muted">
        {formatNumber(rollup.portfolioCount, 0)} portfolios, {formatNumber(rollup.openPositions, 0)} open positions, {formatNumber(rollup.tradeCount, 0)} trades.
      </p>
    </section>
  );
}

function WatchlistCard({ watchlist }: { watchlist: WatchlistItem[] }) {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold app-heading">Watchlist</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            Saved stocks for repeat tracking and news snippets.
          </p>
        </div>
        <Link href="/watchlist" className="text-xs font-semibold app-heading hover:underline">
          Manage
        </Link>
      </div>

      {watchlist.length === 0 ? (
        <p className="mt-4 rounded-lg border app-subtle p-3 text-xs app-muted">
          No saved stocks yet. Add tickers from Stock to build a personal market radar.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {watchlist.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href={`/stock?symbol=${item.ticker.symbol}&autoload=1`}
              className="rounded-lg border app-subtle px-3 py-2.5 text-xs transition hover:bg-[var(--app-surface-muted)]"
            >
              <div className="font-semibold app-heading">{item.ticker.symbol}</div>
              <div className="mt-1 truncate app-muted">{item.ticker.name ?? item.ticker.exchange ?? "Saved stock"}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function StockNewsCard({
  news,
  watchlistCount,
}: {
  news: NewsSnippet[];
  watchlistCount: number;
}) {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold app-heading">Stock market news</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            Latest cached headlines from your saved stocks.
          </p>
        </div>
        <Link href="/stock" className="text-xs font-semibold app-heading hover:underline">
          Stock
        </Link>
      </div>

      {news.length === 0 ? (
        <p className="mt-4 rounded-lg border app-subtle p-3 text-xs app-muted">
          {watchlistCount === 0
            ? "Add watchlist stocks to surface company news here."
            : "No cached headlines yet. Open a saved stock to load its news feed."}
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {news.map((item) => (
            <a
              key={`${item.symbol}-${item.url}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border app-subtle px-3 py-2.5 transition hover:bg-[var(--app-surface-muted)]"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-normal app-muted">
                <span>{item.symbol}</span>
                <span>{item.sourceName ?? "Market news"}</span>
                <span>{formatDate(item.publishedAt)}</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold app-heading">{item.headline}</h3>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function AdviceCard({
  advice,
  setupError,
}: {
  advice: WealthAdviceItem[];
  setupError: boolean;
}) {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold app-heading">Next best actions</h2>
      <p className="mt-1 text-xs leading-5 app-muted">
        High-level planning prompts based on your wealth picture.
      </p>

      {setupError || advice.length === 0 ? (
        <p className="mt-4 rounded-lg border app-subtle p-3 text-xs app-muted">
          Add wealth entries to unlock personalized liquidity, debt, and investment guidance.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {advice.map((item) => (
            <div key={item.id} className="rounded-lg border app-subtle px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold app-heading">{item.title}</h3>
                <span className="rounded-full border app-border-soft px-2 py-1 text-[10px] font-semibold uppercase app-muted">
                  {item.priority}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 app-muted">{item.action}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({
  href,
  label,
  tone = "neutral",
  value,
}: {
  href: string;
  label: string;
  tone?: "positive" | "negative" | "neutral";
  value: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border app-surface px-3 py-2.5 shadow-sm transition hover:bg-[var(--app-surface-muted)]"
    >
      <p className="text-[11px] uppercase tracking-normal app-muted">{label}</p>
      <p className={`mt-1 text-base font-semibold ${getToneClass(tone)}`}>{value}</p>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-normal app-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold app-heading">{value}</div>
    </div>
  );
}

async function loadWealth(supabase: DbClient, user: User | null) {
  try {
    return {
      dashboard: await getWealthDashboardForUser(supabase, user),
      setupError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("wealth_items") || message.includes("wealth_user_settings")) {
      return {
        dashboard: await getWealthDashboardForUser(supabase, null),
        setupError: true,
      };
    }

    throw error;
  }
}

async function loadPortfolios(supabase: DbClient, user: User | null) {
  try {
    return {
      items: await getPortfolioSummariesForUser(supabase, user),
      setupError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("portfolios") || message.includes("portfolio_transactions")) {
      return { items: [], setupError: true };
    }

    throw error;
  }
}

async function loadWatchlist(supabase: DbClient, user: User | null) {
  try {
    return {
      items: await getWatchlistForUser(supabase, user),
      setupError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("watchlist")) {
      return { items: [], setupError: true };
    }

    throw error;
  }
}

async function loadMarket() {
  try {
    return await getMarketOverview(createAdminClient());
  } catch {
    return {
      markets: [],
      refreshedAt: null,
      mood: {
        averageChange: null,
        advancers: 0,
        decliners: 0,
        label: "Needs data",
        score: 50,
        summary: "Market posture will appear after market quote data is available.",
        tone: "neutral" as const,
      },
    };
  }
}

async function loadWatchlistNews(
  supabase: DbClient,
  watchlist: WatchlistItem[]
): Promise<NewsSnippet[]> {
  const symbols = watchlist.slice(0, 3).map((item) => item.ticker.symbol);
  const dashboards = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        return await getDashboardBySymbol(supabase, symbol);
      } catch {
        return null;
      }
    })
  );

  return dashboards
    .flatMap((dashboard) =>
      (dashboard?.news ?? []).slice(0, 2).map((item) => ({
        ...item,
        symbol: dashboard?.ticker.symbol ?? "",
      }))
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 5);
}

function summarizePortfolios(items: PortfolioSummary[]): PortfolioRollup {
  const currency = items[0]?.portfolio.baseCurrency ?? "USD";
  const marketValue = sum(items.map((item) => item.marketValue));
  const investedCapital = sum(items.map((item) => item.investedCapital));
  const totalGain = sum(items.map((item) => item.totalGain));

  return {
    currency,
    portfolioCount: items.length,
    marketValue,
    investedCapital,
    totalGain,
    totalGainPercent: investedCapital > 0 ? (totalGain / investedCapital) * 100 : null,
    openPositions: sum(items.map((item) => item.openPositions)),
    tradeCount: sum(items.map((item) => item.tradeCount)),
  };
}

function buildGrowthRead(
  wealth: WealthDashboard,
  portfolio: PortfolioRollup,
  mood: MarketMood
): GrowthRead {
  const hasWealth = wealth.totalAssets > 0 || wealth.totalLiabilities > 0;
  const portfolioPositive = portfolio.totalGain >= 0;
  const lowDebt =
    wealth.debtToAssetRatio === null || wealth.debtToAssetRatio < 35;

  if (hasWealth && wealth.netWorth > 0 && lowDebt && portfolioPositive) {
    return {
      label: "Growth picture: constructive",
      className: "app-positive",
      summary:
        "Your balance sheet is positive, debt pressure looks manageable, and recorded portfolio gains are not dragging the overall picture.",
    };
  }

  if (hasWealth && (wealth.netWorth < 0 || !lowDebt || mood.tone === "negative")) {
    return {
      label: "Growth picture: defensive",
      className: "app-negative",
      summary:
        "The dashboard is flagging balance-sheet or market pressure. Focus on liquidity, debt control, and position sizing before adding risk.",
    };
  }

  return {
    label: "Growth picture: building",
    className: "text-amber-300",
    summary:
      "Add wealth entries, portfolios, and watchlist stocks to turn this into a fuller view of your financial growth.",
  };
}

function getToneClass(tone: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "app-positive";
  if (tone === "negative") return "app-negative";
  return "app-heading";
}

function getBarClass(tone: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "bg-emerald-500";
  if (tone === "negative") return "bg-rose-500";
  return "bg-amber-500";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

type PortfolioRollup = {
  currency: string;
  investedCapital: number;
  marketValue: number;
  openPositions: number;
  portfolioCount: number;
  totalGain: number;
  totalGainPercent: number | null;
  tradeCount: number;
};

type GrowthRead = {
  className: string;
  label: string;
  summary: string;
};

type NewsSnippet = CompanyNewsArticle & {
  symbol: string;
};
