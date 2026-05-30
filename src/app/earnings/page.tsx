import Link from "next/link";
import { AppNav } from "@/components/dashboard/AppNav";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { PageMessage, type PageMessageValue } from "@/components/dashboard/PageMessage";
import { ThemeSwitcher } from "@/components/dashboard/ThemeSwitcher";
import { formatCurrency, formatNumber, formatPercent } from "@/components/dashboard/format";
import {
  getDailyEarningsCalendar,
  refreshEarningsCalendarAnalystData,
  refreshDailyEarningsCalendar,
} from "@/lib/services";
import {
  findTickersBySymbols,
  getLatestAnalystPriceTargets,
  getLatestAnalystRatings,
  getLatestQuote,
} from "@/lib/repositories";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalystPriceTargetsSnapshot,
  AnalystRatingsSnapshot,
  EarningsCalendarItem,
  QuoteLatest,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Props = {
  searchParams: Promise<{
    date?: string | string[];
    filter?: string | string[];
    refresh?: string | string[];
  }>;
};

type EarningsFilter = "all" | "bullish" | "bearish" | "before-open" | "after-close";

export default async function EarningsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const selectedDate = getSelectedDate(resolvedSearchParams);
  const selectedFilter = getSelectedFilter(resolvedSearchParams);
  const { items, message, setupError } = await loadEarningsCalendar(
    selectedDate,
    getSearchParam(resolvedSearchParams.refresh) === "1"
  );
  const summary = summarizeCalendar(items);
  const filteredItems = filterCalendarItems(items, selectedFilter);

  return (
    <main className="min-h-screen app-bg">
      <header className="border-b app-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal app-heading">
              Daily Earnings
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 app-muted">
              Search any reporting date and review EPS, revenue, and market timing.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppNav current="earnings" />
            <ThemeSwitcher />
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <section className="rounded-lg border app-surface p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold app-heading">Earnings calendar</h2>
              <p className="mt-1 text-xs leading-5 app-muted">
                Cached first, refreshed automatically when a date has no stored rows.
              </p>
            </div>

            <form action="/earnings" className="grid gap-2 sm:grid-cols-[180px_auto]">
              <input
                name="date"
                type="date"
                defaultValue={selectedDate}
                className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
              />
              <input name="refresh" type="hidden" value="1" />
              <button
                type="submit"
                className="h-9 rounded-lg app-primary-button px-4 text-xs font-semibold"
              >
                Load date
              </button>
            </form>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Metric
              active={selectedFilter === "all"}
              href={earningsFilterHref(selectedDate, "all")}
              label="Reports"
              value={formatNumber(summary.total, 0)}
            />
            <Metric
              active={selectedFilter === "bullish"}
              href={earningsFilterHref(selectedDate, "bullish")}
              label="Bullish"
              value={formatNumber(summary.bullish, 0)}
            />
            <Metric
              active={selectedFilter === "bearish"}
              href={earningsFilterHref(selectedDate, "bearish")}
              label="Bearish"
              value={formatNumber(summary.bearish, 0)}
            />
            <Metric
              active={selectedFilter === "before-open"}
              href={earningsFilterHref(selectedDate, "before-open")}
              label="Before open"
              value={formatNumber(summary.beforeOpen, 0)}
            />
            <Metric
              active={selectedFilter === "after-close"}
              href={earningsFilterHref(selectedDate, "after-close")}
              label="After close"
              value={formatNumber(summary.afterClose, 0)}
            />
            <Metric label="With EPS estimate" value={formatNumber(summary.withEpsEstimate, 0)} />
          </div>
        </section>

        <PageMessage message={message} />

        {setupError ? (
          <section className="rounded-lg border app-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold app-heading">
              Earnings calendar database setup needed
            </h2>
            <p className="mt-2 text-xs app-muted">
              Run the latest Supabase schema and RLS SQL so the earnings calendar table exists.
            </p>
          </section>
        ) : (
          <EarningsCalendarTable
            date={selectedDate}
            filter={selectedFilter}
            items={filteredItems}
            totalItems={items.length}
          />
        )}
      </div>
    </main>
  );
}

