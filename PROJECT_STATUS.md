# Financial Dashboard Project Status

Last reviewed: 2026-11-16

This document summarizes what has been built in this repository, what is needed to run it, and what remains pending.

## Current State

The project is a Next.js 16 App Router financial dashboard backed by Supabase and designed for Vercel deployment. It includes stock research, cached market data, watchlists, daily earnings, stock screening, portfolio tracking, wealth/net-worth tracking, and a consolidated personal dashboard.

Recent work is running locally at `http://localhost:3004/institutional-intelligence`.
The public domain remains in coming-soon mode. The work is prepared on review
branch `codex/intelligence-information-only-beta1`, not merged to main or approved
for production deployment. Its Supabase migrations and research-data changes are
live in the configured database. Preview deployment status needs a separate check.

The latest code verification passed 61 automated tests, scoped ESLint, a production
build including TypeScript, and desktop/tablet/mobile browser checks. Next.js
remains 16.2.6 with previously identified critical dependency advisories unresolved.
The old September advisory count is not a current audit. Rerun the audit and apply
reviewed upgrades before deployment; do not use an unreviewed forced fix.

Pre-push audit on 16 November: 17 advisories (1 critical, 8 high, 8 moderate).
No dependency fixes were applied. See the
[review-branch test checklist](docs/REVIEW-BRANCH-TESTING.md) before hosted testing.

## November Checkpoint

| Area | Current state |
| --- | --- |
| Information Only Mode | Applied; recommendation permissions remain off |
| Private owner | `way2investing9@gmail.com`; confirmed email and owner grant checked |
| Password recovery | Implemented, tested, and confirmed working by owner |
| Database setup | Content controls and private migrations applied; owner transferred |
| Backup | Roles/schema/data exports and hashes verified; restore rehearsal pending |
| Permission checks | Owner/previous-owner/anonymous database checks passed during setup |
| Berkshire | March and June 2026 13Fs parsed; GOOGL mapped at both dates |
| Vanguard | Capital Management only; March original plus two amendments and June parsed |
| Watchlist coverage | 14 stocks mapped at each quarter-end; 28 dated mapping records |
| BlackRock | Registered; March quarantined and June discovered, neither imported |
| Finnhub | Local quotes passed; historical splits denied by current access |
| Massive | Read-only split check working; live GOOGL query returned zero events |
| Corporate actions | No coverage attestations; comparisons remain unverified |
| Historical market bars | Not imported into the private module |
| Private scheduled jobs | Disabled |
| Release | Security/configuration checks and approved push/deployment pending |

Vanguard Capital Management is not all Vanguard affiliates. Tracked-manager counts
are not total institutional ownership and affiliated entities must not be counted
as independent without evidence. All snapshots remain informational.

## Next Actions In Order

1. Build a bounded large-filing worker for BlackRock's approximately 23 MB tables;
   retain size safeguards, stage and reconcile complete files, commit atomically,
   test retries/amendments and verify interactive-read capacity. Do not keep
   retrying oversized filings or simply raise the web-request limit.
2. Verify additional Vanguard affiliates and reporting overlap before expanding
   coverage or assigning independence groups.
3. Establish complete corporate-action and identifier-continuity evidence before
   enabling quarter comparisons. An empty split query is not a full attestation.
4. Confirm data rights and import historical prices/volumes plus benchmark bars.
5. Address dependency advisories, rerun tests and recheck hosted auth/RLS/settings.
6. Only then prepare an approved GitHub push and Vercel deployment. Reopening the
   public site and enabling scheduled jobs remain separate decisions.

No manual SQL reruns or new subscriptions are currently required from the owner.
Refresh Configuration/Watchlist to inspect existing observations.

Guides: [coverage detail](docs/PRIVATE-COVERAGE-STATUS.md),
[historical backfill](docs/BACKFILL-PRIVATE-13F.md),
[split check](docs/CHECK-PRIVATE-SPLITS.md),
[recovery](docs/RESET-PRIVATE-PASSWORD.md), and
[private architecture](src/modules/institutional-intelligence/README.md).

## Completed Work

The public-module inventory below records implemented capabilities. Some older
advice-oriented displays are disabled or replaced by neutral views under the
current global Information Only policy; implemented does not mean enabled.

### Foundation and Architecture

- Built a layered TypeScript architecture:
  - UI components in `src/components`
  - App routes and route handlers in `src/app`
  - Business logic in `src/lib/services`
  - Supabase access in `src/lib/repositories`
  - External API adapters in `src/lib/providers`
  - Shared market, portfolio, wealth, currency, and database types in `src/lib/types`
- Added Supabase browser, server, and admin clients.
- Added typed repository mappers for tickers, quotes, analyst data, earnings, fundamentals, OHLC, company news, watchlists, portfolios, and wealth.
- Added app-wide navigation/header components and responsive styling in `src/app/globals.css`.
- Added light/dark-blue/black theme-oriented CSS variables and mobile-aware layouts.
- Added PWA-style metadata/icons through `src/app/layout.tsx`, `src/app/manifest.ts`, and app icons.

### Authentication and Access Control

