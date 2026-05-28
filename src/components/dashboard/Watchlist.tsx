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
    <aside className="min-w-0 self-start rounded-lg border app-surface p-5 lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold app-heading">Watchlist</h2>
          <p className="mt-1 text-xs app-muted">
            {user ? `${items.length} saved tickers` : "Sign in to save tickers"}
          </p>
        </div>
        {user ? (
          <form action={addCurrentSymbolToWatchlist}>
            <input name="symbol" type="hidden" value={currentSymbol} />
            <button
              type="submit"
              disabled={containsCurrent}
              className="h-9 rounded-lg app-primary-button px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              Add
            </button>
          </form>
        ) : null}
      </div>

      {!user ? (
        <Link
          href="/login"
          className="mt-4 block rounded-lg border app-subtle p-3 text-sm font-semibold app-heading hover:bg-[var(--app-surface)]"
        >
          Sign in to create your watchlist
        </Link>
      ) : null}

      <div className="mt-4 space-y-2">
        {user && items.length === 0 ? (
          <div className="rounded-lg border border-dashed app-subtle p-3 text-sm app-muted">
            No saved tickers yet.
          </div>
        ) : null}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border app-subtle p-3"
          >
            <div className="min-w-0">
              <Link
                href={`/dashboard?symbol=${item.ticker.symbol}`}
                className="font-semibold app-heading hover:underline"
              >
                {item.ticker.symbol}
              </Link>
              <div className="truncate text-xs app-muted">{item.ticker.name}</div>
            </div>
            <form action={removeCurrentSymbolFromWatchlist} className="shrink-0">
              <input name="symbol" type="hidden" value={item.ticker.symbol} />
              <button
                type="submit"
                className="rounded-lg border app-secondary-button px-2 py-1 text-xs font-semibold"
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
