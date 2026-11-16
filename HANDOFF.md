# Way2Investing Handoff

Updated: 16 November 2026. Main record: [PROJECT_STATUS.md](./PROJECT_STATUS.md).

## Current Checkpoint

Local preview: http://localhost:3004/institutional-intelligence.
Owner: `way2investing9@gmail.com`. Sign-in and password recovery work. The public
site remains coming-soon, Information Only Mode remains on, comparisons remain
unverified, and private scheduled jobs remain disabled.

- Berkshire: March and June 13Fs parsed; GOOGL mapped.
- Vanguard Capital Management: March original and both amendments plus June
  parsed; all 14 watchlist stocks mapped on both dates. Not all Vanguard affiliates.
- BlackRock: registered but not imported; March quarantined, June discovered.
- 28 point-in-time mappings in total; no new corporate-action or independence attestations.
- Finnhub quotes work; historical splits denied by current access.
- Massive read-only split check works; zero GOOGL split events for March-June.
  This is not proof of complete corporate-action coverage.

## Next Task

Build a bounded large-filing worker for BlackRock's approximately 23 MB tables.
Do not raise the 12 MB web-import limit just to clear the error. Stage and
reconcile files, commit atomically, test idempotency/amendments/retries, and check
interactive-read capacity. Then review additional affiliates/overlap, complete
action/identifier continuity and import licensed historical/benchmark market data.

No SQL reruns, key re-entry or additional subscriptions are needed from the owner
now. Do not repeatedly retry oversized files or tick coverage without evidence.

## Verification and Release

Latest code checks: 61 tests, scoped ESLint, production build with TypeScript, and
desktop/tablet/mobile browser checks passed. Live SEC/provider and database
read-back checks were separate. Documentation changes did not rerun application tests.
The backup exports/hashes are verified, but restore testing remains pending.
Known critical Next.js dependency advisories require a reviewed upgrade before
deployment. Review branch: `codex/intelligence-information-only-beta1`; main and
production are not approved for this release. Preview status needs a separate check.

See [coverage details](docs/PRIVATE-COVERAGE-STATUS.md),
[backfill steps](docs/BACKFILL-PRIVATE-13F.md),
[split check](docs/CHECK-PRIVATE-SPLITS.md), and
[recovery](docs/RESET-PRIVATE-PASSWORD.md).

## Historical September Handoff

The remainder records the older milestone only. Its setup and next-step lists
are not current instructions: do not rerun SQL or repeat completed owner setup.

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
