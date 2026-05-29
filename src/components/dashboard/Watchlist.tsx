import Link from "next/link";
import {
  addCurrentSymbolToWatchlist,
  removeCurrentSymbolFromWatchlist,
} from "@/app/watchlist/actions";
import { getWatchlistForUser } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import { TickerLogo } from "./TickerLogo";

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
    <section className="min-w-0 rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold app-heading">Watchlist</h2>
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
              className="h-8 rounded-lg app-primary-button px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              Add
            </button>
          </form>
        ) : null}
      </div>

      {!user ? (
        <Link
          href="/login"
          className="mt-3 block rounded-lg border app-subtle p-3 text-xs font-semibold app-heading hover:bg-[var(--app-surface)]"
        >
          Sign in to create your watchlist
        </Link>
      ) : null}

      <div className="mt-3 space-y-2">
        {user && items.length === 0 ? (
          <div className="rounded-lg border border-dashed app-subtle p-3 text-xs app-muted">
            No saved tickers yet.
          </div>
        ) : null}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border app-subtle p-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <TickerLogo ticker={item.ticker} size="sm" />
              <div className="min-w-0">
                <Link
                  href={`/dashboard?symbol=${item.ticker.symbol}`}
                  className="text-sm font-semibold app-heading hover:underline"
                >
                  {item.ticker.symbol}
                </Link>
                <div className="truncate text-xs app-muted">{item.ticker.name}</div>
              </div>
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
    </section>
  );
}
