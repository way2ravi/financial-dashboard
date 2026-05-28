import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  addPortfolioTransaction,
  createPortfolio,
  deletePortfolioTransaction,
  findTickerBySymbol,
  getLatestQuotesByTickerId,
  getPortfolioById,
  getPortfolioTransactions,
  getUserPortfolios,
} from "@/lib/repositories";
import type { Database } from "@/lib/types/database";
import type {
  Portfolio,
  PortfolioHolding,
  PortfolioSummary,
  PortfolioTransaction,
  PortfolioTransactionType,
} from "@/lib/types/market";
import { AppError } from "./errors";

type DbClient = SupabaseClient<Database>;

export async function getPortfolioSummariesForUser(
  supabase: DbClient,
  user: User | null
): Promise<PortfolioSummary[]> {
  if (!user) {
    return [];
  }

  const portfolios = await getUserPortfolios(supabase, user.id);

  return Promise.all(
    portfolios.map((portfolio) => buildPortfolioSummary(supabase, user.id, portfolio))
  );
}

export async function createPortfolioForUser(
  supabase: DbClient,
  user: User | null,
  input: { name: string; description?: string | null }
): Promise<Portfolio> {
  if (!user) {
    throw new AppError("You must be signed in to create a portfolio", 401);
  }

  const name = input.name.trim();

  if (!name) {
    throw new AppError("Portfolio name is required", 400);
  }

  return createPortfolio(supabase, {
    userId: user.id,
    name,
    description: input.description?.trim() || null,
  });
}

export async function addTransactionForUser(
  supabase: DbClient,
  user: User | null,
  input: {
    portfolioId: number;
    symbol: string;
    transactionType: PortfolioTransactionType;
    tradeDate: string;
    quantity: number;
    price: number;
    fees: number;
    notes?: string | null;
  }
): Promise<void> {
  if (!user) {
    throw new AppError("You must be signed in to add portfolio transactions", 401);
  }

  const portfolio = await getPortfolioById(supabase, user.id, input.portfolioId);

  if (!portfolio) {
    throw new AppError("Portfolio was not found", 404);
  }

  const symbol = input.symbol.trim().toUpperCase();
  const ticker = await findTickerBySymbol(supabase, symbol);

  if (!ticker) {
    throw new AppError(`Ticker ${symbol} was not found`, 404);
  }

  if (!["buy", "sell"].includes(input.transactionType)) {
    throw new AppError("Transaction type must be buy or sell", 400);
  }

  if (!input.tradeDate) {
    throw new AppError("Trade date is required", 400);
  }

  if (input.quantity <= 0 || input.price < 0 || input.fees < 0) {
    throw new AppError("Quantity, price, and fees must be valid positive values", 400);
  }

  if (input.transactionType === "sell") {
    const transactions = await getPortfolioTransactions(supabase, user.id, portfolio.id);
    const openQuantity = getOpenQuantityForTicker(transactions, ticker.id);

    if (input.quantity > openQuantity) {
      throw new AppError(
        `Sell quantity exceeds the open ${symbol} position of ${openQuantity}`,
        400
      );
    }
  }

  await addPortfolioTransaction(supabase, {
    userId: user.id,
    portfolioId: portfolio.id,
    tickerId: ticker.id,
    transactionType: input.transactionType,
    tradeDate: input.tradeDate,
    quantity: input.quantity,
    price: input.price,
    fees: input.fees,
    notes: input.notes?.trim() || null,
  });
}

export async function removeTransactionForUser(
  supabase: DbClient,
  user: User | null,
  transactionId: number
): Promise<void> {
  if (!user) {
    throw new AppError("You must be signed in to remove transactions", 401);
  }

  await deletePortfolioTransaction(supabase, user.id, transactionId);
}

