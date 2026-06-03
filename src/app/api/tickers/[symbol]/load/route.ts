import { jsonError } from "@/app/api/_shared/jsonError";
import {
  AppError,
  refreshMarketDataForSymbol,
  searchTickerDirectory,
  summarizeRefreshResults,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;
    const normalizedSymbol = symbol.trim().toUpperCase();
    const sessionSupabase = await createClient();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();

    if (!user) {
      throw new AppError("Sign in to load market data.", 401);
    }

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
