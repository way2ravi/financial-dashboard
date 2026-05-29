import type { RefreshScope } from "@/lib/types";

const refreshModules = [
  "profile",
  "quote",
  "analystRatings",
  "priceTargets",
  "earnings",
  "fundamentals",
  "ohlc",
  "news",
] as const;

export function parseRefreshScope(modules: string[]): RefreshScope | undefined {
  const selected = modules
    .map((module) => module.trim())
    .filter((module): module is keyof RefreshScope =>
      refreshModules.includes(module as keyof RefreshScope)
    );

  if (selected.length === 0) {
    return undefined;
  }

  return Object.fromEntries(selected.map((module) => [module, true]));
}
