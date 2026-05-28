import { jsonError } from "@/app/api/_shared/jsonError";
import { getDashboardBySymbol } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;
    const supabase = await createClient();
    const dashboard = await getDashboardBySymbol(supabase, symbol);

    return Response.json({ data: dashboard });
  } catch (error) {
    return jsonError(error);
  }
}

