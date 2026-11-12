import { jsonError } from "@/app/api/_shared/jsonError";
import { searchTickerDirectory } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { searchTickers } from "@/lib/repositories";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? "10");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = await createClient();
      const tickers = await searchTickers(supabase, query.trim(), Math.min(Math.max(Number.isFinite(limit) ? Math.trunc(limit) : 10, 1), 25));
      return Response.json({ data: tickers });
    }

    const supabase = createAdminClient();
    const tickers = await searchTickerDirectory(supabase, query, limit);

    return Response.json({ data: tickers });
  } catch (error) {
    return jsonError(error);
  }
}
