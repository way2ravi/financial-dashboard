import Link from "next/link";
import {
  addCurrentSymbolToWatchlist,
  removeCurrentSymbolFromWatchlist,
} from "@/app/watchlist/actions";
import { getWatchlistForUser } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

type Props = {
  currentSymbol: string;
};

export async function Watchlist({ currentSymbol }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const items = await getWatchlistForUser(supabase, user);
  const containsCurrent = items.some((item) => item.ticker.symbol === currentSymbol);

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Watchlist</h2>
          <p className="mt-1 text-xs text-slate-500">
            {user ? `${items.length} saved tickers` : "Sign in to save tickers"}
          </p>
        </div>
        {user ? (
          <form action={addCurrentSymbolToWatchlist}>
            <input name="symbol" type="hidden" value={currentSymbol} />
            <button
              type="submit"
              disabled={containsCurrent}
              className="h-9 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add
            </button>
          </form>
        ) : null}
      </div>

      {!user ? (
        <Link
          href="/login"
          className="mt-4 block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-900 hover:bg-white"
        >
          Sign in to create your watchlist
        </Link>
      ) : null}

      <div className="mt-4 space-y-2">
        {user && items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
            No saved tickers yet.
          </div>
        ) : null}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div>
              <Link
                href={`/dashboard?symbol=${item.ticker.symbol}`}
                className="font-semibold text-slate-950 hover:underline"
              >
                {item.ticker.symbol}
              </Link>
              <div className="text-xs text-slate-500">{item.ticker.name}</div>
            </div>
            <form action={removeCurrentSymbolFromWatchlist}>
              <input name="symbol" type="hidden" value={item.ticker.symbol} />
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Remove
              </button>
            </form>
          </div>
        ))}
      </div>
    </aside>
  );
}
