# Financial Dashboard

Next.js, Supabase, and Vercel stock research dashboard with watchlists, analyst data, earnings, fundamentals, OHLC cache refresh, and user portfolio tracking.

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
CRON_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` and provider keys must stay server-only.

`FINNHUB_API_KEY` is required for the admin `Full` refresh, `Quick` refresh, and scheduled cron refresh.
`CRON_SECRET` is required only for `/api/cron/refresh`; use a long random value and set the same value in Vercel.
`MARKETDATA_API_KEY` is included for the planned secondary provider path and can stay blank for the current Finnhub-only build.

## Supabase Setup

Run these SQL files in Supabase:

```txt
src/lib/supabase/schema.sql
src/lib/supabase/rls.sql
src/lib/supabase/seed.sql
```

For an existing database that only needs the portfolio module, run:

```txt
src/lib/supabase/portfolio.sql
```

## Main Routes

- `/dashboard?symbol=AAPL`
- `/portfolio`
- `/login`
- `/api/admin/refresh/[symbol]`
- `/api/cron/refresh`

Admin users see dashboard refresh controls:

- `Quick` refreshes quote and OHLC chart data.
- `Full` refreshes quote, analyst ratings, price targets, earnings, fundamentals, and OHLC.

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
