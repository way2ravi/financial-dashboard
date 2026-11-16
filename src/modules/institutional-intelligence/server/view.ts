import "server-only";
import { getContentPolicy } from "@/lib/content/settings";
import type { ResearchData } from "../types";
import { buildSnapshots } from "../engine/ownership";
import { technicalEvidence } from "../engine/technical";
import { scoreEvidence, defaultWeights } from "../engine/score";
import type { ResearchClient } from "./db";

export async function researchView(data: ResearchData, client: ResearchClient) {
  const policy = await getContentPolicy();
  const settings = await client
    .from("ii_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const weights:Record<string,number> = settings.data?.weights ?? defaultWeights;
  const rows = data.securities
    .filter((s) => s.ticker !== "SPY")
    .map((security) => {
      const history = buildSnapshots(data, security.ticker);
      const snapshot = history.at(-1);
      const prices = data.prices
        .filter((p) => p.ticker === security.ticker)
        .sort((a, b) => a.date.localeCompare(b.date));
      const technical = policy.informationalAnalysisEnabled
        ? technicalEvidence(
            prices,
            data.prices.filter((p) => p.ticker === "SPY"),
          )
        : null;
      const score = scoreEvidence(snapshot, technical, weights);
      if (!policy.buySellSignalsEnabled) {
        score.label = "Directional signals disabled";
        score.total = null;
      }
      if (!policy.informationalAnalysisEnabled) {
        score.total = null;
        score.components = {};
      }
      const latest = prices.at(-1),
        previous = prices.at(-2),
        week = prices.at(-6);
      const performance = (value: number | undefined) =>
        latest && value ? (latest.close / value - 1) * 100 : null;
      return {
        security,
        watched: data.watchlist.includes(security.ticker),
        history,
        snapshot: snapshot ?? null,
        technical,
        score,
        latestPrice: latest?.close ?? null,
        daily: performance(previous?.close),
        weekly: performance(week?.close),
        volume: latest?.volume ?? null,
        refreshedAt: latest?.fetched_at ?? null,
        marketSource: latest?.source_url ?? null,
        prices: policy.informationalAnalysisEnabled ? prices.slice(-250) : [],
        scoreHistory: policy.buySellSignalsEnabled
          ? data.scoreHistory.filter(
              (s) =>
                s.ticker === security.ticker &&
                s.score.version === score.version &&
                Object.keys(weights).every(
                  (key) => s.score.weights[key] === weights[key],
                ),
            )
          : [],
      };
    });
  return {
    rows,
    institutions: data.institutions,
    filings: data.filings.map((f) => ({
      accession: f.accession,
      cik: f.cik,
      form: f.form,
      report_date: f.report_date,
      filed_date: f.filed_date,
      source_url: f.source_url,
      status: f.status,
      amendment: f.amendment,
      detected_at: f.detected_at,
    })),
    alerts: data.alerts.filter(
      (a) =>
        policy.informationalAnalysisEnabled ||
        !a.kind.startsWith("Unusual volume"),
    ),
    jobs: data.jobs,
    setupError: data.setupError,
    configuration: {
      secConfigured: Boolean(process.env.SEC_USER_AGENT),
      marketBars: data.prices.length,
      mappings: data.identifiers.length,
      weights,
      alertThreshold: settings.data?.alert_threshold ?? 25,
      volumeThreshold: settings.data?.volume_threshold ?? 2,
    },
    mode: policy.recommendationsEnabled
      ? "Approved content controls"
      : "Information Only Mode",
    canShowSignals: policy.buySellSignalsEnabled,
    canRank: policy.stockRankingsEnabled,
  };
}
export type ResearchView = Awaited<ReturnType<typeof researchView>>;
