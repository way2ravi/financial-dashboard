export type WealthRecordType = "asset" | "liability";

export type WealthAssetCategory = "liquid" | "fixed" | "investment";

export type WealthLiabilityCategory =
  | "loan"
  | "overdraft"
  | "credit_card"
  | "other_debt";

export type WealthCategory = WealthAssetCategory | WealthLiabilityCategory;

export type WealthUserSettings = {
  userId: string;
  baseCurrency: string;
  monthlyExpensesEstimate: number | null;
  createdAt: string;
  updatedAt: string;
};

export type WealthItem = {
  id: number;
  userId: string;
  recordType: WealthRecordType;
  category: WealthCategory;
  subcategory: string;
  name: string;
  currentValue: number;
  interestRate: number | null;
  monthlyPayment: number | null;
  asOfDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WealthBreakdownSlice = {
  key: string;
  label: string;
  value: number;
  percent: number;
};

export type WealthAdvicePriority = "high" | "medium" | "low";

export type WealthAdviceItem = {
  id: string;
  priority: WealthAdvicePriority;
  title: string;
  summary: string;
  action: string;
};

export type WealthDashboard = {
  settings: WealthUserSettings | null;
  items: WealthItem[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidAssets: number;
  fixedAssets: number;
  investments: number;
  totalDebt: number;
  debtToAssetRatio: number | null;
  liquidityRatio: number | null;
  monthlyDebtPayments: number;
  highInterestDebt: number;
  assetAllocation: WealthBreakdownSlice[];
  liabilityAllocation: WealthBreakdownSlice[];
  categoryTotals: WealthBreakdownSlice[];
  advice: WealthAdviceItem[];
};

export const wealthAssetSubcategories: Record<WealthAssetCategory, Array<{ id: string; label: string }>> = {
  liquid: [
    { id: "cash", label: "Cash on hand" },
    { id: "checking", label: "Checking account" },
    { id: "savings", label: "Savings account" },
    { id: "money_market", label: "Money market" },
    { id: "brokerage_cash", label: "Brokerage cash" },
    { id: "crypto", label: "Cryptocurrency" },
    { id: "other_liquid", label: "Other liquid" },
  ],
  fixed: [
    { id: "real_estate", label: "Real estate" },
    { id: "vehicle", label: "Vehicle" },
    { id: "land", label: "Land" },
    { id: "precious_metals", label: "Precious metals" },
    { id: "collectibles", label: "Collectibles / art" },
    { id: "business_equity", label: "Business equity" },
    { id: "other_fixed", label: "Other fixed asset" },
  ],
  investment: [
    { id: "stocks", label: "Stocks" },
    { id: "bonds", label: "Bonds" },
    { id: "mutual_funds", label: "Mutual funds" },
    { id: "etf", label: "ETFs" },
    { id: "retirement_401k", label: "401(k) / employer plan" },
    { id: "retirement_ira", label: "IRA / Roth IRA" },
    { id: "pension", label: "Pension" },
    { id: "private_equity", label: "Private equity / VC" },
    { id: "other_investment", label: "Other investment" },
  ],
};

export const wealthLiabilitySubcategories: Record<
  WealthLiabilityCategory,
  Array<{ id: string; label: string }>
> = {
  loan: [
    { id: "mortgage", label: "Mortgage" },
    { id: "home_equity", label: "Home equity loan" },
    { id: "auto_loan", label: "Auto loan" },
    { id: "student_loan", label: "Student loan" },
    { id: "personal_loan", label: "Personal loan" },
    { id: "business_loan", label: "Business loan" },
    { id: "margin_loan", label: "Margin loan" },
    { id: "other_loan", label: "Other loan" },
  ],
  overdraft: [{ id: "bank_overdraft", label: "Bank overdraft" }],
  credit_card: [{ id: "credit_card", label: "Credit card balance" }],
  other_debt: [
    { id: "tax_debt", label: "Tax debt" },
    { id: "family_loan", label: "Family / informal loan" },
    { id: "other_debt", label: "Other debt" },
  ],
};

export function getWealthSubcategoryLabel(
  category: WealthCategory,
  subcategory: string
) {
  const options =
    category === "liquid" ||
    category === "fixed" ||
    category === "investment"
      ? wealthAssetSubcategories[category]
      : wealthLiabilitySubcategories[category];

  return options.find((item) => item.id === subcategory)?.label ?? subcategory;
}

export function getWealthCategoryLabel(category: WealthCategory) {
  const labels: Record<WealthCategory, string> = {
    liquid: "Liquid assets",
    fixed: "Fixed assets",
    investment: "Investments",
    loan: "Loans",
    overdraft: "Overdrafts",
    credit_card: "Credit cards",
    other_debt: "Other debt",
  };

  return labels[category];
}
