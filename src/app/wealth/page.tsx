import Link from "next/link";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  addWealthItemAction,
  removeWealthItemAction,
  saveWealthSettingsAction,
  updateWealthItemAction,
} from "@/app/wealth/actions";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { formatCurrency, formatPercent } from "@/components/dashboard/format";
import { PageMessage } from "@/components/dashboard/PageMessage";
import { WealthAdvicePanel } from "@/components/wealth/WealthAdvicePanel";
import { WealthCharts } from "@/components/wealth/WealthCharts";
import { WealthEntryModal } from "@/components/wealth/WealthEntryModal";
import { WealthTrendChart } from "@/components/wealth/WealthTrendChart";
import { getWealthDashboardForUser } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { WealthItem } from "@/lib/types";
import { getPortalCurrencyOption, portalCurrencyOptions } from "@/lib/types/currency";
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
  const currency = getPortalCurrencyOption(dashboard.settings?.baseCurrency).code;
  const editingItem =
    editItemId !== null
      ? dashboard.items.find((item) => item.id === editItemId) ?? null
      : null;

  return (
    <main className="min-h-screen app-bg">
      <AppHeader
        current="wealth"
        title="Wealth Manager"
        description="Track liquid assets, fixed assets, investments, loans, overdrafts, and debt. View net worth, charts, and personalized guidance."
      />

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
            <PortalPreferencesPanel
              currency={currency}
              editingItem={editingItem}
              monthlyExpensesEstimate={dashboard.settings?.monthlyExpensesEstimate ?? null}
              totalEntries={dashboard.items.length}
            />

            <WealthSnapshot
              currency={currency}
              netWorth={dashboard.netWorth}
              totalAssets={dashboard.totalAssets}
              totalLiabilities={dashboard.totalLiabilities}
              liquidityRatio={dashboard.liquidityRatio}
              debtToAssetRatio={dashboard.debtToAssetRatio}
              monthlyDebtPayments={dashboard.monthlyDebtPayments}
              adviceCount={dashboard.advice.length}
            />

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

            <WealthModuleOverview
              currency={currency}
              liquidAssets={dashboard.liquidAssets}
              fixedAssets={dashboard.fixedAssets}
              investments={dashboard.investments}
              totalAssets={dashboard.totalAssets}
              totalLiabilities={dashboard.totalLiabilities}
              highInterestDebt={dashboard.highInterestDebt}
              monthlyDebtPayments={dashboard.monthlyDebtPayments}
            />

            <WealthTrendChart currency={currency} snapshots={dashboard.snapshots} />

            <WealthCharts
              currency={currency}
              assetSlices={dashboard.assetAllocation}
              liabilitySlices={dashboard.liabilityAllocation}
              netWorth={dashboard.netWorth}
              totalAssets={dashboard.totalAssets}
              totalLiabilities={dashboard.totalLiabilities}
            />

            <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
              <WealthAdvicePanel advice={dashboard.advice} />
              <WealthItemsTable currency={currency} items={dashboard.items} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PortalPreferencesPanel({
  currency,
  editingItem,
  monthlyExpensesEstimate,
  totalEntries,
}: {
  currency: string;
  editingItem: WealthItem | null;
  monthlyExpensesEstimate: number | null;
  totalEntries: number;
}) {
  const selectedCurrency = getPortalCurrencyOption(currency);

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border app-border-soft px-2.5 py-1 text-[11px] font-semibold app-muted">
              Portal currency
            </span>
            <span className="rounded-full border app-border-soft px-2.5 py-1 text-[11px] font-semibold app-heading">
              {selectedCurrency.flag} {selectedCurrency.country} / {selectedCurrency.code}
            </span>
            <span className="rounded-full border app-border-soft px-2.5 py-1 text-[11px] font-semibold app-muted">
              {totalEntries} balance-sheet entr{totalEntries === 1 ? "y" : "ies"}
            </span>
          </div>
          <h2 className="mt-3 text-sm font-semibold app-heading">
            Portal preferences and quick actions
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 app-muted">
            This display currency is used across the Wealth module today and is the portal-level
            preference for future portfolio, market, and planning screens.
          </p>
        </div>

        <WealthEntryModal
          addAction={addWealthItemAction}
          editingItem={editingItem}
          updateAction={updateWealthItemAction}
        />
      </div>

      <form
        action={saveWealthSettingsAction}
        className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
      >
        <label className="block text-xs font-medium app-muted">
          Country / currency
          <select
            name="base_currency"
            defaultValue={currency}
            className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
          >
            {portalCurrencyOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.flag} {option.country} - {option.code} {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium app-muted">
          Monthly expenses estimate
          <input
            name="monthly_expenses_estimate"
            type="number"
            min="0"
            step="1"
            defaultValue={monthlyExpensesEstimate ?? undefined}
            placeholder="4000"
            className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
          />
        </label>

        <button
          type="submit"
          className="h-9 self-end rounded-lg app-primary-button px-4 text-xs font-semibold"
        >
          Save preferences
        </button>
      </form>
    </section>
  );
}

function WealthSnapshot({
  currency,
  netWorth,
  totalAssets,
  totalLiabilities,
  liquidityRatio,
  debtToAssetRatio,
  monthlyDebtPayments,
  adviceCount,
}: {
  currency: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidityRatio: number | null;
  debtToAssetRatio: number | null;
  monthlyDebtPayments: number;
  adviceCount: number;
}) {
  const health = getWealthHealth({
    netWorth,
    totalAssets,
    debtToAssetRatio,
    liquidityRatio,
  });

  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div className="grid gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr] lg:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${health.badgeClass}`}
            >
              {health.label}
            </span>
            <span className="rounded-full border app-border-soft px-2.5 py-1 text-[11px] font-semibold app-muted">
              {adviceCount} active insight{adviceCount === 1 ? "" : "s"}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-normal app-heading sm:text-3xl">
            {formatCurrency(netWorth, false, currency)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 app-muted">{health.summary}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <SnapshotFact
              label="Assets"
              value={formatCurrency(totalAssets, true, currency)}
            />
            <SnapshotFact
              label="Liabilities"
              value={formatCurrency(totalLiabilities, true, currency)}
            />
            <SnapshotFact
              label="Monthly debt"
              value={formatCurrency(monthlyDebtPayments, true, currency)}
            />
          </div>
        </div>

        <div className="rounded-lg border app-subtle p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold app-heading">Financial health</span>
            <span className="app-muted">{health.score}/100</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full app-surface">
            <div
              className={`h-full rounded-full ${health.barClass}`}
              style={{ width: `${health.score}%` }}
            />
          </div>
          <div className="mt-4 space-y-3">
            <HealthRow
              label="Liquidity"
              value={liquidityRatio === null ? "-" : formatPercent(liquidityRatio, 0)}
              ok={liquidityRatio !== null && liquidityRatio >= 10}
            />
            <HealthRow
              label="Debt control"
              value={debtToAssetRatio === null ? "-" : formatPercent(debtToAssetRatio, 0)}
              ok={debtToAssetRatio !== null && debtToAssetRatio < 35}
            />
            <HealthRow label="Net worth" value={netWorth >= 0 ? "Positive" : "Negative"} ok={netWorth >= 0} />
          </div>
        </div>
      </div>
    </section>
  );
}

function WealthModuleOverview({
  currency,
  liquidAssets,
  fixedAssets,
  investments,
  totalAssets,
  totalLiabilities,
  highInterestDebt,
  monthlyDebtPayments,
}: {
  currency: string;
  liquidAssets: number;
  fixedAssets: number;
  investments: number;
  totalAssets: number;
  totalLiabilities: number;
  highInterestDebt: number;
  monthlyDebtPayments: number;
}) {
  return (
    <section className="grid gap-3 lg:grid-cols-3">
      <ModuleCard
        title="Liquidity"
        value={formatCurrency(liquidAssets, true, currency)}
        caption="Cash and near-cash assets available for short-term needs."
        percent={totalAssets > 0 ? (liquidAssets / totalAssets) * 100 : 0}
        tone={liquidAssets > 0 ? "positive" : "neutral"}
      />
      <ModuleCard
        title="Debt"
        value={formatCurrency(totalLiabilities, true, currency)}
        caption={`High-rate debt: ${formatCurrency(highInterestDebt, true, currency)}. Monthly payments: ${formatCurrency(monthlyDebtPayments, true, currency)}.`}
        percent={totalAssets > 0 ? Math.min((totalLiabilities / totalAssets) * 100, 100) : 0}
        tone={totalLiabilities > 0 ? "negative" : "positive"}
      />
      <ModuleCard
        title="Growth assets"
        value={formatCurrency(investments, true, currency)}
        caption={`Fixed assets: ${formatCurrency(fixedAssets, true, currency)}. Investments are the long-term growth engine.`}
        percent={totalAssets > 0 ? (investments / totalAssets) * 100 : 0}
        tone={investments > 0 ? "positive" : "neutral"}
      />
    </section>
  );
}

function SnapshotFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide app-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold app-heading">{value}</p>
    </div>
  );
}

function HealthRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="app-muted">{label}</span>
      <span className={ok ? "font-semibold text-emerald-400" : "font-semibold text-amber-300"}>
        {value}
      </span>
    </div>
  );
}

function ModuleCard({
  title,
  value,
  caption,
  percent,
  tone,
}: {
  title: string;
  value: string;
  caption: string;
  percent: number;
  tone: "positive" | "negative" | "neutral";
}) {
  const barClass =
    tone === "positive" ? "bg-emerald-500" : tone === "negative" ? "bg-rose-500" : "bg-sky-500";

  return (
    <div className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold app-heading">{title}</h2>
          <p className="mt-1 text-lg font-semibold app-heading">{value}</p>
        </div>
        <span className="rounded-full border app-border-soft px-2 py-1 text-[11px] font-semibold app-muted">
          {percent.toFixed(0)}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full app-subtle">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className="mt-3 text-xs leading-5 app-muted">{caption}</p>
    </div>
  );
}

function getWealthHealth({
  netWorth,
  totalAssets,
  debtToAssetRatio,
  liquidityRatio,
}: {
  netWorth: number;
  totalAssets: number;
  debtToAssetRatio: number | null;
  liquidityRatio: number | null;
}) {
  let score = 35;

  if (totalAssets > 0) score += 15;
  if (netWorth > 0) score += 20;
  if (liquidityRatio !== null && liquidityRatio >= 10) score += 15;
  if (liquidityRatio !== null && liquidityRatio >= 20) score += 5;
  if (debtToAssetRatio !== null && debtToAssetRatio < 35) score += 10;
  if (debtToAssetRatio !== null && debtToAssetRatio >= 50) score -= 15;

  const boundedScore = Math.max(0, Math.min(100, score));

  if (boundedScore >= 75) {
    return {
      score: boundedScore,
      label: "Strong",
      summary:
        "Your wealth picture looks resilient. The next focus is optimization: diversification, tax efficiency, protection, and steady contributions.",
      badgeClass: "border-emerald-500/45 bg-emerald-500/10 text-emerald-300",
      barClass: "bg-emerald-500",
    };
  }

  if (boundedScore >= 55) {
    return {
      score: boundedScore,
      label: "Stable",
      summary:
        "Your balance sheet has a workable base. Improve liquidity, reduce expensive debt, and keep growth assets aligned with your time horizon.",
      badgeClass: "border-amber-500/45 bg-amber-500/10 text-amber-300",
      barClass: "bg-amber-500",
    };
  }

  return {
    score: boundedScore,
    label: "Needs attention",
    summary:
      "The current picture needs defensive work first. Build cash reserves, control high-rate debt, and avoid adding risk until the basics are steadier.",
    badgeClass: "border-rose-500/45 bg-rose-500/10 text-rose-300",
    barClass: "bg-rose-500",
  };
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
