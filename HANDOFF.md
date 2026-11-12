# Financial Dashboard Handoff

For the current full status, including completed work, verification status, and pending items, see [PROJECT_STATUS.md](./PROJECT_STATUS.md). The notes below are an older milestone handoff and may not include the latest wealth, market, Zerodha, screener, and multi-asset portfolio work.

## Built

- Layered Next.js architecture with providers, repositories, services, Supabase clients, and typed market models.
- Supabase schema and RLS for users, watchlists, cached market data, provider logs, portfolios, and portfolio transactions.
- Dashboard page with quote overview, analyst ratings, price targets, earnings, fundamentals, OHLC chart, watchlist, freshness chips, and sample-data fallback warning.
- Portfolio page with multiple portfolios, buy/sell ledger, average-cost holdings, realized/unrealized performance, and page-level form feedback.
- Email/password Supabase auth, shared app navigation, light and dark-blue themes, and mobile resilience improvements.
- Finnhub-backed refresh services for quote, analyst ratings, price targets, earnings, fundamentals, and OHLC data.
- Admin dashboard refresh controls for `Quick` and `Full` refreshes.
- Protected cron refresh endpoint with symbol-level failure isolation.
- Enhanced per-stock Earnings tab with latest-report classification, four-quarter beat rate, EPS consistency, year-over-year growth, and market-reaction analysis.
- Verification scripts: `npm.cmd run check` runs lint, TypeScript, and production build.

## Supabase Setup

Run these SQL files in Supabase:

```txt
src/lib/supabase/schema.sql
src/lib/supabase/rls.sql
src/lib/supabase/seed.sql
```

For an existing project that only needs portfolio tables and policies:

```txt
src/lib/supabase/portfolio.sql
```

## Required Environment Variables

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FINNHUB_API_KEY=
CRON_SECRET=
```

`MARKETDATA_API_KEY` is reserved for a future secondary provider and can stay blank for now.

## Verify

```txt
npm.cmd run check
```

Last verified on 2026-09-03: ESLint, TypeScript, and the Next.js 16.2.6 production build passed. `npm install` reported seven high-severity advisories that still require a reviewed dependency-upgrade pass.

## Next Recommended Steps

1. Apply the Supabase SQL files if they have not already been applied.
2. Confirm the signed-in admin user's `users_profile.role` is set to `admin`.
3. Add Vercel environment variables.
4. Test `Full` refresh for `AAPL` from the dashboard as an admin.
5. Push the completed changes to GitHub once you are happy with the browser output.
