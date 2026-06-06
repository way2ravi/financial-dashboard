import Link from "next/link";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  addPortfolioTransactionAction,
  createPortfolioAction,
  removePortfolioAction,
  removePortfolioTransactionAction,
  updatePortfolioAction,
  updatePortfolioTransactionAction,
} from "@/app/portfolio/actions";
import { PortfolioScenarioForm } from "@/app/portfolio/PortfolioScenarioForm";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { PageMessage, type PageMessageValue } from "@/components/dashboard/PageMessage";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/components/dashboard/format";
import { getPortfolioSummariesForUser } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import type { PortfolioAssetClass, PortfolioSummary, PortfolioTransaction } from "@/lib/types";

type Props = {
  searchParams: Promise<{
    error?: string | string[];
    edit_transaction?: string | string[];
    edit_portfolio?: string | string[];
    history_asset?: string | string[];
    notice?: string | string[];
    portfolio?: string | string[];
  }>;
};

export default async function PortfolioPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const selectedPortfolioId = getSelectedPortfolioId(resolvedSearchParams);
  const editPortfolioId = getEditPortfolioId(resolvedSearchParams);
  const editTransactionId = getEditTransactionId(resolvedSearchParams);
  const historyAssetKey = getHistoryAssetKey(resolvedSearchParams);
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
      <AppHeader
        current="portfolio"
        title="Portfolio"
        description="Create portfolios for stocks, crypto, commodities, real estate, or other holdings and track them in one ledger."
      />

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
                  Asset class
                  <select
                    name="asset_class"
                    defaultValue="stocks"
                    className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
                  >
                    {portfolioAssetClassOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
                {summaries.map((summary) =>
                  editPortfolioId === summary.portfolio.id ? (
                    <EditPortfolioForm
                      key={summary.portfolio.id}
                      portfolio={summary.portfolio}
                    />
                  ) : (
                    <PortfolioListItem
                      key={summary.portfolio.id}
                      selected={selected?.portfolio.id === summary.portfolio.id}
                      summary={summary}
                    />
                  )
                )}
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
          <PortfolioDetail
            editTransactionId={editTransactionId}
            historyAssetKey={historyAssetKey}
            message={message}
            summary={selected}
          />
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

function getEditPortfolioId(searchParams: Awaited<Props["searchParams"]>) {
  const rawPortfolio = Array.isArray(searchParams.edit_portfolio)
    ? searchParams.edit_portfolio[0]
    : searchParams.edit_portfolio;
  const parsed = Number(rawPortfolio);

  return Number.isFinite(parsed) ? parsed : null;
}

function getEditTransactionId(searchParams: Awaited<Props["searchParams"]>) {
  const rawTransaction = Array.isArray(searchParams.edit_transaction)
    ? searchParams.edit_transaction[0]
    : searchParams.edit_transaction;
  const parsed = Number(rawTransaction);

  return Number.isFinite(parsed) ? parsed : null;
}

function getHistoryAssetKey(searchParams: Awaited<Props["searchParams"]>) {
  return getSearchParam(searchParams.history_asset) ?? null;
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

function PortfolioListItem({
  selected,
  summary,
}: {
  selected: boolean;
  summary: PortfolioSummary;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        selected
          ? "app-surface ring-2 ring-[var(--app-primary)]"
          : "app-subtle hover:bg-[var(--app-surface)]"
      }`}
    >
      <Link href={`/portfolio?portfolio=${summary.portfolio.id}`} className="block">
        <div className="text-sm font-semibold app-heading">{summary.portfolio.name}</div>
        <div className="mt-1 text-xs app-muted">
          {summary.holdings.length} holdings - {formatCurrency(summary.marketValue, false, summary.portfolio.baseCurrency)}
        </div>
        <div className="mt-1 text-[11px] app-muted">
          {getPortfolioAssetClassLabel(summary.portfolio.assetClass)} - {summary.portfolio.baseCurrency}
        </div>
      </Link>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={`/portfolio?portfolio=${summary.portfolio.id}&edit_portfolio=${summary.portfolio.id}`}
          className="rounded-md border app-secondary-button px-2 py-1 text-[11px] font-semibold"
        >
          Edit
        </Link>
        <form action={removePortfolioAction}>
          <input name="portfolio_id" type="hidden" value={summary.portfolio.id} />
          <button
            type="submit"
            className="rounded-md border border-rose-500/40 px-2 py-1 text-[11px] font-semibold text-rose-400"
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}

function EditPortfolioForm({
  portfolio,
}: {
  portfolio: PortfolioSummary["portfolio"];
}) {
  return (
    <form action={updatePortfolioAction} className="rounded-lg border app-surface p-2.5">
      <input name="portfolio_id" type="hidden" value={portfolio.id} />
      <label className="block text-xs font-medium app-muted">
        Portfolio name
        <input
          name="name"
          required
          defaultValue={portfolio.name}
          className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
        />
      </label>
      <label className="mt-2 block text-xs font-medium app-muted">
        Description
        <input
          name="description"
          defaultValue={portfolio.description ?? ""}
          className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
        />
      </label>
      <label className="mt-2 block text-xs font-medium app-muted">
        Display currency
        <select
          name="base_currency"
          defaultValue={portfolio.baseCurrency}
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
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-md app-primary-button px-3 py-1.5 text-[11px] font-semibold"
        >
          Save
        </button>
        <Link
          href={`/portfolio?portfolio=${portfolio.id}`}
          className="rounded-md border app-secondary-button px-3 py-1.5 text-[11px] font-semibold"
        >
          Cancel
        </Link>
      </div>
      <div className="mt-2 text-[11px] app-muted">
        Asset class cannot be changed after creation.
      </div>
    </form>
  );
}

function PortfolioDetail({
  editTransactionId,
  historyAssetKey,
  summary,
  message,
}: {
  editTransactionId: number | null;
  historyAssetKey: string | null;
  summary: PortfolioSummary;
  message: PageMessageValue;
}) {
  const currency = summary.portfolio.baseCurrency;
  const historyHolding =
    summary.holdings.find((holding) => holding.assetKey === historyAssetKey) ?? null;
  const historyTransactions = historyHolding
    ? summary.transactions.filter(
        (transaction) => getTransactionAssetKey(transaction) === historyHolding.assetKey
      )
    : [];
  const today = new Date().toISOString().slice(0, 10);

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
          <AddTransactionForm
            assetClass={summary.portfolio.assetClass}
            currency={currency}
            portfolioId={summary.portfolio.id}
          />
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
          <Metric label="Asset class" value={getPortfolioAssetClassLabel(summary.portfolio.assetClass)} />
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
                  <th className="border-b app-border-soft px-3 py-2 font-semibold">Asset</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Quantity</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Avg cost</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Cost basis</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Last price</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Value</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Allocation</th>
                  <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Unrealized</th>
                  <th className="border-b app-border-soft px-3 py-2 font-semibold">History</th>
                </tr>
              </thead>
              <tbody>
                {summary.holdings.map((holding) => {
                  const historyOpen = historyAssetKey === holding.assetKey;

                  return (
                    <tr key={holding.assetKey} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                      <td className="border-b app-border-soft px-3 py-2.5 font-semibold app-heading">
                        <div>
                          {holding.ticker ? (
                            <Link
                              href={getStockHref(holding.symbol)}
                              className="underline decoration-dotted underline-offset-4 hover:decoration-solid"
                            >
                              {holding.symbol}
                            </Link>
                          ) : (
                            holding.symbol
                          )}
                        </div>
                        <div className="text-[11px] font-normal app-muted">{holding.name}</div>
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
                      <td className="border-b app-border-soft px-3 py-2.5">
                        <Link
                          href={getHoldingHistoryHref(
                            summary.portfolio.id,
                            holding.assetKey,
                            historyOpen
                          )}
                          className="rounded-lg border app-secondary-button px-2 py-1 text-xs font-semibold"
                        >
                          History
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {historyHolding ? (
        <PortfolioHistoryModal
          assetClass={summary.portfolio.assetClass}
          currency={currency}
          editTransactionId={editTransactionId}
          holding={historyHolding}
          portfolioId={summary.portfolio.id}
          today={today}
          transactions={historyTransactions}
        />
      ) : null}
    </div>
  );
}

function PortfolioHistoryModal({
  assetClass,
  currency,
  editTransactionId,
  holding,
  portfolioId,
  today,
  transactions,
}: {
  assetClass: PortfolioAssetClass;
  currency: string;
  editTransactionId: number | null;
  holding: PortfolioSummary["holdings"][number];
  portfolioId: number;
  today: string;
  transactions: PortfolioTransaction[];
}) {
  const profitLoss = holding.unrealizedGain ?? 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-lg border app-surface shadow-2xl">
        <div className="flex flex-col gap-3 border-b app-border-soft px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold app-heading">
              {holding.ticker ? (
                <Link
                  href={getStockHref(holding.symbol)}
                  className="underline decoration-dotted underline-offset-4 hover:decoration-solid"
                >
                  {holding.symbol}
                </Link>
              ) : (
                holding.symbol
              )}{" "}
              history
            </h2>
            <p className="mt-1 text-xs app-muted">
              {holding.name} - break-even, projected P/L, and ledger entries.
            </p>
          </div>
          <Link
            href={`/portfolio?portfolio=${portfolioId}`}
            className="inline-flex h-9 items-center rounded-lg border app-secondary-button px-3 text-xs font-semibold"
          >
            Close
          </Link>
        </div>

        <div className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-3">
          <Metric
            label="Break-even"
            value={formatCurrency(holding.averageCost, false, currency)}
          />
          <Metric
            label="Profit above"
            value={formatCurrency(holding.averageCost, false, currency)}
          />
          <Metric
            label="Current P/L"
            value={`${formatCurrency(profitLoss, false, currency)} (${formatPercent(holding.unrealizedGainPercent)})`}
            tone={profitLoss >= 0 ? "positive" : "negative"}
          />
        </div>

          <PortfolioScenarioForm
            action={addPortfolioTransactionAction}
            assetClass={assetClass}
            assetName={holding.name}
            assetSymbol={holding.symbol}
            averageCost={holding.averageCost}
            costBasis={holding.costBasis}
            currency={currency}
            currentPrice={holding.marketPrice}
            portfolioId={portfolioId}
            quantity={holding.quantity}
            today={today}
          />

        <div className="overflow-x-auto rounded-lg border app-subtle">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-xs">
            <thead className="app-subtle">
              <tr className="uppercase tracking-normal app-muted">
                <th className="border-b app-border-soft px-3 py-2 font-semibold">Date</th>
                <th className="border-b app-border-soft px-3 py-2 font-semibold">Type</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Quantity</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Price</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Fees</th>
                <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">P/L vs break-even</th>
                <th className="border-b app-border-soft px-3 py-2 font-semibold">Notes</th>
                <th className="border-b app-border-soft px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) =>
                editTransactionId === transaction.id ? (
                  <tr key={transaction.id}>
                    <td colSpan={8} className="border-b app-border-soft p-3">
                      <EditTransactionForm
                        assetClass={assetClass}
                        currency={currency}
                        portfolioId={portfolioId}
                        transaction={transaction}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={transaction.id} className="app-muted">
                    <td className="border-b app-border-soft px-3 py-2.5">
                      {transaction.tradeDate}
                    </td>
                    <td className={`border-b app-border-soft px-3 py-2.5 ${getTransactionToneClass(transaction.transactionType)}`}>
                      {getTransactionTypeLabel(transaction.transactionType)}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatNumber(transaction.quantity, 4)}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatCurrency(transaction.price, false, currency)}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5 text-right">
                      {formatCurrency(transaction.fees, false, currency)}
                    </td>
                    <td
                      className={`border-b app-border-soft px-3 py-2.5 text-right ${
                        getTransactionProfitLoss(transaction, holding.averageCost) >= 0
                          ? "app-positive"
                          : "app-negative"
                      }`}
                    >
                      {formatCurrency(
                        getTransactionProfitLoss(transaction, holding.averageCost),
                        false,
                        currency
                      )}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5">
                      {transaction.notes || "-"}
                    </td>
                    <td className="border-b app-border-soft px-3 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/portfolio?portfolio=${portfolioId}&history_asset=${encodeURIComponent(holding.assetKey)}&edit_transaction=${transaction.id}`}
                          className="rounded-lg border app-secondary-button px-2 py-1 text-xs font-semibold"
                        >
                          Edit
                        </Link>
                        <form action={removePortfolioTransactionAction}>
                          <input name="portfolio_id" type="hidden" value={portfolioId} />
                          <input name="history_asset" type="hidden" value={holding.assetKey} />
                          <input name="transaction_id" type="hidden" value={transaction.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-rose-500/40 px-2 py-1 text-xs font-semibold text-rose-400"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}

function EditTransactionForm({
  assetClass,
  currency,
  portfolioId,
  transaction,
}: {
  assetClass: PortfolioAssetClass;
  currency: string;
  portfolioId: number;
  transaction: PortfolioTransaction;
}) {
  const isStockPortfolio = assetClass === "stocks";

  return (
    <form
      action={updatePortfolioTransactionAction}
      className="grid gap-2 sm:col-span-2 sm:grid-cols-2 xl:grid-cols-4"
    >
      <input name="portfolio_id" type="hidden" value={portfolioId} />
      <input name="transaction_id" type="hidden" value={transaction.id} />
      <select
        name="transaction_type"
        defaultValue={transaction.transactionType}
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      >
        <TransactionTypeOptions isStockPortfolio={isStockPortfolio} />
      </select>
      <input
        name="asset_name"
        defaultValue={transaction.assetName}
        placeholder={isStockPortfolio ? "Company name from ticker" : "Asset name"}
        required={!isStockPortfolio}
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="symbol"
        defaultValue={transaction.assetSymbol}
        placeholder={isStockPortfolio ? "Ticker symbol" : "Symbol / tag"}
        required={isStockPortfolio}
        className="h-9 rounded-lg border app-input px-3 text-xs uppercase outline-none"
      />
      <input
        name="trade_date"
        type="date"
        required
        defaultValue={transaction.tradeDate}
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="quantity"
        type="number"
        step="0.0001"
        min="0"
        required
        defaultValue={transaction.quantity}
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="price"
        type="number"
        step="0.01"
        min="0"
        required
        defaultValue={transaction.price}
        placeholder={isStockPortfolio ? `Price (${currency})` : `Price / value (${currency})`}
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="fees"
        type="number"
        step="0.01"
        min="0"
        defaultValue={transaction.fees}
        placeholder={`Fees (${currency})`}
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="notes"
        defaultValue={transaction.notes ?? ""}
        placeholder="Notes"
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4">
        <button
          type="submit"
          className="h-9 rounded-lg app-primary-button px-4 text-xs font-semibold"
        >
          Save
        </button>
        <Link
          href={`/portfolio?portfolio=${portfolioId}`}
          className="inline-flex h-9 items-center rounded-lg border app-secondary-button px-4 text-xs font-semibold"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function AddTransactionForm({
  assetClass,
  currency,
  portfolioId,
}: {
  assetClass: PortfolioAssetClass;
  currency: string;
  portfolioId: number;
}) {
  const isStockPortfolio = assetClass === "stocks";

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
        <TransactionTypeOptions isStockPortfolio={isStockPortfolio} />
      </select>
      <input
        name="asset_name"
        placeholder={isStockPortfolio ? "Company name from ticker" : "Asset name"}
        required={!isStockPortfolio}
        className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
      />
      <input
        name="symbol"
        placeholder={isStockPortfolio ? "Ticker symbol" : "Symbol / tag"}
        required={isStockPortfolio}
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
        placeholder={isStockPortfolio ? `Price (${currency})` : `Price / value (${currency})`}
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
        Add entry
      </button>
    </form>
  );
}

function TransactionTypeOptions({
  isStockPortfolio,
}: {
  isStockPortfolio: boolean;
}) {
  return (
    <>
      <option value="buy">Buy</option>
      <option value="sell">Sell</option>
      {!isStockPortfolio ? <option value="valuation">Update value</option> : null}
    </>
  );
}

const portfolioAssetClassOptions: Array<{ value: PortfolioAssetClass; label: string }> = [
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "commodity", label: "Commodities" },
  { value: "real_estate", label: "Real estate" },
  { value: "other", label: "Other assets" },
];

function getPortfolioAssetClassLabel(assetClass: PortfolioAssetClass) {
  return (
    portfolioAssetClassOptions.find((option) => option.value === assetClass)?.label ??
    "Stocks"
  );
}

function getTransactionTypeLabel(transactionType: PortfolioTransaction["transactionType"]) {
  if (transactionType === "valuation") {
    return "VALUE";
  }

  return transactionType.toUpperCase();
}

function getTransactionToneClass(transactionType: PortfolioTransaction["transactionType"]) {
  if (transactionType === "buy") {
    return "app-positive";
  }

  if (transactionType === "sell") {
    return "app-negative";
  }

  return "app-muted";
}

function getHoldingHistoryHref(
  portfolioId: number,
  assetKey: string,
  historyOpen: boolean
) {
  const params = new URLSearchParams({ portfolio: String(portfolioId) });

  if (!historyOpen) {
    params.set("history_asset", assetKey);
  }

  return `/portfolio?${params.toString()}`;
}

function getTransactionAssetKey(transaction: PortfolioTransaction) {
  if (transaction.ticker) {
    return `ticker:${transaction.ticker.id}`;
  }

  return `${transaction.assetClass}:${(transaction.assetSymbol || transaction.assetName)
    .trim()
    .toUpperCase()}`;
}

function getTransactionProfitLoss(
  transaction: PortfolioTransaction,
  breakEvenPrice: number
) {
  if (transaction.transactionType === "buy") {
    return (breakEvenPrice - transaction.price) * transaction.quantity - transaction.fees;
  }

  return (transaction.price - breakEvenPrice) * transaction.quantity - transaction.fees;
}

function getStockHref(symbol: string) {
  return `/stock?symbol=${encodeURIComponent(symbol)}&autoload=1`;
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
