import Link from "next/link";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  addWealthItemAction,
  removeWealthItemAction,
  saveWealthSettingsAction,
  updateWealthItemAction,
} from "@/app/wealth/actions";
import { AppNav } from "@/components/dashboard/AppNav";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { formatCurrency, formatPercent } from "@/components/dashboard/format";
import { PageMessage } from "@/components/dashboard/PageMessage";
import { ThemeSwitcher } from "@/components/dashboard/ThemeSwitcher";
import { WealthAdvicePanel } from "@/components/wealth/WealthAdvicePanel";
import { WealthCharts } from "@/components/wealth/WealthCharts";
import { WealthItemForm } from "@/components/wealth/WealthItemForm";
import { getWealthDashboardForUser } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { WealthItem } from "@/lib/types";
import {
  getWealthCategoryLabel,
  getWealthSubcategoryLabel,
} from "@/lib/types/wealth";

type Props = {
  searchParams: Promise<{
    edit?: string | string[];
    error?: string | string[];
    notice?: string | string[];
  }>;
};

export default async function WealthPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const message = getPageMessage(resolvedSearchParams);
  const editItemId = getEditItemId(resolvedSearchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { dashboard, setupError } = await loadWealthDashboard(supabase, user);
  const currency = dashboard.settings?.baseCurrency ?? "USD";
  const editingItem =
    editItemId !== null
      ? dashboard.items.find((item) => item.id === editItemId) ?? null
      : null;

  return (
    <main className="min-h-screen app-bg">
      <header className="border-b app-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal app-heading">
              Wealth Manager
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 app-muted">
              Track liquid assets, fixed assets, investments, loans, overdrafts, and debt. View net
              worth, charts, and personalized guidance.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppNav current="wealth" />
            <ThemeSwitcher />
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <PageMessage message={message} />

        {!user ? (
          <section className="rounded-lg border app-surface p-6 shadow-sm">
            <h2 className="text-sm font-semibold app-heading">Sign in to manage your net worth</h2>
            <p className="mt-2 text-xs app-muted">
              Your wealth data is private to your account and protected by Supabase row-level
              security.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-lg app-primary-button px-4 py-2 text-xs font-semibold"
            >
              Sign in
            </Link>
          </section>
        ) : setupError ? (
          <section className="rounded-lg border app-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold app-heading">Database setup needed</h2>
            <p className="mt-2 text-xs app-muted">
              Run the wealth module SQL in your Supabase project before adding entries.
            </p>
            <div className="mt-4 rounded-lg border app-subtle p-3 font-mono text-xs app-muted">
              src/lib/supabase/wealth.sql
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Net worth"
                value={formatCurrency(dashboard.netWorth, false, currency)}
                tone={dashboard.netWorth >= 0 ? "positive" : "negative"}
              />
              <Metric
                label="Total assets"
                value={formatCurrency(dashboard.totalAssets, false, currency)}
              />
              <Metric
                label="Total liabilities"
                value={formatCurrency(dashboard.totalLiabilities, false, currency)}
                tone="negative"
              />
              <Metric
                label="Debt / assets"
                value={
                  dashboard.debtToAssetRatio === null
                    ? "-"
                    : formatPercent(dashboard.debtToAssetRatio, 0)
                }
              />
            </section>

            <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Liquid"
                value={formatCurrency(dashboard.liquidAssets, false, currency)}
              />
              <Metric
                label="Fixed"
                value={formatCurrency(dashboard.fixedAssets, false, currency)}
              />
              <Metric
                label="Investments"
                value={formatCurrency(dashboard.investments, false, currency)}
              />
              <Metric
                label="Liquidity ratio"
                value={
                  dashboard.liquidityRatio === null
                    ? "-"
                    : formatPercent(dashboard.liquidityRatio, 0)
                }
              />
            </section>

            <WealthCharts
              currency={currency}
              assetSlices={dashboard.assetAllocation}
              liabilitySlices={dashboard.liabilityAllocation}
              netWorth={dashboard.netWorth}
              totalAssets={dashboard.totalAssets}
              totalLiabilities={dashboard.totalLiabilities}
            />

            <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
              <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
                <section className="rounded-lg border app-surface p-4 shadow-sm">
                  <h2 className="text-sm font-semibold app-heading">Settings</h2>
                  <p className="mt-1 text-xs app-muted">
                    Used for charts and emergency-fund guidance.
                  </p>
                  <form action={saveWealthSettingsAction} className="mt-3 space-y-2">
                    <label className="block text-xs font-medium app-muted">
                      Display currency
                      <select
                        name="base_currency"
                        defaultValue={dashboard.settings?.baseCurrency ?? "USD"}
                        className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                        <option value="INR">INR</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium app-muted">
                      Monthly expenses (estimate)
                      <input
                        name="monthly_expenses_estimate"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={
                          dashboard.settings?.monthlyExpensesEstimate ?? undefined
                        }
                        placeholder="4000"
                        className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
                      />
                    </label>
                    <button
                      type="submit"
                      className="h-9 w-full rounded-lg app-primary-button px-4 text-xs font-semibold"
                    >
                      Save settings
                    </button>
                  </form>
                </section>

                <section className="rounded-lg border app-surface p-4 shadow-sm">
                  <h2 className="text-sm font-semibold app-heading">
                    {editingItem ? "Edit entry" : "Add entry"}
                  </h2>
                  <div className="mt-3">
                    <WealthItemForm
                      key={editingItem?.id ?? "new"}
                      action={editingItem ? updateWealthItemAction : addWealthItemAction}
                      submitLabel={editingItem ? "Update entry" : "Add entry"}
                      item={editingItem}
                    />
                  </div>
                  {editingItem ? (
                    <Link
                      href="/wealth"
                      className="mt-2 block text-center text-xs font-semibold app-muted hover:app-heading"
                    >
                      Cancel edit
                    </Link>
                  ) : null}
                </section>
              </aside>

              <div className="min-w-0 space-y-3">
                <WealthAdvicePanel advice={dashboard.advice} />
                <WealthItemsTable
                  currency={currency}
                  items={dashboard.items}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function WealthItemsTable({
  currency,
  items,
}: {
  currency: string;
  items: WealthItem[];
}) {
  const assets = items.filter((item) => item.recordType === "asset");
  const liabilities = items.filter((item) => item.recordType === "liability");

  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div className="border-b app-border-soft px-4 py-3">
        <h2 className="text-sm font-semibold app-heading">Your balance sheet</h2>
        <p className="mt-1 text-xs app-muted">
          Stock portfolios in{" "}
          <Link href="/portfolio" className="font-semibold underline">
            Portfolio
          </Link>{" "}
          can be added here as investment entries for a full net-worth view.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="m-4 rounded-lg border app-subtle p-3 text-xs app-muted">
          No entries yet. Add cash, property, investments, and debts to build your dashboard.
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <ItemGroup title="Assets" items={assets} currency={currency} />
          <ItemGroup title="Liabilities" items={liabilities} currency={currency} />
        </div>
      )}
    </section>
  );
}

function ItemGroup({
  title,
  items,
  currency,
}: {
  title: string;
  items: WealthItem[];
  currency: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide app-muted">{title}</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-subtle">
            <tr className="uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Name</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Category</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Value</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Rate</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Payment</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">As of</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="app-muted transition hover:bg-[var(--app-surface-muted)]"
              >
                <td className="border-b app-border-soft px-3 py-2.5">
                  <div className="font-semibold app-heading">{item.name}</div>
                  <div className="text-[11px] app-muted">
                    {getWealthSubcategoryLabel(item.category, item.subcategory)}
                  </div>
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  {getWealthCategoryLabel(item.category)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right font-medium app-heading">
                  {formatCurrency(item.currentValue, false, currency)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {item.interestRate === null ? "-" : formatPercent(item.interestRate)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {item.monthlyPayment === null
                    ? "-"
                    : formatCurrency(item.monthlyPayment, false, currency)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">{item.asOfDate}</td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/wealth?edit=${item.id}`}
                      className="rounded-md border px-2 py-1 text-[11px] font-semibold app-heading"
                    >
                      Edit
                    </Link>
                    <form action={removeWealthItemAction}>
                      <input type="hidden" name="item_id" value={item.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-rose-500/40 px-2 py-1 text-[11px] font-semibold text-rose-400"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-400"
      : tone === "negative"
        ? "text-rose-400"
        : "app-heading";

  return (
    <div className="rounded-lg border app-surface px-3 py-2.5 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide app-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

async function loadWealthDashboard(supabase: SupabaseClient<Database>, user: User | null) {
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

function getEditItemId(searchParams: Awaited<Props["searchParams"]>) {
  const raw = Array.isArray(searchParams.edit) ? searchParams.edit[0] : searchParams.edit;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPageMessage(searchParams: Awaited<Props["searchParams"]>) {
  const error = getSearchParam(searchParams.error);
  const notice = getSearchParam(searchParams.notice);

  if (error) {
    return { tone: "error" as const, text: error };
  }

  if (notice) {
    return { tone: "notice" as const, text: notice };
  }

  return null;
}

function getSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
