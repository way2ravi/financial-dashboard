import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  createWealthItem,
  deleteWealthItem,
  getWealthItemById,
  getWealthItemsForUser,
  getWealthUserSettings,
  updateWealthItem,
  upsertWealthUserSettings,
} from "@/lib/repositories/wealthRepository";
import type { Database } from "@/lib/types/database";
import type {
  WealthAdviceItem,
  WealthAssetCategory,
  WealthBreakdownSlice,
  WealthCategory,
  WealthDashboard,
  WealthItem,
  WealthLiabilityCategory,
  WealthRecordType,
  WealthUserSettings,
} from "@/lib/types/wealth";
import {
  getWealthCategoryLabel,
  wealthAssetSubcategories,
  wealthLiabilitySubcategories,
} from "@/lib/types/wealth";
import { AppError } from "./errors";

type DbClient = SupabaseClient<Database>;

export async function getWealthDashboardForUser(
  supabase: DbClient,
  user: User | null
): Promise<WealthDashboard> {
  if (!user) {
    return emptyDashboard();
  }

  const [settings, items] = await Promise.all([
    getWealthUserSettings(supabase, user.id),
    getWealthItemsForUser(supabase, user.id),
  ]);

  return buildWealthDashboard(settings, items);
}

export async function saveWealthSettingsForUser(
  supabase: DbClient,
  user: User | null,
  input: { baseCurrency?: string | null; monthlyExpensesEstimate?: number | null }
): Promise<WealthUserSettings> {
  if (!user) {
    throw new AppError("You must be signed in to update wealth settings", 401);
  }

  const existing = await getWealthUserSettings(supabase, user.id);

  return upsertWealthUserSettings(supabase, {
    userId: user.id,
    baseCurrency: normalizeCurrency(input.baseCurrency ?? existing?.baseCurrency),
    monthlyExpensesEstimate: normalizeOptionalAmount(input.monthlyExpensesEstimate),
  });
}

export async function addWealthItemForUser(
  supabase: DbClient,
  user: User | null,
  input: WealthItemInput
): Promise<WealthItem> {
  if (!user) {
    throw new AppError("You must be signed in to add wealth items", 401);
  }

  validateWealthItemInput(input);

  return createWealthItem(supabase, {
    userId: user.id,
    ...input,
  });
}

export async function updateWealthItemForUser(
  supabase: DbClient,
  user: User | null,
  itemId: number,
  input: WealthItemInput
): Promise<WealthItem> {
  if (!user) {
    throw new AppError("You must be signed in to update wealth items", 401);
  }

  const existing = await getWealthItemById(supabase, user.id, itemId);

  if (!existing) {
    throw new AppError("Wealth item was not found", 404);
  }

  validateWealthItemInput(input);

  return updateWealthItem(supabase, user.id, itemId, input);
}

export async function removeWealthItemForUser(
  supabase: DbClient,
  user: User | null,
  itemId: number
): Promise<void> {
  if (!user) {
    throw new AppError("You must be signed in to remove wealth items", 401);
  }

  await deleteWealthItem(supabase, user.id, itemId);
}

type WealthItemInput = {
  recordType: WealthRecordType;
  category: WealthCategory;
  subcategory: string;
  name: string;
  currentValue: number;
  interestRate?: number | null;
  monthlyPayment?: number | null;
  asOfDate: string;
  notes?: string | null;
};

function buildWealthDashboard(
  settings: WealthUserSettings | null,
  items: WealthItem[]
): WealthDashboard {
  const assets = items.filter((item) => item.recordType === "asset");
  const liabilities = items.filter((item) => item.recordType === "liability");

  const liquidAssets = sumByCategory(assets, "liquid");
  const fixedAssets = sumByCategory(assets, "fixed");
  const investments = sumByCategory(assets, "investment");
  const totalAssets = liquidAssets + fixedAssets + investments;
  const totalLiabilities = sumValues(liabilities.map((item) => item.currentValue));
  const netWorth = totalAssets - totalLiabilities;

  const monthlyDebtPayments = sumValues(
    liabilities.map((item) => item.monthlyPayment ?? 0)
  );

  const highInterestDebt = sumValues(
    liabilities
      .filter((item) => (item.interestRate ?? 0) >= 8)
      .map((item) => item.currentValue)
  );

  const assetAllocation = buildSlices(
    [
      { key: "liquid", label: "Liquid", value: liquidAssets },
      { key: "fixed", label: "Fixed", value: fixedAssets },
      { key: "investment", label: "Investments", value: investments },
    ],
    totalAssets
  );

  const liabilityAllocation = buildSlices(
    groupLiabilityTotals(liabilities),
    totalLiabilities
  );

  const categoryTotals = buildSlices(
    [
      ...assetAllocation,
      ...liabilityAllocation.map((slice) => ({
        key: `liability-${slice.key}`,
        label: `${slice.label} (debt)`,
        value: slice.value,
      })),
    ],
    totalAssets + totalLiabilities
  );

  const metrics = {
    settings,
    items,
    totalAssets,
    totalLiabilities,
    netWorth,
    liquidAssets,
    fixedAssets,
    investments,
    totalDebt: totalLiabilities,
    debtToAssetRatio: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : null,
    liquidityRatio: totalAssets > 0 ? (liquidAssets / totalAssets) * 100 : null,
    monthlyDebtPayments,
    highInterestDebt,
    assetAllocation,
    liabilityAllocation,
    categoryTotals,
    advice: buildWealthAdvice({
      settings,
      totalAssets,
      totalLiabilities,
      netWorth,
      liquidAssets,
      fixedAssets,
      investments,
      monthlyDebtPayments,
      highInterestDebt,
      liabilities,
    }),
  };

  return metrics;
}

