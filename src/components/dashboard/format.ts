export function formatCurrency(value: number | null | undefined, compact = false) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${formatNumber(value, digits)}%`;
}

