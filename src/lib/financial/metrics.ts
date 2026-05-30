/**
 * Normalizes provider fundamentals that may arrive as decimals (0.15) or percents (15).
 */
export function asPercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  if (Math.abs(value) <= 1) {
    return value * 100;
  }

  return value;
}

export function surprisePercent(
  actual: number | null,
  estimate: number | null
): number | null {
  if (actual === null || estimate === null || estimate === 0) {
    return null;
  }

  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

export function epsSurprisePercent(input: {
  epsActual: number | null;
  epsEstimate: number | null;
  epsSurprisePercent: number | null;
}): number | null {
  if (input.epsSurprisePercent !== null && Number.isFinite(input.epsSurprisePercent)) {
    return input.epsSurprisePercent;
  }

  return surprisePercent(input.epsActual, input.epsEstimate);
}