function buildWealthAdvice(input: {
  settings: WealthUserSettings | null;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidAssets: number;
  fixedAssets: number;
  investments: number;
  monthlyDebtPayments: number;
  highInterestDebt: number;
  liabilities: WealthItem[];
}): WealthAdviceItem[] {
  const advice: WealthAdviceItem[] = [];

  if (input.totalAssets === 0 && input.totalLiabilities === 0) {
    return [
      {
        id: "start-tracking",
        priority: "medium",
        title: "Start your wealth picture",
        summary:
          "Add your cash, investments, property, and debts to see net worth and personalized guidance.",
        action: "Record at least one liquid asset and any major loans or cards.",
      },
    ];
  }

  if (input.netWorth < 0) {
    advice.push({
      id: "negative-net-worth",
      priority: "high",
      title: "Liabilities exceed assets",
      summary: `Net worth is negative. Focus on high-cost debt and stabilizing cash flow before new discretionary spending.`,
      action: "List debts by interest rate and pay the highest-rate balances first.",
    });
  }

  const debtRatio =
    input.totalAssets > 0 ? (input.totalLiabilities / input.totalAssets) * 100 : 100;

  if (debtRatio >= 50) {
    advice.push({
      id: "high-debt-ratio",
      priority: "high",
      title: "Debt load is elevated",
      summary: `Debt is about ${debtRatio.toFixed(0)}% of total assets. Lowering this ratio improves resilience.`,
      action: "Target extra payments on the smallest high-interest balance (debt snowball) or highest rate (avalanche).",
    });
  } else if (debtRatio >= 30) {
    advice.push({
      id: "moderate-debt-ratio",
      priority: "medium",
      title: "Moderate leverage",
      summary: `Debt is about ${debtRatio.toFixed(0)}% of assets. Monitor monthly payments against income.`,
      action: "Avoid new high-interest borrowing until the ratio trends down.",
    });
  }

  if (input.highInterestDebt > 0) {
    advice.push({
      id: "high-interest-debt",
      priority: "high",
      title: "High-interest debt detected",
      summary: `${formatCompact(input.highInterestDebt)} is in liabilities at 8%+ APR (cards, overdrafts, personal loans).`,
      action: "Prioritize paying these balances before adding to investments.",
    });
  }

  const monthlyExpenses = input.settings?.monthlyExpensesEstimate ?? null;
  const emergencyTarget = monthlyExpenses ? monthlyExpenses * 6 : null;

  if (emergencyTarget && monthlyExpenses && input.liquidAssets < emergencyTarget) {
    const monthsCovered =
      monthlyExpenses > 0 ? input.liquidAssets / monthlyExpenses : 0;

    advice.push({
      id: "emergency-fund",
      priority: monthsCovered < 3 ? "high" : "medium",
      title: "Build your emergency reserve",
      summary: `Liquid assets cover about ${monthsCovered.toFixed(1)} months of estimated expenses (target: 3–6 months).`,
      action: "Increase cash or savings until you reach your 6-month reserve target.",
    });
  } else if (input.totalAssets > 0 && input.liquidAssets / input.totalAssets < 0.1) {
    advice.push({
      id: "low-liquidity",
      priority: "medium",
      title: "Low cash buffer",
      summary: "Liquid assets are under 10% of total assets, which can strain short-term needs.",
      action: "Hold more in checking, savings, or money market before illiquid purchases.",
    });
  }

  if (input.totalAssets > 0 && input.fixedAssets / input.totalAssets > 0.7) {
    advice.push({
      id: "real-estate-concentration",
      priority: "medium",
      title: "Concentration in fixed assets",
      summary: "Most wealth sits in property or other fixed assets, limiting flexibility.",
      action: "Consider rebalancing into liquid or investment assets over time if appropriate.",
    });
  }

  if (input.totalAssets > 0 && input.investments / input.totalAssets < 0.15 && input.netWorth > 0) {
    advice.push({
      id: "low-investments",
      priority: "low",
      title: "Investment allocation is light",
      summary: "Investments are a small share of assets relative to typical long-term wealth plans.",
      action: "After emergency fund and high-rate debt, increase diversified retirement or brokerage contributions.",
    });
  }

  if (
    input.netWorth > 0 &&
    debtRatio < 25 &&
    input.liquidAssets > 0 &&
    (!emergencyTarget || input.liquidAssets >= emergencyTarget)
  ) {
    advice.push({
      id: "healthy-balance",
      priority: "low",
      title: "Solid foundation",
      summary: "Net worth is positive with manageable debt and reasonable liquidity.",
      action: "Maintain contributions to retirement and rebalance investments once or twice a year.",
    });
  }

  if (input.monthlyDebtPayments > 0 && monthlyExpenses && input.monthlyDebtPayments > monthlyExpenses * 0.4) {
    advice.push({
      id: "debt-service-burden",
      priority: "high",
      title: "Heavy monthly debt service",
      summary: "Scheduled debt payments exceed 40% of your estimated monthly expenses.",
      action: "Refinance, consolidate, or renegotiate terms where possible; pause non-essential spending.",
    });
  }

  const revolving = input.liabilities.filter(
    (item) => item.category === "credit_card" || item.category === "overdraft"
  );

  if (revolving.length > 0) {
    advice.push({
      id: "revolving-credit",
      priority: "medium",
      title: "Revolving credit on the books",
      summary: "Credit cards and overdrafts usually carry the highest rates and should be cleared quickly.",
      action: "Pay more than the minimum each month and stop new charges until balances fall.",
    });
  }

  return advice.slice(0, 6);
}

