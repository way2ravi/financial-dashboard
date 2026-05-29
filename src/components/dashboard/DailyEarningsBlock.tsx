import Link from "next/link";
import { getDailyEarningsCalendar } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { EarningsCalendarItem } from "@/lib/types";
import { formatNumber } from "./format";

type Props = {
  currentSymbol: string;
};

export async function DailyEarningsBlock({ currentSymbol }: Props) {
  const date = todayDate();
  const supabase = await createClient();
  const { items } = await getDailyEarningsCalendar(supabase, date).catch(() => ({
    items: [] as EarningsCalendarItem[],
  }));
  const visibleItems = prioritizeCurrentSymbol(items, currentSymbol).slice(0, 6);
  const currentReportsToday = items.some((item) => item.symbol === currentSymbol);

  return (
    <section className="rounded-lg border app-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold app-heading">Today Earnings</h2>
          <p className="mt-1 text-xs app-muted">
            {items.length > 0
              ? `${formatNumber(items.length, 0)} reports on ${date}`
              : `No cached reports for ${date}`}
          </p>
        </div>
        <Link
          href={`/earnings?date=${date}`}
          className="rounded-lg border app-secondary-button px-2 py-1 text-xs font-semibold"
        >
          View
        </Link>
      </div>

      {currentReportsToday ? (
        <div className="mt-3 rounded-lg border app-subtle p-3 text-xs font-semibold app-positive">
          {currentSymbol} reports today.
        </div>
      ) : null}

      {visibleItems.length === 0 ? (
        <Link
          href={`/earnings?date=${date}&refresh=1`}
          className="mt-4 block rounded-lg border app-subtle p-3 text-sm font-semibold app-heading hover:bg-[var(--app-surface)]"
        >
          Load today&apos;s earnings
        </Link>
      ) : (
        <div className="mt-4 space-y-2">
          {visibleItems.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard?symbol=${item.symbol}&autoload=1`}
              className={`block rounded-lg border p-3 text-sm ${
                item.symbol === currentSymbol
                  ? "app-surface ring-2 ring-[var(--app-primary)]"
                  : "app-subtle hover:bg-[var(--app-surface)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold app-heading">{item.symbol}</span>
                <span className="text-xs app-muted">{formatEarningsHour(item.hour)}</span>
              </div>
              <div className="mt-1 text-xs app-muted">
                {formatFiscalPeriod(item)} - EPS est. {formatNumber(item.epsEstimate)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function prioritizeCurrentSymbol(items: EarningsCalendarItem[], currentSymbol: string) {
  return [...items].sort((a, b) => {
    if (a.symbol === currentSymbol) return -1;
    if (b.symbol === currentSymbol) return 1;

    return a.symbol.localeCompare(b.symbol);
  });
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
    return "Fiscal period unknown";
  }

  return `Q${item.fiscalQuarter ?? "-"} ${item.fiscalYear ?? ""}`.trim();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
