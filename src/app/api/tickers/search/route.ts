import { jsonError } from "@/app/api/_shared/jsonError";
import { searchTickerDirectory } from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? "10");
    const supabase = createAdminClient();
    const tickers = await searchTickerDirectory(supabase, query, limit);

    return Response.json({ data: tickers });
  } catch (error) {
    return jsonError(error);
  }
}