type EarningsCalendarRow = EarningsCalendarItem & {
  analystRatings: AnalystRatingsSnapshot | null;
  analystPriceTargets: AnalystPriceTargetsSnapshot | null;
  quote: QuoteLatest | null;
  signal: EarningsSignal;
};

type EarningsSignal = {
  label: "Bullish" | "Bearish" | "Neutral" | "Insufficient";
  score: number;
  reasons: string[];
};

async function loadEarningsCalendar(
  date: string,
  forceRefresh: boolean
): Promise<{
  items: EarningsCalendarRow[];
  message: PageMessageValue;
  setupError: boolean;
}> {
  try {
    if (forceRefresh) {
      const supabase = createAdminClient();
      const result = await refreshDailyEarningsCalendar(supabase, date);
      const analystRefresh = await refreshEarningsCalendarAnalystData(
        supabase,
        result.items
      );

      return {
        items: await enrichWithAnalystData(supabase, result.items),
        message: toPageMessage(
          formatRefreshMessage(result.message, analystRefresh),
          result.items.length
        ),
        setupError: false,
      };
    }

    const supabase = await createClient();
    const cached = await getDailyEarningsCalendar(supabase, date);

    if (cached.items.length > 0) {
      return {
        items: await enrichWithAnalystData(supabase, cached.items),
        message: null,
        setupError: false,
      };
    }

    const admin = createAdminClient();
    const refreshed = await refreshDailyEarningsCalendar(admin, date);

    return {
      items: await enrichWithAnalystData(admin, refreshed.items),
      message: toPageMessage(refreshed.message, refreshed.items.length),
      setupError: false,
    };
  } catch (error) {
    const text = getErrorMessage(error);

    return {
      items: [],
      message: {
        tone: "error",
        text,
      },
      setupError: text.includes("earnings_calendar"),
    };
  }
}

async function enrichWithAnalystData(
  supabase: SupabaseClient<Database>,
  items: EarningsCalendarItem[]
): Promise<EarningsCalendarRow[]> {
  const tickers = await findTickersBySymbols(
    supabase,
    items.map((item) => item.symbol)
  );
  const tickerBySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
  const analystRows = await Promise.all(
    items.map(async (item) => {
      const ticker = tickerBySymbol.get(item.symbol);

      if (!ticker) {
        const row = {
          ...item,
          analystRatings: null,
          analystPriceTargets: null,
          quote: null,
        };

        return {
          ...row,
          signal: scoreEarningsSignal(row),
        };
      }

      const [analystRatings, analystPriceTargets, quote] = await Promise.all([
        getLatestAnalystRatings(supabase, ticker.id),
        getLatestAnalystPriceTargets(supabase, ticker.id),
        getLatestQuote(supabase, ticker.id),
      ]);

      const row = {
        ...item,
        analystRatings,
        analystPriceTargets,
        quote,
      };

      return {
        ...row,
        signal: scoreEarningsSignal(row),
      };
    })
  );

  return analystRows;
}

