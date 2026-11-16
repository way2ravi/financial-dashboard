import type { Score, Snapshot } from "../types";
import type { technicalEvidence } from "./technical";
export const methodologyVersion = "ii-evidence-1.0.0";
export const defaultWeights = {
  ownership: 30,
  breadth: 20,
  significant: 15,
  technical: 15,
  relativeStrength: 10,
  quality: 10,
};
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function validateWeights(weights: Record<string, number>) {
  return (
    Object.keys(weights).length === 6 &&
    Object.keys(defaultWeights).every(
      (k) => Number.isFinite(weights[k]) && weights[k] >= 0,
    ) &&
    Math.abs(Object.values(weights).reduce((s, v) => s + v, 0) - 100) < 0.001
  );
}
export function scoreEvidence(
  snapshot: Snapshot | undefined,
  technical: ReturnType<typeof technicalEvidence>,
  weights: Record<string, number> = defaultWeights,
  now = Date.now(),
): Score {
  if (!validateWeights(weights))
    throw new Error(
      "Scoring weights must contain all six components and sum to 100",
    );
  const rows = snapshot?.changes ?? [],
    comparable = Boolean(snapshot?.comparable),
    age = snapshot
      ? (now - Date.parse(snapshot.reportDate)) / 86400000
      : Infinity;
  const valid = comparable && age <= 150 && age >= 0;
  const previous = rows.reduce((sum, r) => sum + (r.previous ?? 0), 0);
  const net = rows.reduce((sum, r) => sum + (r.delta ?? 0), 0);
  const groups = new Set(
    rows.filter((r) => r.independentGroup).map((r) => r.independentGroup),
  );
  const breadth = rows.length
    ? (rows.filter((r) => (r.delta ?? 0) > 0).length -
        rows.filter((r) => (r.delta ?? 0) < 0).length) /
      rows.length
    : 0;
  const major = rows.filter((r) => (r.previous ?? 0) >= previous * 0.05);
  const components: Record<string, number | null> = {
    ownership:
      valid && previous > 0 ? clamp(50 + (net / previous) * 100) : null,
    breadth: valid ? clamp(50 + breadth * 50) : null,
    significant:
      valid && major.length
        ? clamp(
            50 +
              (major.reduce((s, r) => s + (r.delta ?? 0), 0) /
                Math.max(
                  1,
                  major.reduce((s, r) => s + (r.previous ?? 0), 0),
                )) *
                100,
          )
        : null,
    technical:
      technical?.cmf != null && technical.macd != null
        ? clamp(50 + technical.cmf * 30 + Math.sign(technical.macd) * 20)
        : null,
    relativeStrength:
      technical?.relativeStrength != null
        ? clamp(50 + technical.relativeStrength * 2)
        : null,
    quality:
      snapshot && age >= 0 && age <= 150
        ? clamp(100 - (age / 150) * 40 - (comparable ? 0 : 40))
        : null,
  };
  const missing = Object.keys(components).filter((k) => components[k] === null);
  // No implicit 50 for missing data, and no reweighting an incomplete score.
  const total = missing.length
    ? null
    : Math.round(
        Object.entries(components).reduce(
          (s, [k, v]) => s + ((v ?? 0) * weights[k]) / 100,
          0,
        ),
      );
  const strongAllowed =
    groups.size >= 3 && rows.length >= 3 && Boolean(technical) && valid;
  let label =
    total === null
      ? "Insufficient Data"
      : total >= 80
        ? "Strong Accumulation"
        : total >= 65
          ? "Accumulation"
          : total >= 45
            ? "Neutral / Mixed"
            : total >= 25
              ? "Distribution"
              : "Strong Distribution";
  if (
    label === "Strong Accumulation" &&
    (!strongAllowed ||
      breadth <= 0 ||
      net <= 0 ||
      !(technical && (technical.cmf ?? 0) > 0 && (technical.macd ?? 0) > 0))
  )
    label = "Neutral / Mixed";
  if (
    label === "Strong Distribution" &&
    (!strongAllowed ||
      breadth >= 0 ||
      net >= 0 ||
      !(technical && (technical.cmf ?? 0) < 0 && (technical.macd ?? 0) < 0))
  )
    label = "Neutral / Mixed";
  return {
    total,
    label,
    confidence:
      total === null
        ? "Unavailable"
        : strongAllowed && age <= 100
          ? "High"
          : rows.length >= 3
            ? "Medium"
            : "Low",
    components,
    missing,
    version: methodologyVersion,
    weights,
    observedAt: new Date(now).toISOString(),
  };
}
