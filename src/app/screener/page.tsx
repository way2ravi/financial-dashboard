import Link from "next/link";
import { AppNav } from "@/components/dashboard/AppNav";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { ThemeSwitcher } from "@/components/dashboard/ThemeSwitcher";
import { formatCurrency, formatNumber, formatPercent } from "@/components/dashboard/format";
import { currentUserIsAdmin, getStockScreener } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { ScreenerCategory, ScreenerCategoryResult, ScreenerResult } from "@/lib/types";

type ScreenerPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ScreenerPage({ searchParams }: ScreenerPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const showDataSource = await currentUserIsAdmin(supabase);
  const categories = await getStockScreener();
  const activeTab = getSelectedScreenerTab(params.tab);
  const activeCategory =
    categories.find((category) => category.category === activeTab) ?? categories[0];

  return (
    <main className="min-h-screen app-bg">
      <header className="border-b app-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal app-heading">
              Stock Screener
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 app-muted">
              Find valuation, momentum, activity, and 52-week range ideas from cached ticker data first, with provider feeds as fallback.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppNav current="screener" />
            <ThemeSwitcher />
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <ScreenerTabs categories={categories} activeTab={activeCategory.category} />

        <ScreenerTable category={activeCategory} showDataSource={showDataSource} />
      </div>
    </main>
  );
}

function ScreenerTabs({
  categories,
  activeTab,
}: {
  categories: ScreenerCategoryResult[];
  activeTab: ScreenerCategory;
}) {
  return (
    <nav
      aria-label="Stock screener categories"
      className="overflow-x-auto rounded-lg border app-surface p-1 shadow-sm"
    >
      <div className="flex min-w-max gap-1">
        {categories.map((category) => {
          const isActive = category.category === activeTab;

          return (
            <Link
              key={category.category}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-[var(--app-accent)] text-white"
                  : "app-muted hover:bg-[var(--app-subtle)] hover:text-[var(--app-heading)]"
              }`}
              href={getScreenerTabHref(category.category)}
            >
              {category.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ScreenerTable({
  category,
  showDataSource,
}: {
  category: ScreenerCategoryResult;
  showDataSource: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm" id={category.category}>
      <div className="flex flex-col gap-2 border-b app-border-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">{category.title}</h2>
          <p className="mt-0.5 text-xs leading-5 app-muted">{category.description}</p>
        </div>
        {showDataSource ? (
          <span className="w-fit rounded-full border app-subtle px-2 py-1 text-[11px] font-medium app-muted">
            {category.items[0]?.source ? `Source ${category.items[0].source}` : "Provider feed"}
          </span>
        ) : null}
      </div>

      {category.error ? (
        <div className="m-4 rounded-lg border app-subtle p-3 text-xs app-muted">
          {category.error}
        </div>
      ) : null}

      {category.items.length === 0 && !category.error ? (
        <div className="m-4 rounded-lg border app-subtle p-3 text-xs app-muted">
          No stocks returned for this screen right now.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-xs">
            <thead className="app-subtle">
              <tr className="uppercase tracking-normal app-muted">
                <th className="border-b app-border-soft px-3 py-2 font-semibold">Symbol</th>
                <th className="border-b app-border-soft px-3 py-2 font-semibold">Company</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Price</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Change</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Volume</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Market cap</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">P/E</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">52W range</th>
              </tr>
            </thead>
            <tbody>
              {category.items.slice(0, 20).map((item) => (
                <ScreenerRow key={`${category.category}-${item.symbol}`} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ScreenerRow({ item }: { item: ScreenerResult }) {
  return (
    <tr className="app-muted transition hover:bg-[var(--app-surface-muted)]">
      <td className="border-b app-border-soft px-3 py-2.5">
        <Link
          className="font-semibold app-heading hover:underline"
          href={`/dashboard?symbol=${item.symbol}&autoload=1`}
        >
          {item.symbol}
        </Link>
      </td>
      <td className="max-w-[280px] truncate border-b app-border-soft px-3 py-2.5">
        {item.name ?? "-"}
      </td>
      <td className="border-b app-border-soft px-3 py-2.5 text-right font-medium app-heading">
        {formatCurrency(item.price)}
      </td>
      <td className="border-b app-border-soft px-3 py-2.5 text-right">
        <span className={getChangeClass(item.changePercent)}>
          {formatSignedPercent(item.changePercent)}
        </span>
      </td>
      <td className="border-b app-border-soft px-3 py-2.5 text-right">
        {formatNumber(item.volume, 0)}
      </td>
      <td className="border-b app-border-soft px-3 py-2.5 text-right">
        {formatCurrency(item.marketCap, true)}
      </td>
      <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatNumber(item.pe)}</td>
      <td className="border-b app-border-soft px-3 py-2.5 text-right">{formatRange(item)}</td>
    </tr>
  );
}

function formatRange(item: ScreenerResult) {
  if (item.yearLow === null && item.yearHigh === null) {
    return "-";
  }

  return `${formatCurrency(item.yearLow)} - ${formatCurrency(item.yearHigh)}`;
}

function formatSignedPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  const formatted = formatPercent(value, 1);

  return value > 0 ? `+${formatted}` : formatted;
}

function getChangeClass(value: number | null) {
  if (value === null) {
    return "";
  }

  return value >= 0 ? "app-positive" : "app-negative";
}

function getSelectedScreenerTab(tab: string | string[] | undefined): ScreenerCategory {
  const value = Array.isArray(tab) ? tab[0] : tab;

  if (isScreenerCategory(value)) {
    return value;
  }

  return "undervalued";
}

function isScreenerCategory(value: string | undefined): value is ScreenerCategory {
  return (
    value === "undervalued" ||
    value === "overvalued" ||
    value === "weekHigh" ||
    value === "weekLow" ||
    value === "mostActive" ||
    value === "topGainers" ||
    value === "topLosers"
  );
}

function getScreenerTabHref(category: ScreenerCategory) {
  if (category === "undervalued") {
    return "/screener";
  }

  return `/screener?tab=${category}`;
}
