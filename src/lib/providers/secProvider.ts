import "server-only";

import type { ProviderFinancialStatementRow } from "@/lib/types";

type SecCompanyTickersResponse = Record<
  string,
  {
    cik_str?: number;
    ticker?: string;
    title?: string;
  }
>;

type SecCompanyFactsResponse = {
  facts?: {
    "us-gaap"?: Record<
      string,
      {
        units?: Record<string, SecFactUnit[]>;
      }
    >;
  };
};

type SecFactUnit = {
  end?: string;
  filed?: string;
  form?: string;
  fp?: string;
  frame?: string;
  fy?: number;
  val?: number;
};

type StatementPeriod = {
  calendarYear: string;
  fiscalDate: string;
  frame: string;
  period: string;
  periodType: ProviderFinancialStatementRow["periodType"];
};

const SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_COMPANY_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts";
const PROVIDER = "sec";

const CONCEPTS = {
  cashFromFinancing: ["NetCashProvidedByUsedInFinancingActivities"],
  cashFromInvesting: ["NetCashProvidedByUsedInInvestingActivities"],
  cashFromOperations: ["NetCashProvidedByUsedInOperatingActivities"],
  grossProfit: ["GrossProfit"],
  netChangeInCash: [
    "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect",
    "CashAndCashEquivalentsPeriodIncreaseDecrease",
  ],
  netIncome: ["NetIncomeLoss", "ProfitLoss"],
  operatingIncome: ["OperatingIncomeLoss"],
  totalAssets: ["Assets"],
  totalCurrentLiabilities: ["LiabilitiesCurrent"],
  totalEquity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
  totalRevenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
  ],
  capitalExpenditures: [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsToAcquireProductiveAssets",
  ],
};

let tickerCache: Promise<SecCompanyTickersResponse> | null = null;

export async function getSecFinancialStatements(
  symbol: string
): Promise<ProviderFinancialStatementRow[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const cik = await getCikForSymbol(normalizedSymbol);

  if (!cik) {
    throw new Error("SEC ticker CIK was not found");
  }

  const facts = await getFromSec<SecCompanyFactsResponse>(
    `${SEC_COMPANY_FACTS_URL}/CIK${cik}.json`
  );
  const usGaap = facts.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error("SEC company facts response was empty");
  }

  const annualPeriods = getStatementPeriods(usGaap, "annual", 5);
  const quarterlyPeriods = getStatementPeriods(usGaap, "quarter", 4);
  const rows = [
    ...buildSecStatementRows(normalizedSymbol, usGaap, annualPeriods),
    ...buildSecStatementRows(normalizedSymbol, usGaap, quarterlyPeriods),
  ];

  if (rows.length === 0) {
    throw new Error("SEC financial statement rows were empty");
  }

  return rows;
}

async function getCikForSymbol(symbol: string) {
  tickerCache ??= getFromSec<SecCompanyTickersResponse>(SEC_COMPANY_TICKERS_URL);
  const tickers = await tickerCache;
  const match = Object.values(tickers).find(
    (company) => company.ticker?.toUpperCase() === symbol
  );

  return match?.cik_str ? String(match.cik_str).padStart(10, "0") : null;
}

function getStatementPeriods(
  facts: NonNullable<SecCompanyFactsResponse["facts"]>["us-gaap"],
  periodType: ProviderFinancialStatementRow["periodType"],
  limit: number
): StatementPeriod[] {
  const revenueFacts = getConceptFacts(facts, CONCEPTS.totalRevenue);
  const framePattern = periodType === "annual" ? /^CY\d{4}$/ : /^CY\d{4}Q[1-4]$/;
  const periods = new Map<string, StatementPeriod>();

  for (const fact of revenueFacts) {
    if (!fact.end || !fact.frame || !framePattern.test(fact.frame)) {
      continue;
    }

    const calendarYear = fact.end.slice(0, 4);
    const quarter = fact.fp?.match(/^Q[1-4]$/)?.[0] ?? fact.frame.match(/Q[1-4]$/)?.[0];
    const period =
      periodType === "annual"
        ? calendarYear
        : `${quarter ?? inferQuarterLabel(fact.end)} ${calendarYear}`;

    periods.set(fact.end, {
      calendarYear,
      fiscalDate: fact.end,
      frame: fact.frame,
      period,
      periodType,
    });
  }

  return [...periods.values()]
    .sort((left, right) => right.fiscalDate.localeCompare(left.fiscalDate))
    .slice(0, limit);
}

