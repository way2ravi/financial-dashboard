# Financial Dashboard

Next.js, Supabase, and Vercel stock research dashboard with watchlists, analyst data, daily earnings calendar, quarterly earnings, fundamentals, OHLC cache refresh, user portfolio tracking, and net-worth management.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard?symbol=AAPL`.

## Environment

Copy `.env.example` to `.env.local` and fill in the values:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FINNHUB_API_KEY=
MARKETDATA_API_KEY=
ZERODHA_API_KEY=
ZERODHA_ACCESS_TOKEN=
CRON_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` and provider keys must stay server-only.

`FINNHUB_API_KEY` is required for the admin `Full` refresh, `Quick` refresh, and scheduled cron refresh.
`CRON_SECRET` is required only for `/api/cron/refresh`; use a long random value and set the same value in Vercel.
`MARKETDATA_API_KEY` is included for the planned secondary provider path and can stay blank for the current Finnhub-only build.
`ZERODHA_API_KEY` and `ZERODHA_ACCESS_TOKEN` enable Indian NSE/BSE equity search, quotes, and daily OHLC through Kite Connect. The access token is generated through Zerodha's login/session flow and should be rotated whenever Zerodha invalidates the session.

## Supabase Setup

Run these SQL files in Supabase:

```txt
src/lib/supabase/schema.sql
src/lib/supabase/rls.sql
src/lib/supabase/seed.sql
```

For an existing database that needs the latest portfolio module, including asset-class portfolios for stocks, crypto, commodities, real estate, and other assets, run:

```txt
src/lib/supabase/portfolio.sql
```

For an existing database that only needs the daily earnings calendar module, run:

```txt
src/lib/supabase/earnings_calendar.sql
```

For an existing database that only needs the wealth / net worth module, run:

```txt
src/lib/supabase/wealth.sql
```

## Main Routes

- `/dashboard?symbol=AAPL`
- `/earnings`
- `/portfolio`
- `/wealth` — net worth, assets, liabilities, synced portfolio totals, charts, and guidance
- `/login`
- `/api/earnings/calendar?date=2026-05-28`
- `/api/admin/refresh/[symbol]`
- `/api/cron/refresh`

The dashboard ticker `Load` action searches/caches the symbol and refreshes quote, analyst ratings, price targets, earnings, fundamentals, and OHLC before opening the dashboard. For NSE/BSE symbols, quote and OHLC refresh prefer Zerodha when its environment variables are configured.
The earnings page reads the Supabase earnings calendar cache first and refreshes the selected date from Finnhub when no rows are cached or when `refresh=1` is requested.
The portfolio creation flow supports an asset class: stocks, crypto, commodities, real estate, or other assets. The same portfolio ledger records buy/sell entries for the selected asset class, exposes per-holding history in a popup from the Holdings table with edit/remove actions, and previews quantity, average cost, and P/L before adding a buy/sell/value-update entry. Non-stock portfolios can record value updates without changing quantity or cost basis. Portfolio totals are included automatically in Wealth as read-only rows.

## Verification

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Or run the full verification stack:

```bash
npm.cmd run check
```

## Deployment

Deploy through Vercel. Add all environment variables above to the Vercel project.

`vercel.json` registers a once-daily weekday cron refresh, which is compatible with Vercel Hobby limits:

```txt
0 8 * * 1-5
```

Vercel sends `CRON_SECRET` as `Authorization: Bearer <secret>` when configured.
