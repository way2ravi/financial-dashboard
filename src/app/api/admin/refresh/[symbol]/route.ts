import { jsonError } from "@/app/api/_shared/jsonError";
import { refreshQuoteForSymbol, requireAdmin } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;
    const supabase = await createClient();

    await requireAdmin(supabase);

    const quote = await refreshQuoteForSymbol(supabase, symbol);

    return Response.json({
      data: {
        quote,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

