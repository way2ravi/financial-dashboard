import type { DashboardData } from "@/lib/types/market";
import { hasActionableLanguage, type AIContentSettings } from "./policy";

export function filterDashboardContent(data: DashboardData, policy: AIContentSettings): DashboardData {
  return {
    ticker: data.ticker,
    quote: data.quote,
    analystPriceTargets: data.analystPriceTargets,
    earnings: data.earnings,
    fundamentals: data.fundamentals,
    financialStatements: data.financialStatements,
    ohlc: data.ohlc,
    analystRatings: policy.recommendationsEnabled && policy.buySellSignalsEnabled ? data.analystRatings : null,
    // Analyst estimates are retained as historical third-party data, not order levels.
    news: !policy.financialNewsEnabled ? [] : data.news
      .filter(article => !hasActionableLanguage(`${article.headline} ${article.summary ?? ""} ${article.sourceName ?? ""}`))
      .map(article => ({ ...article, sentimentLabel: null, sentimentScore: null })),
  };
}