function groupLiabilityTotals(liabilities: WealthItem[]) {
  const totals = new Map<string, { label: string; value: number }>();

  for (const item of liabilities) {
    const key = item.category;
    const current = totals.get(key) ?? {
      label: getWealthCategoryLabel(item.category),
      value: 0,
    };
    current.value += item.currentValue;
    totals.set(key, current);
  }

  return [...totals.entries()].map(([key, value]) => ({
    key,
    label: value.label,
    value: value.value,
  }));
}

function buildSlices(
  rows: Array<{ key: string; label: string; value: number }>,
  total: number
): WealthBreakdownSlice[] {
  return rows
    .filter((row) => row.value > 0)
    .map((row) => ({
      key: row.key,
      label: row.label,
      value: row.value,
      percent: total > 0 ? (row.value / total) * 100 : 0,
    }))
    .sort((left, right) => right.value - left.value);
}

function sumByCategory(items: WealthItem[], category: WealthAssetCategory) {
  return sumValues(items.filter((item) => item.category === category).map((item) => item.currentValue));
}

function sumValues(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function emptyDashboard(): WealthDashboard {
  return buildWealthDashboard(null, []);
}

function validateWealthItemInput(input: WealthItemInput) {
  const name = input.name.trim();

  if (!name) {
    throw new AppError("Name is required", 400);
  }

  if (!input.asOfDate) {
    throw new AppError("As-of date is required", 400);
  }

  if (input.currentValue <= 0) {
    throw new AppError("Value must be greater than zero", 400);
  }

  if (!isValidCategoryPair(input.recordType, input.category)) {
    throw new AppError("Category does not match asset or liability type", 400);
  }

  const allowedSubcategories = getAllowedSubcategories(input.category);

  if (!allowedSubcategories.includes(input.subcategory)) {
    throw new AppError("Invalid subcategory for the selected category", 400);
  }

  if (input.interestRate !== null && input.interestRate !== undefined && input.interestRate < 0) {
    throw new AppError("Interest rate cannot be negative", 400);
  }

  if (
    input.monthlyPayment !== null &&
    input.monthlyPayment !== undefined &&
    input.monthlyPayment < 0
  ) {
    throw new AppError("Monthly payment cannot be negative", 400);
  }
}

function isValidCategoryPair(recordType: WealthRecordType, category: WealthCategory) {
  if (recordType === "asset") {
    return category === "liquid" || category === "fixed" || category === "investment";
  }

  return (
    category === "loan" ||
    category === "overdraft" ||
    category === "credit_card" ||
    category === "other_debt"
  );
}

function getAllowedSubcategories(category: WealthCategory) {
  if (category === "liquid" || category === "fixed" || category === "investment") {
    return wealthAssetSubcategories[category].map((item) => item.id);
  }

  return wealthLiabilitySubcategories[category as WealthLiabilityCategory].map(
    (item) => item.id
  );
}

function normalizeCurrency(value: string | null | undefined) {
  const normalized = (value ?? "USD").trim().toUpperCase();
  return normalized || "USD";
}

function normalizeOptionalAmount(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  if (value < 0) {
    throw new AppError("Monthly expenses cannot be negative", 400);
  }

  return value;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function parseWealthRecordType(value: string): WealthRecordType {
  return value === "liability" ? "liability" : "asset";
}

export function parseWealthCategory(
  recordType: WealthRecordType,
  value: string
): WealthCategory {
  if (recordType === "asset") {
    if (value === "fixed" || value === "investment") {
      return value;
    }

    return "liquid";
  }

  if (
    value === "loan" ||
    value === "overdraft" ||
    value === "credit_card" ||
    value === "other_debt"
  ) {
    return value;
  }

  return "loan";
}
