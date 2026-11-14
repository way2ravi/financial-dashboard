export const recommendationFeatures = [
  "buySellSignalsEnabled", "stopLossRecommendationsEnabled",
  "takeProfitRecommendationsEnabled", "entryPriceRecommendationsEnabled",
  "stockRankingsEnabled", "personalisedAdviceEnabled",
] as const;

export type RecommendationFeature = typeof recommendationFeatures[number];
export type AIContentSettings = Record<RecommendationFeature, boolean> & {
  recommendationsEnabled: boolean;
  informationalAnalysisEnabled: boolean;
  financialNewsEnabled: boolean;
};
export const defaultSettings: AIContentSettings = {
  recommendationsEnabled: false,
  buySellSignalsEnabled: false,
  stopLossRecommendationsEnabled: false,
  takeProfitRecommendationsEnabled: false,
  entryPriceRecommendationsEnabled: false,
  stockRankingsEnabled: false,
  personalisedAdviceEnabled: false,
  informationalAnalysisEnabled: true,
  financialNewsEnabled: true,
};
export type ComplianceApproval = {
  status: "pending" | "approved" | "rejected";
  approvedAt: string;
  expiresAt: string;
  approvedFeatures: RecommendationFeature[];
  approverIdentity: string;
  jurisdiction: string;
  evidence: string;
};

export function normalizeSettings(value: unknown): AIContentSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...defaultSettings };
  const record = value as Record<string, unknown>;
  // A partial or malformed response is never interpreted as permission to advise.
  if (Object.keys(defaultSettings).some(key => typeof record[key] !== "boolean")) return { ...defaultSettings };
  return Object.fromEntries(Object.keys(defaultSettings).map(key => [key, record[key]])) as AIContentSettings;
}

export function effectiveSettings(settings: AIContentSettings, approval: ComplianceApproval | null, now = Date.now()): AIContentSettings {
  const valid = approval?.status === "approved" && Boolean(approval.approverIdentity?.trim()) &&
    Boolean(approval.jurisdiction?.trim()) && Boolean(approval.evidence?.trim()) &&
    Number.isFinite(Date.parse(approval.approvedAt)) && Date.parse(approval.approvedAt) <= now &&
    Number.isFinite(Date.parse(approval.expiresAt)) && Date.parse(approval.expiresAt) > now &&
    Array.isArray(approval.approvedFeatures);
  const result = { ...settings };
  for (const feature of recommendationFeatures) {
    result[feature] = Boolean(settings.recommendationsEnabled && valid && settings[feature] && approval?.approvedFeatures?.includes(feature));
  }
  result.recommendationsEnabled = recommendationFeatures.some(feature => result[feature]);
  return result;
}

export const informationDisclosure = "Way2Investing provides financial market information, technical analysis and educational research. Calculated price levels are for informational purposes and are not personalised investment recommendations.";

// Defense in depth for provider-supplied free text, not an AI compliance classifier.
export function hasActionableLanguage(text: string): boolean {
  return /\b(buy|sell|hold|accumulate|dump|purchase|short this|go long|go short|stop[ -]?loss|take[ -]?profit|price targets?|recommend\w*|best stocks?|entry point|entry price|trading strateg\w*|profit.taking|you should|good default|best default)\b/i.test(text);
}

export type ContentEnvelope<T> = {
  kind: "information" | "technicalAnalysis" | "financialNews" | RecommendationFeature;
  payload: T;
};

// Every future notification, report or email must re-read policy at delivery,
// never reuse the policy under which a queued/cached item was created.
export function filterContent<T>(items: ContentEnvelope<T>[], policy: AIContentSettings): ContentEnvelope<T>[] {
  return items.filter(item => {
    if (item.kind === "information") return !hasActionableLanguage(JSON.stringify(item.payload) ?? "");
    if (item.kind === "technicalAnalysis") return policy.informationalAnalysisEnabled && !hasActionableLanguage(JSON.stringify(item.payload) ?? "");
    if (item.kind === "financialNews") return policy.financialNewsEnabled && !hasActionableLanguage(JSON.stringify(item.payload) ?? "");
    return policy.recommendationsEnabled && policy[item.kind] === true;
  });
}