function buildSecStatementRows(
  symbol: string,
  facts: NonNullable<SecCompanyFactsResponse["facts"]>["us-gaap"],
  periods: StatementPeriod[]
): ProviderFinancialStatementRow[] {
  return periods.flatMap((period) => {
    const cashFromOperations = findFactValue(facts, CONCEPTS.cashFromOperations, period);
    const capitalExpenditures = findFactValue(facts, CONCEPTS.capitalExpenditures, period);

    return [
      {
        ...baseRow(symbol, period, "income"),
        grossProfit: findFactValue(facts, CONCEPTS.grossProfit, period),
        netIncome: findFactValue(facts, CONCEPTS.netIncome, period),
        operatingIncome: findFactValue(facts, CONCEPTS.operatingIncome, period),
        totalRevenue: findFactValue(facts, CONCEPTS.totalRevenue, period),
      },
      {
        ...baseRow(symbol, period, "balance"),
        totalAssets: findFactValue(facts, CONCEPTS.totalAssets, period),
        totalCurrentLiabilities: findFactValue(
          facts,
          CONCEPTS.totalCurrentLiabilities,
          period
        ),
        totalEquity: findFactValue(facts, CONCEPTS.totalEquity, period),
      },
      {
        ...baseRow(symbol, period, "cashflow"),
        cashFromFinancing: findFactValue(facts, CONCEPTS.cashFromFinancing, period),
        cashFromInvesting: findFactValue(facts, CONCEPTS.cashFromInvesting, period),
        cashFromOperations,
        leveredFreeCashFlow: estimateFreeCashFlow(cashFromOperations, capitalExpenditures),
        netChangeInCash: findFactValue(facts, CONCEPTS.netChangeInCash, period),
      },
    ];
  });
}

function baseRow(
  symbol: string,
  period: StatementPeriod,
  statementType: ProviderFinancialStatementRow["statementType"]
): ProviderFinancialStatementRow {
  return {
    calendarYear: period.calendarYear,
    cashFromFinancing: null,
    cashFromInvesting: null,
    cashFromOperations: null,
    fiscalDate: period.fiscalDate,
    grossProfit: null,
    leveredFreeCashFlow: null,
    netChangeInCash: null,
    netIncome: null,
    operatingIncome: null,
    period: period.period,
    periodType: period.periodType,
    source: PROVIDER,
    sourceUpdatedAt: period.fiscalDate,
    statementType,
    symbol,
    totalAssets: null,
    totalCurrentLiabilities: null,
    totalEquity: null,
    totalRevenue: null,
  };
}

function findFactValue(
  facts: NonNullable<SecCompanyFactsResponse["facts"]>["us-gaap"],
  concepts: string[],
  period: StatementPeriod
) {
  for (const fact of getConceptFacts(facts, concepts)) {
    if (
      fact.val !== undefined &&
      (fact.frame === period.frame || fact.frame === `${period.frame}I`)
    ) {
      return fact.val;
    }
  }

  return null;
}

function getConceptFacts(
  facts: NonNullable<SecCompanyFactsResponse["facts"]>["us-gaap"],
  concepts: string[]
) {
  for (const concept of concepts) {
    const units = facts?.[concept]?.units;
    const values = units?.USD ?? units?.shares ?? [];

    if (values.length > 0) {
      return values.filter((fact) => fact.form === "10-K" || fact.form === "10-Q");
    }
  }

  return [];
}

function estimateFreeCashFlow(
  operatingCash: number | null,
  capitalExpenditures: number | null
) {
  if (operatingCash === null) {
    return null;
  }

  return operatingCash - Math.abs(capitalExpenditures ?? 0);
}

async function getFromSec<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent":
        process.env.SEC_USER_AGENT ?? "way2invest.com financial-dashboard contact@example.com",
    },
  });

  if (!response.ok) {
    throw new Error(`SEC request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function inferQuarterLabel(date: string) {
  const month = Number(date.slice(5, 7));

  if (!Number.isFinite(month)) {
    return "Q?";
  }

  return `Q${Math.ceil(month / 3)}`;
}
