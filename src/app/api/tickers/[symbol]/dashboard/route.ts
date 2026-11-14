import { jsonError } from "@/app/api/_shared/jsonError";
import { getDashboardBySymbol } from "@/lib/services";
import { AppError } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import { getContentPolicy } from "@/lib/content/settings";
import { filterDashboardContent } from "@/lib/content/dashboardPolicy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError("Sign in to view dashboard data.", 401);
    }

    const dashboard = await getDashboardBySymbol(supabase, symbol);

    const policy = await getContentPolicy();
    const filtered = filterDashboardContent(dashboard, policy);
    const information = { ...filtered } as Partial<typeof filtered>;
    if (!policy.buySellSignalsEnabled) delete information.analystRatings;
    return Response.json({ data: information }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
