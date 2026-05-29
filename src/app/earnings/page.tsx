import Link from "next/link";
import { AppNav } from "@/components/dashboard/AppNav";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { PageMessage, type PageMessageValue } from "@/components/dashboard/PageMessage";
import { ThemeSwitcher } from "@/components/dashboard/ThemeSwitcher";
import { formatCurrency, formatNumber } from "@/components/dashboard/format";
import {
  getDailyEarningsCalendar,
  refreshEarningsCalendarAnalystData,
  refreshDailyEarningsCalendar,
} from "@/lib/services";
import {
  findTickersBySymbols,
  getLatestAnalystPriceTargets,
  getLatestAnalystRatings,
} from "@/lib/repositories";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AnalystPriceTargetsSnapshot,
  AnalystRatingsSnapshot,
  EarningsCalendarItem,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Props = {
  searchParams: Promise<{
    date?: string | string[];
    refresh?: string | string[];
  }>;
};

export default async function EarningsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const selectedDate = getSelectedDate(resolvedSearchParams);
  const { items, message, setupError } = await loadEarningsCalendar(
    selectedDate,
    getSearchParam(resolvedSearchParams.refresh) === "1"
  );
  const summary = summarizeCalendar(items);

  return (
    <main className="min-h-screen app-bg">
      <header className="border-b app-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal app-heading">
              Daily Earnings
            </h1>
            <p className="mt-1 max-w-2xl text-sm app-muted">
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

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border app-surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold app-heading">Earnings calendar</h2>
              <p className="mt-1 text-sm app-muted">
                Cached first, refreshed automatically when a date has no stored rows.
              </p>
            </div>

            <form action="/earnings" className="grid gap-2 sm:grid-cols-[180px_auto]">
              <input
                name="date"
                type="date"
                defaultValue={selectedDate}
                className="h-10 rounded-lg border app-input px-3 text-sm outline-none"
              />
              <input name="refresh" type="hidden" value="1" />
              <button
                type="submit"
                className="h-10 rounded-lg app-primary-button px-4 text-sm font-semibold"
              >
                Load date
              </button>
            </form>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Reports" value={formatNumber(summary.total, 0)} />
            <Metric label="Before open" value={formatNumber(summary.beforeOpen, 0)} />
            <Metric label="After close" value={formatNumber(summary.afterClose, 0)} />
            <Metric label="With EPS estimate" value={formatNumber(summary.withEpsEstimate, 0)} />
          </div>
        </section>

        <PageMessage message={message} />

        {setupError ? (
          <section className="rounded-lg border app-surface p-5">
            <h2 className="text-base font-semibold app-heading">
              Earnings calendar database setup needed
            </h2>
            <p className="mt-2 text-sm app-muted">
              Run the latest Supabase schema and RLS SQL so the earnings calendar table exists.
            </p>
          </section>
        ) : (
          <EarningsCalendarTable date={selectedDate} items={items} />
        )}
      </div>
    </main>
  );
}

type EarningsCalendarRow = EarningsCalendarItem & {
  analystRatings: AnalystRatingsSnapshot | null;
  analystPriceTargets: AnalystPriceTargetsSnapshot | null;
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
        return {
          ...item,
          analystRatings: null,
          analystPriceTargets: null,
        };
      }

      const [analystRatings, analystPriceTargets] = await Promise.all([
        getLatestAnalystRatings(supabase, ticker.id),
        getLatestAnalystPriceTargets(supabase, ticker.id),
      ]);

      return {
        ...item,
        analystRatings,
        analystPriceTargets,
      };
    })
  );

  return analystRows;
}

function EarningsCalendarTable({
  date,
  items,
}: {
  date: string;
  items: EarningsCalendarRow[];
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-lg border app-surface p-5">
        <h2 className="text-base font-semibold app-heading">No reports found</h2>
        <p className="mt-2 text-sm app-muted">
          No earnings reports are cached for {date}. Try another trading date or refresh again
          after provider limits reset.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border app-surface p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold app-heading">Reports on {date}</h2>
          <p className="mt-1 text-sm app-muted">
            Select a symbol to open the full dashboard and load company-level data.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft pb-2 font-medium">Symbol</th>
              <th className="border-b app-border-soft pb-2 font-medium">Timing</th>
              <th className="border-b app-border-soft pb-2 font-medium">Fiscal period</th>
              <th className="border-b app-border-soft pb-2 font-medium">Rating</th>
              <th className="border-b app-border-soft pb-2 font-medium">Analysts</th>
              <th className="border-b app-border-soft pb-2 font-medium">Target mean</th>
              <th className="border-b app-border-soft pb-2 font-medium">Target range</th>
              <th className="border-b app-border-soft pb-2 font-medium">EPS actual</th>
              <th className="border-b app-border-soft pb-2 font-medium">EPS estimate</th>
              <th className="border-b app-border-soft pb-2 font-medium">Revenue actual</th>
              <th className="border-b app-border-soft pb-2 font-medium">Revenue estimate</th>
              <th className="border-b app-border-soft pb-2 font-medium">Fetched</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="app-muted">
                <td className="border-b app-border-soft py-3">
                  <Link
                    href={`/dashboard?symbol=${item.symbol}&autoload=1`}
                    className="font-semibold app-heading hover:underline"
                  >
                    {item.symbol}
                  </Link>
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatEarningsHour(item.hour)}
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatFiscalPeriod(item)}
                </td>
                <td className="border-b app-border-soft py-3">
                  <RatingPill value={item.analystRatings?.consensus ?? null} />
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatNumber(item.analystRatings?.analystCount, 0)}
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatCurrency(item.analystPriceTargets?.targetMean)}
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatTargetRange(item.analystPriceTargets)}
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatNumber(item.epsActual)}
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatNumber(item.epsEstimate)}
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatCurrency(item.revenueActual, true)}
                </td>
                <td className="border-b app-border-soft py-3">
                  {formatCurrency(item.revenueEstimate, true)}
                </td>
                <td className="border-b app-border-soft py-3">
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border app-subtle px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-normal app-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold app-heading">{value}</div>
    </div>
  );
}

function summarizeCalendar(items: EarningsCalendarItem[]) {
  return items.reduce(
    (summary, item) => {
      const hour = item.hour?.toLowerCase() ?? "";

      summary.total += 1;
      if (hour.includes("bmo")) summary.beforeOpen += 1;
      if (hour.includes("amc")) summary.afterClose += 1;
      if (item.epsEstimate !== null) summary.withEpsEstimate += 1;

      return summary;
    },
    {
      total: 0,
      beforeOpen: 0,
      afterClose: 0,
      withEpsEstimate: 0,
    }
  );
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
    ratingsUpdated: number;
    targetsUpdated: number;
    failed: number;
  }
) {
  const analystMessage =
    analystRefresh.attempted === 0
      ? "No analyst symbols were available to refresh."
      : `Updated ratings for ${analystRefresh.ratingsUpdated} symbols and price targets for ${analystRefresh.targetsUpdated} symbols.`;

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
