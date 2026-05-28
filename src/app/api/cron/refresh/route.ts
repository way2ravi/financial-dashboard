import { jsonError } from "@/app/api/_shared/jsonError";
import {
  assertCronAccess,
  parseRefreshScope,
  refreshActiveMarketData,
  summarizeRefreshResults,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    assertCronAccess(request);

    const url = new URL(request.url);
    const limit = getLimit(url);
    const symbols = getSymbols(url);
    const scope = getScope(url);
    const supabase = createAdminClient();
    const results = await refreshActiveMarketData(supabase, {
      limit,
      symbols,
      scope,
    });

    return Response.json({
      data: {
        refreshed: results.length,
        summary: summarizeCronResults(results),
        results,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

function summarizeCronResults(
  results: Awaited<ReturnType<typeof refreshActiveMarketData>>
) {
  const modules = results.flatMap((result) => result.results);

  return summarizeRefreshResults(modules);
}

function getLimit(url: URL) {
  const requestedLimit = Number(url.searchParams.get("limit") ?? "5");

  if (!Number.isFinite(requestedLimit)) {
    return 5;
  }

  return Math.min(Math.max(Math.trunc(requestedLimit), 1), 10);
}

function getSymbols(url: URL) {
  const rawSymbols = url.searchParams.get("symbols");

  if (!rawSymbols) {
    return undefined;
  }

  return rawSymbols
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

function getScope(url: URL) {
  const modules = url.searchParams
    .get("modules")
    ?.split(",")
    .map((module) => module.trim())
    .filter(Boolean);

  if (!modules?.length) {
    return undefined;
  }

  return parseRefreshScope(modules);
}