function EarningsCalendarTable({
  date,
  filter,
  items,
  totalItems,
}: {
  date: string;
  filter: EarningsFilter;
  items: EarningsCalendarRow[];
  totalItems: number;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-lg border app-surface p-5">
        <h2 className="text-sm font-semibold app-heading">
          {filter === "all" ? "No reports found" : "No matching reports"}
        </h2>
        <p className="mt-2 text-xs app-muted">
          {filter === "all"
            ? `No earnings reports are cached for ${date}. Try another trading date or refresh again after provider limits reset.`
            : `No reports match the ${formatFilterLabel(filter)} filter for ${date}.`}
        </p>
        {filter !== "all" ? (
          <Link
            href={earningsFilterHref(date, "all")}
            className="mt-4 inline-flex h-8 items-center rounded-lg border app-subtle px-3 text-xs font-semibold app-heading"
          >
            Show all reports
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div className="flex flex-col gap-2 border-b app-border-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Reports on {date}</h2>
          <p className="mt-0.5 text-xs leading-5 app-muted">
            {filter === "all"
              ? "Select a symbol to open the full dashboard and load company-level data."
              : `Showing ${items.length} of ${totalItems} reports filtered by ${formatFilterLabel(filter)}.`}
          </p>
        </div>
        {filter !== "all" ? (
          <Link
            href={earningsFilterHref(date, "all")}
            className="inline-flex h-8 items-center rounded-lg border app-subtle px-3 text-xs font-semibold app-heading"
          >
            Clear filter
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1360px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-subtle">
            <tr className="uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Symbol</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Signal</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Timing</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Fiscal period</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Rating</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Analysts</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Target mean</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Target upside</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Target range</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">EPS actual</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">EPS estimate</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">EPS surprise</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Revenue actual</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Revenue estimate</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Price reaction</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Fetched</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                <td className="border-b app-border-soft px-3 py-2.5">
                  <Link
                    href={`/dashboard?symbol=${item.symbol}&autoload=1`}
                    className="font-semibold app-heading hover:underline"
                  >
                    {item.symbol}
                  </Link>
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <SignalPill signal={item.signal} />
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  {formatEarningsHour(item.hour)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  {formatFiscalPeriod(item)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <RatingPill value={item.analystRatings?.consensus ?? null} />
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatNumber(item.analystRatings?.analystCount, 0)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatCurrency(item.analystPriceTargets?.targetMean)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatSignedPercent(getTargetUpside(item))}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatTargetRange(item.analystPriceTargets)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatNumber(item.epsActual)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatNumber(item.epsEstimate)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatSignedPercent(getEpsSurprisePercent(item))}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatCurrency(item.revenueActual, true)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatCurrency(item.revenueEstimate, true)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatSignedPercent(item.quote?.changePercent)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatDateTime(item.fetchedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SignalPill({ signal }: { signal: EarningsSignal }) {
  const toneClass =
    signal.label === "Bullish"
      ? "bg-[color-mix(in_srgb,var(--app-positive)_12%,transparent)] app-positive"
      : signal.label === "Bearish"
        ? "bg-[color-mix(in_srgb,var(--app-negative)_12%,transparent)] app-negative"
        : signal.label === "Neutral"
          ? "app-subtle"
          : "app-muted";

  return (
    <div className="flex max-w-[220px] flex-col gap-1">
      <span className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-semibold ${toneClass}`}>
        {signal.label}
      </span>
      <span className="text-xs app-muted">{signal.reasons.slice(0, 2).join("; ") || "-"}</span>
    </div>
  );
}

function RatingPill({ value }: { value: string | null }) {
  if (!value) {
    return <span>-</span>;
  }

  const positive = value === "Strong Buy" || value === "Buy";
  const negative = value === "Sell" || value === "Strong Sell";

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
        positive
          ? "bg-[color-mix(in_srgb,var(--app-positive)_12%,transparent)] app-positive"
          : negative
            ? "bg-[color-mix(in_srgb,var(--app-negative)_12%,transparent)] app-negative"
            : "app-subtle"
      }`}
    >
      {value}
    </span>
  );
}

function formatTargetRange(targets: AnalystPriceTargetsSnapshot | null) {
  if (!targets || (targets.targetLow === null && targets.targetHigh === null)) {
    return "-";
  }

  return `${formatCurrency(targets?.targetLow)} - ${formatCurrency(targets?.targetHigh)}`;
}

function Metric({
  active = false,
  href,
  label,
  value,
}: {
  active?: boolean;
  href?: string;
  label: string;
  value: string;
}) {
  const className = `rounded-lg border px-3 py-2.5 text-left transition ${
    active
      ? "border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]"
      : "app-subtle hover:border-[var(--app-accent)]"
  }`;
  const content = (
    <>
      <div className="text-[11px] font-medium uppercase tracking-normal app-muted">{label}</div>
      <div className="mt-1 text-base font-semibold app-heading">{value}</div>
    </>
  );

  if (href) {
    return (
      <Link aria-current={active ? "page" : undefined} className={className} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

function summarizeCalendar(items: EarningsCalendarRow[]) {
  return items.reduce(
    (summary, item) => {
      const hour = item.hour?.toLowerCase() ?? "";

      summary.total += 1;
      if (item.signal.label === "Bullish") summary.bullish += 1;
      if (item.signal.label === "Bearish") summary.bearish += 1;
      if (hour.includes("bmo")) summary.beforeOpen += 1;
      if (hour.includes("amc")) summary.afterClose += 1;
      if (item.epsEstimate !== null) summary.withEpsEstimate += 1;

      return summary;
    },
    {
      total: 0,
      bullish: 0,
      bearish: 0,
      beforeOpen: 0,
      afterClose: 0,
      withEpsEstimate: 0,
    }
  );
}

function filterCalendarItems(items: EarningsCalendarRow[], filter: EarningsFilter) {
  if (filter === "all") {
    return items;
  }

  return items.filter((item) => {
    const hour = item.hour?.toLowerCase() ?? "";

    if (filter === "bullish") return item.signal.label === "Bullish";
    if (filter === "bearish") return item.signal.label === "Bearish";
    if (filter === "before-open") return hour.includes("bmo");
    if (filter === "after-close") return hour.includes("amc");

    return true;
  });
}

function earningsFilterHref(date: string, filter: EarningsFilter) {
  const params = new URLSearchParams({ date });

  if (filter !== "all") {
    params.set("filter", filter);
  }

  return `/earnings?${params.toString()}`;
}

function formatFilterLabel(filter: EarningsFilter) {
  if (filter === "bullish") return "Bullish";
  if (filter === "bearish") return "Bearish";
  if (filter === "before-open") return "Before open";
  if (filter === "after-close") return "After close";

  return "All reports";
}

function scoreEarningsSignal(item: Omit<EarningsCalendarRow, "signal">): EarningsSignal {
  let score = 0;
  const reasons: string[] = [];
  const epsSurprisePercent = getEpsSurprisePercent(item);

  if (epsSurprisePercent !== null) {
    if (epsSurprisePercent >= 10) {
      score += 2;
      reasons.push(`EPS beat ${formatPercent(epsSurprisePercent, 1)}`);
    } else if (epsSurprisePercent > 0) {
      score += 1;
      reasons.push(`EPS beat ${formatPercent(epsSurprisePercent, 1)}`);
    } else if (epsSurprisePercent <= -10) {
      score -= 2;
      reasons.push(`EPS miss ${formatPercent(epsSurprisePercent, 1)}`);
    } else if (epsSurprisePercent < 0) {
      score -= 1;
      reasons.push(`EPS miss ${formatPercent(epsSurprisePercent, 1)}`);
    }
  }

  const revenueSurprisePercent = getSurprisePercent(
    item.revenueActual,
    item.revenueEstimate
  );

  if (revenueSurprisePercent !== null) {
    if (revenueSurprisePercent >= 3) {
      score += 2;
      reasons.push(`Revenue beat ${formatPercent(revenueSurprisePercent, 1)}`);
    } else if (revenueSurprisePercent > 0) {
      score += 1;
      reasons.push(`Revenue beat ${formatPercent(revenueSurprisePercent, 1)}`);
    } else if (revenueSurprisePercent <= -3) {
      score -= 2;
      reasons.push(`Revenue miss ${formatPercent(revenueSurprisePercent, 1)}`);
    } else if (revenueSurprisePercent < 0) {
      score -= 1;
      reasons.push(`Revenue miss ${formatPercent(revenueSurprisePercent, 1)}`);
    }
  }

  const consensus = item.analystRatings?.consensus;
  if (consensus === "Strong Buy") {
    score += 2;
    reasons.push("Strong Buy consensus");
  } else if (consensus === "Buy") {
    score += 1;
    reasons.push("Buy consensus");
  } else if (consensus === "Sell") {
    score -= 1;
    reasons.push("Sell consensus");
  } else if (consensus === "Strong Sell") {
    score -= 2;
    reasons.push("Strong Sell consensus");
  }

  const targetUpside = getTargetUpside(item);
  if (targetUpside !== null) {
    if (targetUpside >= 20) {
      score += 2;
      reasons.push(`Target upside ${formatPercent(targetUpside, 1)}`);
    } else if (targetUpside >= 5) {
      score += 1;
      reasons.push(`Target upside ${formatPercent(targetUpside, 1)}`);
    } else if (targetUpside <= -20) {
      score -= 2;
      reasons.push(`Target downside ${formatPercent(targetUpside, 1)}`);
    } else if (targetUpside <= -5) {
      score -= 1;
      reasons.push(`Target downside ${formatPercent(targetUpside, 1)}`);
    }
  }

  const dailyChange = item.quote?.changePercent ?? null;
  if (dailyChange !== null) {
    if (dailyChange >= 5) {
      score += 1;
      reasons.push(`Latest daily move ${formatPercent(dailyChange, 1)} (not necessarily post-earnings)`);
    } else if (dailyChange > 0) {
      score += 1;
      reasons.push(`Latest daily move ${formatPercent(dailyChange, 1)}`);
    } else if (dailyChange <= -5) {
      score -= 1;
      reasons.push(`Latest daily move ${formatPercent(dailyChange, 1)} (not necessarily post-earnings)`);
    } else if (dailyChange < 0) {
      score -= 1;
      reasons.push(`Latest daily move ${formatPercent(dailyChange, 1)}`);
    }
  }

  if (reasons.length === 0) {
    return {
      label: "Insufficient",
      score,
      reasons: ["Need EPS, revenue, analyst, target, or quote data"],
    };
  }

  return {
    label: score >= 2 ? "Bullish" : score <= -2 ? "Bearish" : "Neutral",
    score,
    reasons,
  };
}

function getEpsSurprisePercent(item: EarningsCalendarItem) {
  if (item.epsActual !== null && item.epsEstimate !== null) {
    return getSurprisePercent(item.epsActual, item.epsEstimate);
  }

  return null;
}

function getSurprisePercent(actual: number | null, estimate: number | null) {
  if (actual === null || estimate === null || estimate === 0) {
    return null;
  }

  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

function getTargetUpside(item: {
  analystPriceTargets: AnalystPriceTargetsSnapshot | null;
  quote: QuoteLatest | null;
}) {
  const targetMean = item.analystPriceTargets?.targetMean;
  const price = item.quote?.price;

  if (targetMean === null || targetMean === undefined || !price) {
    return null;
  }

  return ((targetMean - price) / price) * 100;
}

function formatSignedPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  const formatted = formatPercent(value, 1);

  return value > 0 ? `+${formatted}` : formatted;
}

function formatEarningsHour(hour: string | null) {
  const normalized = hour?.toLowerCase();

  if (normalized === "bmo") return "Before open";
  if (normalized === "amc") return "After close";
  if (normalized === "dmh") return "During market";

  return hour || "Unspecified";
}

function formatFiscalPeriod(item: EarningsCalendarItem) {
  if (!item.fiscalYear && !item.fiscalQuarter) {
    return "-";
  }

  return `Q${item.fiscalQuarter ?? "-"} ${item.fiscalYear ?? ""}`.trim();
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSelectedDate(searchParams: Awaited<Props["searchParams"]>) {
  return normalizeDate(getSearchParam(searchParams.date) ?? todayDate());
}

function getSelectedFilter(searchParams: Awaited<Props["searchParams"]>): EarningsFilter {
  const filter = getSearchParam(searchParams.filter);

  if (
    filter === "bullish" ||
    filter === "bearish" ||
    filter === "before-open" ||
    filter === "after-close"
  ) {
    return filter;
  }

  return "all";
}

function getSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? todayDate() : date.toISOString().slice(0, 10);
}

function toPageMessage(message: string | null, itemCount: number): PageMessageValue {
  if (!message) {
    return null;
  }

  return {
    tone: itemCount > 0 ? "notice" : "notice",
    text: message,
  };
}

function formatRefreshMessage(
  calendarMessage: string | null,
  analystRefresh: {
    attempted: number;
    quotesUpdated: number;
    ratingsUpdated: number;
    targetsUpdated: number;
    failed: number;
  }
) {
  const analystMessage =
    analystRefresh.attempted === 0
      ? "No analyst symbols were available to refresh."
      : `Updated quotes for ${analystRefresh.quotesUpdated} symbols, ratings for ${analystRefresh.ratingsUpdated} symbols, and price targets for ${analystRefresh.targetsUpdated} symbols.`;

  return [calendarMessage, analystMessage].filter(Boolean).join(" ");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Could not load earnings calendar.";
}