- Implemented Supabase email/password sign in, sign up, and sign out actions.
- Added a login page and shared auth status UI.
- Added server-side auth checks for user-owned watchlist, portfolio, and wealth data.
- Added admin role checks for manual market refresh controls.
- Added cron authorization through `CRON_SECRET`.
- Added member-only stock dashboard modules that render protected placeholders for anonymous visitors.

### Stock Research Dashboard

- Implemented `/stock` as the ticker research page.
- Implemented ticker search and recent ticker behavior.
- Implemented stock overview data, quote summary, freshness chips, and data-source visibility for admins.
- Implemented dashboard tabs for Summary, Chart, Volume, Technical, Analyst, Earnings, Fundamentals, and News.
- Added OHLC chart rendering with chart range/type/interval controls.
- Added technical indicators, moving averages, support/resistance, interval low/high analysis, momentum, and stop/limit guidance.
- Added earnings market-reaction analysis using cached report and post-report price action.
- Added an Earnings Pulse summary with the latest report verdict, four-quarter EPS beat rate, average EPS surprise, current beat/miss streak, and matching-quarter year-over-year EPS and revenue growth.
- Normalized EPS and revenue surprise calculations when a provider omits a precomputed surprise percentage.
- Ensured quarterly earnings are presented newest-first before calculating summary metrics.
- Added company news cache display.
- Added sample/fallback data behavior when a ticker exists but cached data is incomplete.

### Market Data Refresh

- Implemented refresh services for quotes, analyst ratings, price targets, earnings, fundamentals, financial statements, OHLC, and news.
- Added provider-fetch logging.
- Added symbol-level failure isolation so one failed symbol does not stop broader refresh work.
- Added admin refresh endpoint and UI for symbol refreshes.
- Added scheduled cron refresh endpoint.
- Added Vercel cron configuration for `/api/cron/refresh?limit=5` at `0 8 * * 1-5`.

### Providers

- Added provider modules for Finnhub, Financial Modeling Prep, Twelve Data, Alpha Vantage, SEC, and Zerodha Kite Connect.
- Implemented Finnhub-backed primary refresh paths.
- Implemented optional Zerodha search, quote, and daily OHLC paths for NSE/BSE or INR tickers when Zerodha credentials are configured.
- Left `MARKETDATA_API_KEY` in the environment contract for a planned secondary provider path.

### Dashboard

- Implemented `/dashboard` as a consolidated home view.
- Shows wealth summary, market posture, portfolio performance, watchlist count, saved-stock news snippets, and top wealth guidance actions.
- Handles missing portfolio or wealth SQL with setup messages instead of crashing.

### Watchlist

- Implemented `/watchlist`.
- Added watchlist service and repository.
- Added API route for watchlist GET/POST/DELETE.
- Added server actions to add/remove the current symbol from watchlist flows.
- Added watchlist table with ticker logo, company, exchange, sector, and remove action.

### Daily Earnings

- Implemented `/earnings`.
- Implemented `/api/earnings/calendar`.
- Added `earnings_calendar` cache support.
- Reads Supabase cache first and refreshes from Finnhub when needed or when forced.
- Enriches daily earnings rows with cached quote and analyst data.
- Adds bullish/bearish/neutral filtering and before-open/after-close filters.

### Portfolio

- Implemented `/portfolio`.
- Added multi-portfolio support with create, edit, and delete flows.
- Added asset classes for stocks, crypto, commodities, real estate, and other assets.
- Added portfolio display currency.
- Added buy, sell, and value-update transaction handling.
- Added holdings rollups with average cost, cost basis, market value, realized gain, unrealized gain, and total gain.
- Added trade preview/projection behavior through `PortfolioScenarioForm`.
- Added holding history modal with edit/remove transaction actions.
- Added support for non-stock assets that can track value updates without changing quantity or cost basis.

### Wealth / Net Worth

- Implemented `/wealth`.
- Added wealth settings, items, snapshots, charts, and advice.
- Added portal-level display currency preference and monthly expense estimate.
- Added balance-sheet categories for liquid assets, fixed assets, investments, loans, overdrafts, credit cards, mortgages, and other debt.
- Added add/edit/remove wealth item flows.
- Added wealth health score, allocation charts, trend chart, and guidance panel.
- Added automatic read-only portfolio rollup rows in wealth totals.
- Added setup fallback when wealth SQL has not yet been applied.

### Market Overview and Screener

- Implemented `/market`.
- Added global market proxy definitions and regional market summaries.
- Added market fear/greed style posture score.
- Added F&O readiness guidance based on breadth, global momentum, US leadership, and quote coverage.
- Implemented `/screener`.
- Added screener categories for undervalued, overvalued, 52-week high, 52-week low, most active, top gainers, and top losers.
- Uses cached data first where possible, with provider fallback logic in the service layer.

### Database and Deployment Assets

- Added Supabase SQL files for schema, RLS, seed data, portfolios, earnings calendar, wealth, company news, cached screener rows, and ticker logos.
- Added Vercel config for scheduled refresh.
- Added README setup, route, verification, and deployment notes.
- Added branded assets under `public/brand`.

## Main Routes

