import Link from "next/link";
import { removeCurrentSymbolFromWatchlist } from "@/app/watchlist/actions";
import { AppNav } from "@/components/dashboard/AppNav";
import { AuthStatus } from "@/components/dashboard/AuthStatus";
import { PageMessage } from "@/components/dashboard/PageMessage";
import { ThemeSwitcher } from "@/components/dashboard/ThemeSwitcher";
import { TickerLogo } from "@/components/dashboard/TickerLogo";
import { TickerSearch } from "@/components/dashboard/TickerSearch";
import { getWatchlistForUser } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { WatchlistItem } from "@/lib/types";

type Props = {
  searchParams: Promise<{
    error?: string | string[];
    notice?: string | string[];
  }>;
};

export default async function WatchlistPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const watchlist = await getWatchlistForUser(supabase, user);
  const message = getPageMessage(params);

  return (
    <main className="min-h-screen app-bg">
      <header className="border-b app-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal app-heading">Watchlist</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 app-muted">
              Your saved tickers, separated from the dashboard so the stock view stays focused.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <AppNav current="watchlist" />
            <ThemeSwitcher />
            <AuthStatus />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <PageMessage message={message} />
        <section className="rounded-lg border app-surface p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold app-heading">Saved Stocks</h2>
              <p className="mt-1 text-xs leading-5 app-muted">
                Search from the dashboard to load a ticker, then add it here for repeat tracking.
              </p>
            </div>
            <div className="lg:w-[360px]">
              <TickerSearch initialSymbol="" />
            </div>
          </div>
        </section>

        {!user ? <SignInPrompt /> : <WatchlistTable watchlist={watchlist} />}
      </div>
    </main>
  );
}

function SignInPrompt() {
  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold app-heading">Sign in required</h2>
      <p className="mt-1 text-xs leading-5 app-muted">
        Sign in to save and manage your watchlist.
      </p>
      <Link
        className="mt-3 inline-flex h-9 items-center rounded-lg border app-primary-button px-4 text-xs font-semibold"
        href="/login"
      >
        Sign in
      </Link>
    </section>
  );
}

function WatchlistTable({ watchlist }: { watchlist: WatchlistItem[] }) {
  if (watchlist.length === 0) {
    return (
      <section className="rounded-lg border app-surface p-4 text-xs app-muted shadow-sm">
        No tickers saved yet.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border app-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-subtle">
            <tr className="uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Ticker</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Company</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Exchange</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Sector</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((item) => (
              <tr key={item.id} className="app-muted transition hover:bg-[var(--app-surface-muted)]">
                <td className="border-b app-border-soft px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <TickerLogo ticker={item.ticker} size="sm" />
                    <Link
                      className="font-semibold app-heading hover:underline"
                      href={`/dashboard?symbol=${item.ticker.symbol}&autoload=1`}
                    >
                      {item.ticker.symbol}
                    </Link>
                  </div>
                </td>
                <td className="max-w-[320px] truncate border-b app-border-soft px-3 py-2.5">
                  {item.ticker.name ?? "-"}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  {item.ticker.exchange ?? "-"}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  {item.ticker.sector ?? "-"}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  <form action={removeCurrentSymbolFromWatchlist}>
                    <input name="symbol" type="hidden" value={item.ticker.symbol} />
                    <input name="return_to" type="hidden" value="/watchlist" />
                    <button
                      className="h-8 rounded-md border app-secondary-button px-3 text-xs font-semibold"
                      type="submit"
                    >
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getPageMessage(searchParams: Awaited<Props["searchParams"]>) {
  const error = getSearchParam(searchParams.error);
  const notice = getSearchParam(searchParams.notice);

  if (error) {
    return { tone: "error" as const, text: error };
  }

  if (notice) {
    return { tone: "notice" as const, text: notice };
  }

  return null;
}

function getSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
