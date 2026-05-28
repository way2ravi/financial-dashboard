# Financial Dashboard Spec

## Goal

Build a Vercel-deployable, multi-user financial dashboard for deep stock research.

The dashboard should support:

- Ticker search
- User watchlists
- User portfolios
- Buy/sell transaction tracking
- Portfolio holdings and performance summaries
- Latest quote overview
- Analyst ratings
- Analyst price targets
- Last quarterly earnings
- Fundamentals and valuation ratios
- OHLC price chart data
- Cached market data through Supabase
- External provider refresh through isolated provider modules
- Light and dark-blue screen themes
- Admin-controlled manual refresh

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase RLS
- Vercel deployment

## Core Architecture

External API calls must be separated by layer.

```txt
UI components
  v
API routes
  v
services
  v
repositories
  v
Supabase database/cache
  v
providers
  v
External market data APIs
```

## Folder Structure

```txt
src/
  app/
    api/
    dashboard/
    layout.tsx
    page.tsx

  components/
    dashboard/
      AppNav.tsx
      DataFreshness.tsx

  lib/
    providers/
    repositories/
    services/
    supabase/
      admin.ts
      client.ts
      server.ts
      schema.sql
      rls.sql
      seed.sql
    types/
      database.ts
      index.ts
      market.ts
```

## Layer Responsibilities

### UI Components

Render data and handle user interactions only.

UI components must not call Finnhub, MarketData.app, EarningsAPI, or any external provider directly.

### API Routes

Handle:

- HTTP request and response
- Auth checks
- Route params
- Input validation
- Calling service-layer functions

API routes should stay thin.

### Services

Handle business logic:

- Combine repository results
- Decide whether cached data is stale
- Trigger refresh logic when appropriate
- Normalize dashboard responses
- Coordinate multiple repositories/providers

### Repositories

Handle Supabase database access:

- Read cached ticker data
- Read and write quotes
- Read and write analyst data
- Read and write earnings
- Read and write fundamentals
- Read and write OHLC data
- Read and write watchlists

Repositories should not call external APIs.

### Providers

Handle external API calls only:

- Finnhub
- MarketData.app
- EarningsAPI
- Future providers

Providers return normalized provider-level data to services. Provider-specific response shapes should not leak into UI or repositories.

## Supabase Clients

### `client.ts`

Browser client using anon key.

Use for client components when browser-side Supabase access is needed.

### `server.ts`

Server client using anon key and Next.js cookies.

Use for:

- Route handlers
- Server components
- Auth-aware server reads

### `admin.ts`

Server-only service-role client.

Use only for:

- Refresh jobs
- Admin operations
- Writes that bypass user RLS intentionally

Never expose the service role key to the browser.

## Database Tables

### User Tables

- `users_profile`
- `user_watchlist`
- `portfolios`
- `portfolio_transactions`

### Market Data Tables

- `tickers`
- `quotes_latest`
- `analyst_ratings_snapshot`
- `analyst_price_targets_snapshot`
- `earnings_quarterly`
- `fundamentals_snapshot`
- `ohlc_daily`
- `provider_fetch_log`

## Analyst Data Design

Analyst ratings and price targets are stored separately.

Reason:

- Many APIs expose ratings and price targets from different endpoints.
- Separating them avoids forcing unrelated data into one shape.
- The dashboard service can combine both into one UI response.

## Data Freshness

Every cached market-data table should include:

- `source`
- `source_updated_at`
- `fetched_at`

Services use these fields to decide if data is stale.

Initial freshness targets:

- Quotes: 5 to 15 minutes
- OHLC daily: 1 day
- Analyst ratings: 1 day
- Price targets: 1 day
- Earnings: 1 day
- Fundamentals: 1 day

These can be adjusted after provider limits are known.

## API Route Plan

Start with a small API surface.

```txt
GET /api/tickers/search?query=AAPL
GET /api/tickers/[symbol]/dashboard
GET /api/watchlist
POST /api/watchlist
DELETE /api/watchlist
POST /api/admin/refresh/[symbol]
GET /api/cron/refresh
```

Avoid creating separate public routes for every panel too early.

Preferred dashboard response:

```ts
type DashboardData = {
  ticker: Ticker;
  quote: QuoteLatest | null;
  analystRatings: AnalystRatingsSnapshot | null;
  analystPriceTargets: AnalystPriceTargetsSnapshot | null;
  earnings: EarningsQuarterly[];
  fundamentals: FundamentalsSnapshot | null;
  ohlc: OhlcDaily[];
};
```

## Build Order

1. Supabase schema and RLS
2. Supabase clients
3. Shared TypeScript types
4. Repository layer
5. Service layer
6. Ticker search API
7. Dashboard API
8. Dashboard UI shell
9. Watchlist API and UI
10. Provider integrations
11. Manual refresh endpoint
12. Scheduled refresh jobs
13. Auth UI
14. Polish, loading states, errors, and deployment

