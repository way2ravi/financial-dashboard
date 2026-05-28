import { jsonError } from "@/app/api/_shared/jsonError";
import {
  parseRefreshScope,
  refreshMarketDataForSymbol,
  requireAdmin,
  summarizeRefreshResults,
} from "@/lib/services";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;
    const supabase = await createClient();

    await requireAdmin(supabase);

    const scope = await getScope(request);
    const adminSupabase = createAdminClient();
    const results = await refreshMarketDataForSymbol(adminSupabase, symbol, scope);

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

async function getScope(request: Request) {
  const body = await getBody(request);
  const modules = Array.isArray(body.modules)
    ? body.modules.filter((module): module is string => typeof module === "string")
    : [];

  return parseRefreshScope(modules);
}

async function getBody(request: Request): Promise<{ modules?: unknown }> {
  try {
    return (await request.json()) as { modules?: unknown };
  } catch {
    return {};
  }
}