async function buildPortfolioSummary(
  supabase: DbClient,
  userId: string,
  portfolio: Portfolio
): Promise<PortfolioSummary> {
  const transactions = await getPortfolioTransactions(supabase, userId, portfolio.id);
  const tickerIds = [...new Set(transactions.map((item) => item.ticker.id))];
  const quotes = await getLatestQuotesByTickerId(supabase, tickerIds);
  const holdingsWithoutAllocation = buildHoldings(transactions, quotes);
  const marketValue = sum(
    holdingsWithoutAllocation.map((holding) => holding.marketValue ?? 0)
  );
  const holdings = holdingsWithoutAllocation.map((holding) => ({
    ...holding,
    allocationPercent:
      holding.marketValue === null || marketValue === 0
        ? null
        : (holding.marketValue / marketValue) * 100,
  }));
  const unrealizedGain = sum(holdings.map((holding) => holding.unrealizedGain ?? 0));
  const realizedGain = sum(holdings.map((holding) => holding.realizedGain));
  const investedCapital = sum(
    transactions
      .filter((transaction) => transaction.transactionType === "buy")
      .map((transaction) => transaction.quantity * transaction.price + transaction.fees)
  );
  const cashFromSells = sum(
    transactions
      .filter((transaction) => transaction.transactionType === "sell")
      .map((transaction) => transaction.quantity * transaction.price - transaction.fees)
  );
  const totalGain = realizedGain + unrealizedGain;
  const openCostBasis = sum(holdings.map((holding) => holding.costBasis));

  return {
    portfolio,
    investedCapital,
    marketValue,
    cashFromSells,
    realizedGain,
    unrealizedGain,
    totalGain,
    totalGainPercent: openCostBasis > 0 ? (totalGain / openCostBasis) * 100 : null,
    closedPositions: getClosedPositionCount(transactions, holdings),
    openPositions: holdings.length,
    tradeCount: transactions.length,
    holdings,
    transactions,
  };
}

function buildHoldings(
  transactions: PortfolioTransaction[],
  quotes: Awaited<ReturnType<typeof getLatestQuotesByTickerId>>
): PortfolioHolding[] {
  const byTicker = new Map<
    number,
    {
      ticker: PortfolioTransaction["ticker"];
      quantity: number;
      costBasis: number;
      realizedGain: number;
    }
  >();

  [...transactions]
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.id - b.id)
    .forEach((transaction) => {
      const existing =
        byTicker.get(transaction.ticker.id) ??
        {
          ticker: transaction.ticker,
          quantity: 0,
          costBasis: 0,
          realizedGain: 0,
        };

      if (transaction.transactionType === "buy") {
        existing.quantity += transaction.quantity;
        existing.costBasis += transaction.quantity * transaction.price + transaction.fees;
      } else {
        const averageCost =
          existing.quantity > 0 ? existing.costBasis / existing.quantity : transaction.price;
        const sellQuantity = Math.min(transaction.quantity, existing.quantity);
        const removedCost = averageCost * sellQuantity;
        const proceeds = transaction.quantity * transaction.price - transaction.fees;

        existing.quantity -= sellQuantity;
        existing.costBasis = Math.max(existing.costBasis - removedCost, 0);
        existing.realizedGain += proceeds - removedCost;
      }

      byTicker.set(transaction.ticker.id, existing);
    });

  return [...byTicker.values()]
    .filter((holding) => holding.quantity > 0.000001)
    .map((holding) => {
      const marketPrice = quotes.get(holding.ticker.id)?.price ?? null;
      const marketValue = marketPrice === null ? null : holding.quantity * marketPrice;
      const unrealizedGain =
        marketValue === null ? null : marketValue - holding.costBasis;

      return {
        ticker: holding.ticker,
        quantity: holding.quantity,
        averageCost: holding.quantity > 0 ? holding.costBasis / holding.quantity : 0,
        costBasis: holding.costBasis,
        marketPrice,
        marketValue,
        allocationPercent: null,
        unrealizedGain,
        unrealizedGainPercent:
          unrealizedGain === null || holding.costBasis === 0
            ? null
            : (unrealizedGain / holding.costBasis) * 100,
        realizedGain: holding.realizedGain,
      };
    });
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getOpenQuantityForTicker(
  transactions: PortfolioTransaction[],
  tickerId: number
) {
  return transactions
    .filter((transaction) => transaction.ticker.id === tickerId)
    .reduce((quantity, transaction) => {
      return transaction.transactionType === "buy"
        ? quantity + transaction.quantity
        : quantity - transaction.quantity;
    }, 0);
}

function getClosedPositionCount(
  transactions: PortfolioTransaction[],
  holdings: PortfolioHolding[]
) {
  const tradedTickerIds = new Set(transactions.map((transaction) => transaction.ticker.id));
  const openTickerIds = new Set(holdings.map((holding) => holding.ticker.id));

  return [...tradedTickerIds].filter((tickerId) => !openTickerIds.has(tickerId)).length;
}