- `/dashboard` - consolidated personal dashboard
- `/stock?symbol=AAPL` - stock research dashboard
- `/market` - global market posture and F&O readiness
- `/screener` - stock idea screens
- `/watchlist` - saved tickers
- `/earnings` - daily earnings calendar
- `/portfolio` - portfolio tracking
- `/wealth` - net worth and financial guidance
- `/login` - Supabase auth

## API Routes

- `GET /api/tickers/search`
- `GET /api/tickers/[symbol]/dashboard`
- `POST /api/tickers/[symbol]/load`
- `POST /api/admin/refresh/[symbol]`
- `GET /api/cron/refresh`
- `GET /api/earnings/calendar`
- `POST /api/earnings/calendar`
- `GET /api/watchlist`
- `POST /api/watchlist`
- `DELETE /api/watchlist`

## Environment Variables

Required for a deployed, fully connected environment:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FINNHUB_API_KEY=
CRON_SECRET=
```

Optional or planned:

```txt
MARKETDATA_API_KEY=
ZERODHA_API_KEY=
ZERODHA_ACCESS_TOKEN=
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY`, provider API keys, and `CRON_SECRET` must stay server-only.
- `FINNHUB_API_KEY` is currently the key provider credential for full/quick/scheduled refreshes.
- Zerodha credentials are optional and enable NSE/BSE search, quote, and daily OHLC support.
- `MARKETDATA_API_KEY` is reserved for a secondary provider path that has not yet been completed.

## Verification Status

Latest private-work verification on 2026-11-16:

```bash
npm run test:content
npm run test:institutional
npm run test:recovery
npm run test:backfill
npm run test:splits
npm run typecheck
npm run build
```

- 61 tests passed across these five suites.
- Scoped ESLint passed on changed private routes/components/providers and tests.
- Production build passed, including TypeScript; Google Fonts required network access.
- Browser checks passed at 1440, 768 and 390 pixels, using real unauthenticated
  routes and isolated client fixtures, not an owner-auth bypass.
- Live checks separately confirmed owner sign-in/recovery (owner reported), SEC
  imports/read-back coverage, Finnhub quotes, and Massive's empty GOOGL split
  result. No production deployment or restore rehearsal is implied.
- This documentation-only update did not rerun the application test suite.

Historical public-module verification on 2026-09-03:

```bash
npm run check
```

Result:

- ESLint passed.
- TypeScript `tsc --noEmit` passed.
- Next.js 16.2.6 production build passed and generated all 20 application routes.
- The first sandboxed build could not download Google Fonts; rerunning with network access succeeded.
- That historical install reported seven high-severity advisories. The later
  private-module review also identified critical Next.js advisories. The old
  count must not be treated as the current security assessment.

`npm run check` runs lint, TypeScript, and the production build.

## Pending Work

### Setup and Validation

- Do not repeat completed private migrations or owner setup. Inspect remaining
  public-module installation state before assuming every SQL file is applied.
- Recheck RLS with owner and unauthorized sessions on the eventual hosted build.
- Reconcile Vercel server variables with local setup without exposing keys.
- Test an admin full refresh for a known symbol such as `AAPL`.
- Test Vercel deployment and scheduled cron execution with `CRON_SECRET`.

### Data Provider Completion

- Complete the secondary provider path for `MARKETDATA_API_KEY` or remove it from the contract if it is no longer planned.
- Decide whether Financial Modeling Prep, Twelve Data, Alpha Vantage, and SEC should be active fallbacks for more modules or remain as future provider adapters.
- Add better provider quota/backoff visibility for admins.
- Add automated validation for Zerodha token expiry and refresh instructions.

### Product Enhancements

- Extend portal-level currency preference beyond Wealth into Portfolio, Market, and planning screens with real FX conversion where needed.
- Add options-chain data before making the F&O readiness panel more actionable.
- Add richer portfolio analytics such as allocation, dividends/income, tax lots, deposits/withdrawals, and benchmark comparison.
- Add wealth planning features such as goals, recurring contributions, liabilities payoff plans, insurance coverage, and retirement projections.
- Add richer stock news sentiment once a reliable provider is selected.
- Add saved screener lists or user-specific screener alerts.
- Improve company logos and ticker profile coverage beyond the current Finnhub image pattern.

### Testing and Reliability

- Rerun the dependency audit, including known critical Next.js issues, and apply tested targeted upgrades.
- Add unit tests for portfolio average cost and P/L, wealth aggregation and advice rules, technical indicators, and refresh summaries.
- Add unit tests for Earnings Pulse classification, streaks, year-over-year comparisons, and provider surprise fallbacks.
- Add route-handler tests for auth, admin, and cron access paths.
- Add integration or smoke tests for sign in, stock load, watchlist, portfolio transaction, and wealth rollup journeys.
- Add error monitoring/logging for production provider failures.

### Documentation Cleanup

- Keep `README.md` focused on setup and usage.
- Keep this file as the main status/handoff document.
- Update `spec.md` when planned items become implemented or are deliberately dropped.
- Consider replacing `HANDOFF.md` with a short pointer to this document after the next milestone.
