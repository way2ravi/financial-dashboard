import type { RefreshResult } from "@/lib/types";

export function summarizeRefreshResults(results: RefreshResult[]) {
  const failed = results.filter((result) => result.status === "error").length;
  const updated = results.reduce((total, result) => total + result.updated, 0);

  return {
    failed,
    succeeded: results.length - failed,
    totalModules: results.length,
    updated,
  };
}
