import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type {
  ProviderAnalystPriceTargets,
  ProviderAnalystRatings,
  ProviderEarningsQuarterly,
  ProviderFinancialStatementRow,
  ProviderFundamentalsSnapshot,
  ProviderNewsArticle,
  ProviderOhlcDaily,
  Ticker,
} from "@/lib/types/market";

type DbClient = SupabaseClient<Database>;

export async function upsertAnalystRatings(
  supabase: DbClient,
  ticker: Ticker,
  ratings: ProviderAnalystRatings
): Promise<void> {
  const { error } = await supabase.from("analyst_ratings_snapshot").upsert(
    {
      ticker_id: ticker.id,
      as_of_date: ratings.asOfDate,
      consensus: ratings.consensus,
      strong_buy: ratings.strongBuy,
      buy: ratings.buy,
      hold: ratings.hold,
      sell: ratings.sell,
      strong_sell: ratings.strongSell,
      analyst_count: ratings.analystCount,
      source: ratings.source,
      source_updated_at: ratings.sourceUpdatedAt,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "ticker_id,as_of_date" }
  );

  if (error) {
    throw error;
  }
}

export async function upsertAnalystPriceTargets(
  supabase: DbClient,
  ticker: Ticker,
  targets: ProviderAnalystPriceTargets
): Promise<void> {
  const { error } = await supabase.from("analyst_price_targets_snapshot").upsert(
    {
      ticker_id: ticker.id,
      as_of_date: targets.asOfDate,
      target_low: targets.targetLow,
      target_mean: targets.targetMean,
      target_high: targets.targetHigh,
      target_median: targets.targetMedian,
      analyst_count: targets.analystCount,
      source: targets.source,
      source_updated_at: targets.sourceUpdatedAt,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "ticker_id,as_of_date" }
  );

  if (error) {
    throw error;
  }
}

export async function upsertQuarterlyEarnings(
  supabase: DbClient,
  ticker: Ticker,
  earnings: ProviderEarningsQuarterly[]
): Promise<void> {
  if (earnings.length === 0) {
    return;
  }

  const { error } = await supabase.from("earnings_quarterly").upsert(
    earnings.map((quarter) => ({
      ticker_id: ticker.id,
      fiscal_year: quarter.fiscalYear,
      fiscal_quarter: quarter.fiscalQuarter,
      period: quarter.period,
      report_date: quarter.reportDate,
      eps_actual: quarter.epsActual,
      eps_estimate: quarter.epsEstimate,
      eps_surprise: quarter.epsSurprise,
      eps_surprise_percent: quarter.epsSurprisePercent,
      revenue_actual: quarter.revenueActual,
      revenue_estimate: quarter.revenueEstimate,
      source: quarter.source,
      source_updated_at: quarter.sourceUpdatedAt,
      fetched_at: new Date().toISOString(),
    })),
    { onConflict: "ticker_id,fiscal_year,fiscal_quarter" }
  );

  if (error) {
    throw error;
  }
}

export async function upsertFundamentalsSnapshot(
  supabase: DbClient,
  ticker: Ticker,
  fundamentals: ProviderFundamentalsSnapshot
): Promise<void> {
  const { error } = await supabase.from("fundamentals_snapshot").upsert(
    {
      ticker_id: ticker.id,
      as_of_date: fundamentals.asOfDate,
      market_cap: fundamentals.marketCap,
      pe: fundamentals.pe,
      forward_pe: fundamentals.forwardPe,
      peg: fundamentals.peg,
      pb: fundamentals.pb,
      ps: fundamentals.ps,
      roe: fundamentals.roe,
      roa: fundamentals.roa,
      gross_margin: fundamentals.grossMargin,
      operating_margin: fundamentals.operatingMargin,
      net_margin: fundamentals.netMargin,
      debt_to_equity: fundamentals.debtToEquity,
      dividend_yield: fundamentals.dividendYield,
      beta: fundamentals.beta,
      source: fundamentals.source,
      source_updated_at: fundamentals.sourceUpdatedAt,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "ticker_id,as_of_date" }
  );

  if (error) {
    throw error;
  }
}

