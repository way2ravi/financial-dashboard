import { jsonError } from "@/app/api/_shared/jsonError";
import { getDashboardBySymbol } from "@/lib/services";
import { AppError } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

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

    return Response.json({ data: dashboard });
  } catch (error) {
    return jsonError(error);
  }
}
