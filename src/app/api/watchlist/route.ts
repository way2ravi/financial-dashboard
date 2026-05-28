import { jsonError } from "@/app/api/_shared/jsonError";
import {
  addSymbolToWatchlist,
  getWatchlistForUser,
  removeSymbolFromWatchlist,
} from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const watchlist = await getWatchlistForUser(supabase, user);

    return Response.json({ data: watchlist });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await addSymbolToWatchlist(supabase, user, String(symbol ?? ""));

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { symbol } = await request.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await removeSymbolFromWatchlist(supabase, user, String(symbol ?? ""));

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

