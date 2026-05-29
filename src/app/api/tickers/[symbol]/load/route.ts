import { jsonError } from "@/app/api/_shared/jsonError";
import {
  refreshMarketDataForSymbol,
  searchTickerDirectory,
  summarizeRefreshResults,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;
    const normalizedSymbol = symbol.trim().toUpperCase();
    const supabase = createAdminClient();

    await searchTickerDirectory(supabase, normalizedSymbol, 6);
    const results = await refreshMarketDataForSymbol(supabase, normalizedSymbol);

    return Response.json({
      data: {
        summary: summarizeRefreshResults(results),
        results,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
