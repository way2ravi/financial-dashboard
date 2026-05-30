import Link from "next/link";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  addPortfolioTransactionAction,
  createPortfolioAction,
  removePortfolioTransactionAction,
} from "@/app/portfolio/actions";
import { AppNav } from "@/components/dashboard/AppNav";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { PageMessage, type PageMessageValue } from "@/components/dashboard/PageMessage";
import { ThemeSwitcher } from "@/components/dashboard/ThemeSwitcher";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/components/dashboard/format";
import { getPortfolioSummariesForUser } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { PortfolioSummary } from "@/lib/types";

type Props = {
  searchParams: Promise<{
    error?: string | string[];
    notice?: string | string[];
    portfolio?: string | string[];
  }>;
};

export default async function PortfolioPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const selectedPortfolioId = getSelectedPortfolioId(resolvedSearchParams);
  const message = getPageMessage(resolvedSearchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { summaries, setupError } = await loadPortfolioSummaries(supabase, user);
  const selected =
    summaries.find((summary) => summary.portfolio.id === selectedPortfolioId) ??
    summaries[0] ??
    null;

  return (
    <main className="min-h-screen app-bg">
      <header className="border-b app-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal app-heading">
              Portfolio
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 app-muted">
              Create portfolios, record buy and sell trades, and track holdings performance.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppNav current="portfolio" />
            <ThemeSwitcher />
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
        <aside className="min-w-0 self-start rounded-lg border app-surface p-4 shadow-sm lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold app-heading">Your Portfolios</h2>
          <p className="mt-1 text-sm app-muted">
            {user ? `${summaries.length} portfolios` : "Sign in to create portfolios"}
          </p>

          {!user ? (
            <Link
              href="/login"
              className="mt-3 block rounded-lg border app-subtle p-3 text-xs font-semibold app-heading"
            >
              Sign in to start tracking
            </Link>
          ) : setupError ? (
            <div className="mt-3 rounded-lg border app-subtle p-3 text-xs app-muted">
              Database setup is needed before you can create portfolios.
            </div>
          ) : (
            <>
              <form action={createPortfolioAction} className="mt-3 space-y-2">
                <label className="block text-xs font-medium app-muted">
                  Portfolio name
                  <input
                    name="name"
                    required
                    placeholder="Long-term holdings"
                    className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
                  />
                </label>
                <label className="block text-xs font-medium app-muted">
                  Description
                  <input
                    name="description"
                    placeholder="Optional"
                    className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
                  />
                </label>
                <label className="block text-xs font-medium app-muted">
                  Display currency
                  <select
                    name="base_currency"
                    defaultValue="USD"
                    className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
                  >
                    <option value="USD">USD - US dollar</option>
                    <option value="GBP">GBP - British pound</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="INR">INR - Indian rupee</option>
                    <option value="CAD">CAD - Canadian dollar</option>
                    <option value="AUD">AUD - Australian dollar</option>
                  </select>
                </label>
                <button
                  type="submit"
                  className="h-9 w-full rounded-lg app-primary-button px-4 text-xs font-semibold"
                >
                  Create portfolio
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {summaries.map((summary) => (
                  <Link
                    key={summary.portfolio.id}
                    href={`/portfolio?portfolio=${summary.portfolio.id}`}
                    className={`block rounded-lg border p-2.5 ${
                      selected?.portfolio.id === summary.portfolio.id
                        ? "app-surface ring-2 ring-[var(--app-primary)]"
                        : "app-subtle hover:bg-[var(--app-surface)]"
                    }`}
                  >
                    <div className="text-sm font-semibold app-heading">{summary.portfolio.name}</div>
                    <div className="mt-1 text-xs app-muted">
                      {summary.holdings.length} holdings - {formatCurrency(summary.marketValue, false, summary.portfolio.baseCurrency)}
                    </div>
                    <div className="mt-1 text-[11px] app-muted">
                      Currency: {summary.portfolio.baseCurrency}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </aside>

        {setupError ? (
          <section className="rounded-lg border app-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold app-heading">
              Portfolio database setup needed
            </h2>
            <p className="mt-2 text-xs app-muted">
              Run the updated Supabase SQL files so portfolios and portfolio transactions exist.
            </p>
            <div className="mt-4 rounded-lg border app-subtle p-3 font-mono text-xs app-muted">
              src/lib/supabase/schema.sql
              <br />
              src/lib/supabase/rls.sql
            </div>
          </section>
        ) : selected ? (
          <PortfolioDetail summary={selected} message={message} />
        ) : (
          <div className="min-w-0 space-y-4">
            <PageMessage message={message} />
            <section className="rounded-lg border app-surface p-4 shadow-sm">
              <h2 className="text-sm font-semibold app-heading">No portfolio yet</h2>
              <p className="mt-2 text-xs app-muted">
                Create your first portfolio to start tracking buys, sells, holdings, and gains.
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

async function loadPortfolioSummaries(
  supabase: SupabaseClient<Database>,
  user: User | null
) {
  try {
    return {
      summaries: await getPortfolioSummariesForUser(supabase, user),
      setupError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (
      message.includes("portfolios") ||
      message.includes("portfolio_transactions")
    ) {
      return { summaries: [], setupError: true };
    }

    throw error;
  }
}

function getSelectedPortfolioId(searchParams: Awaited<Props["searchParams"]>) {
  const rawPortfolio = Array.isArray(searchParams.portfolio)
    ? searchParams.portfolio[0]
    : searchParams.portfolio;
  const parsed = Number(rawPortfolio);

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

function PortfolioDetail({
  summary,
  message,
}: {
  summary: PortfolioSummary;
  message: PageMessageValue;
}) {
  const currency = summary.portfolio.baseCurrency;

  return (
    <div className="min-w-0 space-y-3">
      <PageMessage message={message} />
      <section className="rounded-lg border app-surface p-4 shadow-sm">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold app-heading">{summary.portfolio.name}</h2>
            <p className="mt-1 text-xs leading-5 app-muted">
              {summary.portfolio.description ||
                "Performance based on recorded trades and cached quotes."}
            </p>
          </div>
          <AddTransactionForm currency={currency} portfolioId={summary.portfolio.id} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Market value" value={formatCurrency(summary.marketValue, false, currency)} />
          <Metric label="Invested" value={formatCurrency(summary.investedCapital, false, currency)} />
          <Metric
            label="Realized gain"
            value={formatCurrency(summary.realizedGain, false, currency)}
            tone={summary.realizedGain >= 0 ? "positive" : "negative"}
          />
          <Metric
            label="Unrealized gain"
            value={formatCurrency(summary.unrealizedGain, false, currency)}
            tone={summary.unrealizedGain >= 0 ? "positive" : "negative"}
          />
          <Metric
            label="Total return"
            value={`${formatCurrency(summary.totalGain, false, currency)} (${formatPercent(summary.totalGainPercent)})`}
            tone={summary.totalGain >= 0 ? "positive" : "negative"}
          />
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <Metric label="Currency" value={currency} />
          <Metric label="Open positions" value={formatNumber(summary.openPositions, 0)} />
          <Metric label="Closed positions" value={formatNumber(summary.closedPositions, 0)} />
          <Metric label="Trades" value={formatNumber(summary.tradeCount, 0)} />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
        <div className="border-b app-border-soft px-4 py-3">
          <h2 className="text-sm font-semibold app-heading">Holdings</h2>
        </div>
        {summary.holdings.length === 0 ? (
          <div className="m-4 rounded-lg border app-subtle p-3 text-xs app-muted">
            No open holdings yet. Add a buy transaction to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-separate border-spacing-0 text-left text-xs">
              <thead className="app-subtle">
                <tr className="uppercase tracking-normal app-muted">
                  <th className="border-b app-border-soft px-3 py-2 font-semibold">Symbol</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Quantity</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Avg cost</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Cost basis</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Last price</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Value</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Allocation</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Unrealized</th>
                </tr>
              </thead>
              <tbody>
                {summary.holdings.map((holding) => (
                  <tr key={holding.ticker.id} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                    <td className="border-b app-border-soft px-3 py-2.5 font-semibold app-heading">
                      {holding.ticker.symbol}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatNumber(holding.quantity, 4)}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatCurrency(holding.averageCost, false, currency)}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatCurrency(holding.costBasis, false, currency)}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatCurrency(holding.marketPrice, false, currency)}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatCurrency(holding.marketValue, false, currency)}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatPercent(holding.allocationPercent)}
                    </td>
                    <td
                      className={`border-b app-border-soft px-3 py-2.5 text-right ${
                        (holding.unrealizedGain ?? 0) >= 0
                          ? "app-positive"
                          : "app-negative"
                      }`}
                    >
                      {formatCurrency(holding.unrealizedGain, false, currency)} ({formatPercent(holding.unrealizedGainPercent)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border app-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold app-heading">Buy / Sell History</h2>
        {summary.transactions.length === 0 ? (
          <div className="mt-3 rounded-lg border app-subtle p-3 text-xs app-muted">
            No trades recorded yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {summary.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-3 rounded-lg border app-subtle p-2.5 text-xs sm:grid-cols-[90px_1fr_auto]"
              >
                <div className={transaction.transactionType === "buy" ? "app-positive" : "app-negative"}>
                  {transaction.transactionType.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold app-heading">
                    {transaction.quantity} {transaction.ticker.symbol} @ {formatCurrency(transaction.price, false, currency)}
                  </div>
                  <div className="text-xs app-muted">
                    {transaction.tradeDate} - Fees {formatCurrency(transaction.fees, false, currency)}
                    {transaction.notes ? ` - ${transaction.notes}` : ""}
                  </div>
                </div>
                <form action={removePortfolioTransactionAction}>
                  <input name="transaction_id" type="hidden" value={transaction.id} />
                  <button
                    type="submit"
                    className="rounded-lg border app-secondary-button px-2 py-1 text-xs font-semibold"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AddTransactionForm({
  currency,
  portfolioId,
}: {
  currency: string;
  portfolioId: number;
}) {
  return (
    <form
      action={addPortfolioTransactionAction}
      className="grid gap-2 rounded-lg border app-subtle p-3 sm:grid-cols-2 lg:min-w-[460px]"
    >
      <input name="portfolio_id" type="hidden" value={portfolioId} />
      <select
        name="transaction_type"
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      >
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>
      <input
        name="symbol"
        placeholder="Symbol"
        required
        className="h-9 rounded-lg border app-input px-3 text-xs uppercase outline-none"
      />
      <input
        name="trade_date"
        type="date"
        required
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="quantity"
        type="number"
        step="0.0001"
        min="0"
        placeholder="Quantity"
        required
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="price"
        type="number"
        step="0.01"
        min="0"
        placeholder={`Price (${currency})`}
        required
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="fees"
        type="number"
        step="0.01"
        min="0"
        placeholder={`Fees (${currency})`}
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="notes"
        placeholder="Notes"
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <button
        type="submit"
        className="h-9 rounded-lg app-primary-button px-4 text-xs font-semibold sm:col-span-2"
      >
        Add trade
      </button>
    </form>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "app-positive"
      : tone === "negative"
        ? "app-negative"
        : "app-heading";

  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-normal app-muted">{label}</div>
      <div className={`mt-1 text-base font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