## First Vertical Slice

Build one complete path before adding every provider.

```txt
Seed ticker/cache data manually
  v
Search/select ticker
  v
GET /api/tickers/[symbol]/dashboard
  v
Read cached data from Supabase
  v
Render dashboard shell
```

After this works, add provider refresh.

## Refresh Flow

The first provider-backed refresh endpoint is:

```txt
POST /api/admin/refresh/[symbol]
```

Initial scope:

- Requires a signed-in user with `users_profile.role = 'admin'`
- Uses the user-session Supabase client only for the admin check
- Uses the server-only service-role Supabase client for market-data writes
- Fetches Finnhub quote, analyst ratings, price targets, earnings, fundamentals, and daily OHLC
- Upserts `quotes_latest`, `analyst_ratings_snapshot`, `analyst_price_targets_snapshot`, `earnings_quarterly`, `fundamentals_snapshot`, and `ohlc_daily`
- Writes one `provider_fetch_log` row per refreshed module
- Returns per-module success/error results so one provider failure does not hide the rest

Required environment variable:

```txt
FINNHUB_API_KEY
```

The scheduled refresh route is:

```txt
GET /api/cron/refresh?limit=5
GET /api/cron/refresh?symbols=AAPL,MSFT
GET /api/cron/refresh?symbols=AAPL&modules=quote,ohlc
```

It requires either:

```txt
Authorization: Bearer CRON_SECRET
```

or:

```txt
x-cron-secret: CRON_SECRET
```

It uses the server-only Supabase service-role client and refreshes a bounded set of active tickers sequentially to reduce provider rate-limit pressure.
Symbol-level failures are returned in the response and logged without stopping the rest of the batch.
The optional `modules` parameter can limit refreshes to `quote`, `analystRatings`, `priceTargets`, `earnings`, `fundamentals`, and/or `ohlc`.

The Vercel deployment schedule is configured in `vercel.json`:

```txt
0 */4 * * 1-5
```

This runs every four hours on weekdays. Keep the schedule conservative until provider API limits are confirmed.

## Local Seed Data

For the first cached-data test, run SQL files in Supabase in this order:

```txt
src/lib/supabase/schema.sql
src/lib/supabase/rls.sql
src/lib/supabase/seed.sql
```

For an existing project that already has the original schema, the portfolio-only upgrade can be applied with:

```txt
src/lib/supabase/portfolio.sql
```

The seed file inserts manual AAPL sample data for:

- ticker metadata
- latest quote
- analyst ratings
- analyst price targets
- quarterly earnings
- fundamentals
- daily OHLC

## Portfolio Module

Users can create multiple portfolios and record a buy/sell ledger per portfolio.

Initial portfolio scope:

- Multiple named portfolios per signed-in user
- Buy and sell transactions by ticker
- Quantity, trade date, execution price, fees, and notes
- Holdings calculated from transactions using average-cost accounting
- Current market value from cached `quotes_latest`
- Realized gain from sell transactions
- Unrealized gain and return percent for open holdings
- Portfolio total value, invested capital, realized gain, unrealized gain, and total return

Portfolio data is private to the owning user through RLS. Market prices still come from the shared market-data cache.
The database also enforces portfolio ownership at the transaction level with a composite `(portfolio_id, user_id)` foreign key, so a transaction cannot be attached to another user's portfolio even if application code is wrong.

## Dashboard UI

The dashboard and portfolio pages share common shell controls:

- Segmented app navigation for Dashboard and Portfolio
- Light and Dark Blue theme selector
- Compact signed-in user pill with sign-out action
- Source and last-updated freshness chips on market-data panels

Admin users see two refresh actions on the dashboard:

- `Quick`: quote and OHLC chart data
- `Full`: quote, analyst ratings, price targets, earnings, fundamentals, and OHLC

## External Providers

Initial provider candidates:

- Finnhub for quotes, analyst ratings, price targets, fundamentals, and candles
- MarketData.app for analyst data and earnings alternatives
- EarningsAPI for broad earnings calendar data

Provider choice should remain swappable.

## Security Rules

- Users can read and update only their own profile.
- Users can read, add, and remove only their own watchlist items.
- Users can read and mutate only their own portfolios and portfolio transactions.
- Market data is publicly readable.
- Market data writes happen through server/admin paths only.
- Provider logs are admin-readable only.
- Service-role key must remain server-only.

## Verification

Use the combined local verification command before commits and deployment:

```txt
npm.cmd run check
```

It runs lint, TypeScript checking, and the production Next.js build.

## Non-Goals For Initial Version

- Real-money trading
- Brokerage integration
- Payment/subscription system
- Public social features
- Complex portfolio performance metrics
- Alerts and notifications

These can be added after the core dashboard is stable.