export async function upsertFinancialStatements(
  supabase: DbClient,
  ticker: Ticker,
  rows: ProviderFinancialStatementRow[]
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const { error } = await supabase.from("financial_statement_rows").upsert(
    rows.map((row) => ({
      ticker_id: ticker.id,
      statement_type: row.statementType,
      period_type: row.periodType,
      fiscal_date: row.fiscalDate,
      calendar_year: row.calendarYear,
      period: row.period,
      total_revenue: row.totalRevenue,
      gross_profit: row.grossProfit,
      operating_income: row.operatingIncome,
      net_income: row.netIncome,
      total_assets: row.totalAssets,
      total_current_liabilities: row.totalCurrentLiabilities,
      total_equity: row.totalEquity,
      levered_free_cash_flow: row.leveredFreeCashFlow,
      cash_from_operations: row.cashFromOperations,
      cash_from_investing: row.cashFromInvesting,
      cash_from_financing: row.cashFromFinancing,
      net_change_in_cash: row.netChangeInCash,
      source: row.source,
      source_updated_at: row.sourceUpdatedAt,
      fetched_at: new Date().toISOString(),
    })),
    { onConflict: "ticker_id,statement_type,period_type,fiscal_date" }
  );

  if (error) {
    if (isMissingFinancialStatementsTableError(error)) {
      throw new Error(
        "Financial statement table is missing. Run the financial_statement_rows section in src/lib/supabase/schema.sql and src/lib/supabase/rls.sql in Supabase."
      );
    }

    throw error;
  }

  return rows.length;
}

export async function upsertDailyOhlc(
  supabase: DbClient,
  ticker: Ticker,
  candles: ProviderOhlcDaily[]
): Promise<void> {
  if (candles.length === 0) {
    return;
  }

  const { error } = await supabase.from("ohlc_daily").upsert(
    candles.map((candle) => ({
      ticker_id: ticker.id,
      date: candle.date,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      adjusted_close: candle.adjustedClose,
      volume: candle.volume,
      source: candle.source,
      source_updated_at: candle.sourceUpdatedAt,
      fetched_at: new Date().toISOString(),
    })),
    { onConflict: "ticker_id,date" }
  );

  if (error) {
    throw error;
  }
}

export async function upsertCompanyNews(
  supabase: DbClient,
  ticker: Ticker,
  articles: ProviderNewsArticle[]
): Promise<void> {
  const rows = articles.filter((article) => article.url && article.headline);

  if (rows.length === 0) {
    return;
  }

  const fetchedAt = new Date().toISOString();
  let error: { code?: string; message?: string } | null = null;

  try {
    const result = await supabase.from("company_news").upsert(
      rows.map((article) => ({
        ticker_id: ticker.id,
        headline: article.headline,
        summary: article.summary,
        url: article.url,
        image_url: article.imageUrl,
        source_name: article.sourceName,
        published_at: article.publishedAt,
        sentiment_label: article.sentimentLabel,
        sentiment_score: article.sentimentScore,
        source: article.source,
        source_updated_at: article.sourceUpdatedAt,
        fetched_at: fetchedAt,
      })),
      { onConflict: "ticker_id,url" }
    );

    error = result.error;
  } catch (caughtError) {
    if (isMissingCompanyNewsTableError(caughtError)) {
      throw new Error(getMissingCompanyNewsTableMessage());
    }

    throw caughtError;
  }

  if (error) {
    if (isMissingCompanyNewsTableError(error)) {
      throw new Error(getMissingCompanyNewsTableMessage());
    }

    throw error;
  }
}

function isMissingCompanyNewsTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: string; message?: string };

  return (
    record.code === "42P01" ||
    record.code === "PGRST205" ||
    record.message?.includes("company_news") ||
    record.message?.includes("schema cache")
  );
}

function isMissingFinancialStatementsTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: string; message?: string };

  return (
    record.code === "42P01" ||
    record.code === "PGRST205" ||
    record.message?.includes("financial_statement_rows") ||
    record.message?.includes("schema cache")
  );
}

function getMissingCompanyNewsTableMessage() {
  return "Company news table is missing. Run src/lib/supabase/company_news.sql and the company_news section in src/lib/supabase/rls.sql in Supabase.";
}
