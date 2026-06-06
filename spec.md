# Financial Dashboard Spec

## Goal

Build a Vercel-deployable, multi-user financial dashboard for deep stock research.

The dashboard should support:

- Ticker search
- User watchlists
- User portfolios
- Buy/sell transaction tracking
- Portfolio asset classes for stocks, crypto, commodities, real estate, and other assets
- Portfolio holdings and performance summaries
- Net worth and wealth manager for user-entered assets and liabilities
- Automatic Wealth roll-up from portfolio totals
- Liquid assets, fixed assets, investments, loans, overdrafts, and other debt
- Net worth dashboard with allocation charts and rule-based financial guidance
- Portal-level display currency preference with country/currency selector
- Daily earnings calendar by selected date
- Latest quote overview
- Public basic ticker snapshot for logged-out visitors
- Analyst ratings
- Analyst price targets
- Last quarterly earnings
- Earnings market-reaction advice using cached post-report price action
- Fundamentals and valuation ratios
- OHLC price chart data
- Dedicated volume analysis tab with buy/sell pressure and recent volume table
- Consolidated stock summary with plain-English Buy / Hold / Sell-style indication
- Technical analysis tab with indicators, interval lows/highs with plain-English advice, moving averages, nearest actionable support/resistance, and stop-loss guidance
- Company news and sentiment
- Cached market data through Supabase
- External provider refresh through isolated provider modules
- Indian NSE/BSE equity search, quotes, and daily OHLC through Zerodha Kite Connect
- Light, dark-blue, and black screen themes
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
      earnings/
        calendar/
          route.ts
    dashboard/
    earnings/
    market/
    portfolio/
    screener/
    stock/
    watchlist/
    wealth/
      page.tsx
      actions.ts
    layout.tsx
    page.tsx

  components/
    dashboard/
      AppNav.tsx
      DataFreshness.tsx
    wealth/
      WealthCharts.tsx
      WealthAdvicePanel.tsx
      WealthEntryModal.tsx
      WealthItemForm.tsx

  lib/
    providers/
      alphaVantageProvider.ts
      finnhubProvider.ts
      fmpProvider.ts
      secProvider.ts
      twelveDataProvider.ts
      zerodhaProvider.ts
    repositories/
    services/
    supabase/
      admin.ts
      client.ts
      server.ts
      schema.sql
      rls.sql
      seed.sql
      wealth.sql
    types/
      database.ts
      index.ts
      market.ts
      wealth.ts
```

## Daily Earnings Calendar

The daily earnings module is separate from per-ticker quarterly earnings.

- Page: `/earnings`
- API: `/api/earnings/calendar?date=YYYY-MM-DD`
- Cache table: `earnings_calendar`
- Provider: Finnhub `calendar/earnings`

The page reads cached rows first. If the selected date has no cached rows, it refreshes the date through the server-only provider layer and stores the normalized rows in Supabase. Users can also force a refresh from the page.

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
- Aggregate net worth, allocation breakdowns, and rule-based wealth guidance from user-entered items

### Repositories

Handle Supabase database access:

- Read cached ticker data
- Read and write quotes
- Read and write analyst data
- Read and write earnings
- Read and write fundamentals
- Read and write OHLC data
- Read and write watchlists
- Read and write wealth settings and balance-sheet items

Repositories should not call external APIs.

### Providers

Handle external API calls only:

- Finnhub
- Financial Modeling Prep
- Twelve Data
- Alpha Vantage
- SEC company facts
- Zerodha Kite Connect
- MarketData.app
- EarningsAPI
- Future providers

Providers return normalized provider-level data to services. Provider-specific response shapes should not leak into UI or repositories.

Zerodha support is server-only and optional. When `ZERODHA_API_KEY` and `ZERODHA_ACCESS_TOKEN` are configured, ticker search includes NSE/BSE equity instruments, cached Indian tickers use `INR`, and quote / daily OHLC refresh for NSE, BSE, or INR tickers tries Zerodha before the general provider fallback chain.

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
- `wealth_user_settings`
- `wealth_items`

### Market Data Tables

- `tickers`
- `quotes_latest`
- `analyst_ratings_snapshot`
- `analyst_price_targets_snapshot`
- `earnings_quarterly`
- `fundamentals_snapshot`
- `ohlc_daily`
- `company_news`
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
POST /api/tickers/[symbol]/load
GET /api/watchlist
POST /api/watchlist
DELETE /api/watchlist
POST /api/admin/refresh/[symbol]
GET /api/cron/refresh
```

Avoid creating separate public routes for every panel too early.

Ticker search remains public so visitors can discover companies. Detailed dashboard data APIs and provider refresh routes require a signed-in user:

- `GET /api/tickers/[symbol]/dashboard` returns `401` for anonymous users.
- `POST /api/tickers/[symbol]/load` returns `401` for anonymous users so public visitors cannot consume provider quota.
- The server-rendered dashboard page can still show basic public content from the shared market-data cache.

Preferred dashboard response:

```ts
type DashboardData = {
  ticker: Ticker;
  quote: QuoteLatest | null;
  analystRatings: AnalystRatingsSnapshot | null;
  analystPriceTargets: AnalystPriceTargetsSnapshot | null;
  earnings: EarningsQuarterly[];
  fundamentals: FundamentalsSnapshot | null;
  financialStatements: FinancialStatements;
  ohlc: OhlcDaily[];
  news: CompanyNewsArticle[];
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
14. Wealth manager (balance sheet, net worth charts, guidance)
15. Polish, loading states, errors, and deployment

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

## Ticker Search

Ticker search is cache-first and provider-backed:

```txt
GET /api/tickers/search?query=nvda
  v
Search public.tickers
  v
If no local matches, call Finnhub /search?q=<query>&exchange=US
  v
Cache discovered symbols in public.tickers
  v
Return normalized ticker rows to the autocomplete
```

The search route uses the server-only Supabase admin client so provider-discovered symbols can be cached without granting browser users direct write access to `tickers`.

The dashboard `Load` action navigates to:

```txt
/dashboard?symbol=<symbol>&autoload=1
```

The server page searches/caches the ticker, refreshes all market-data modules through the server-only provider path, then renders the populated dashboard. The API endpoint `POST /api/tickers/[symbol]/load` remains available for programmatic refresh.

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
The optional `modules` parameter can limit refreshes to `quote`, `analystRatings`, `priceTargets`, `earnings`, `fundamentals`, `financialStatements`, `ohlc`, and/or `news`.

The Vercel deployment schedule is configured in `vercel.json`:

```txt
0 8 * * 1-5
```

This runs once per weekday, which is compatible with Vercel Hobby cron limits. Manual admin `Quick` and `Full` refresh controls can be used for more frequent refreshes.

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

For an existing project that only needs the wealth / net worth module:

```txt
src/lib/supabase/wealth.sql
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

Users can create multiple portfolios and record a buy/sell ledger per portfolio. Each portfolio has one asset class selected at creation time, so the same workflow supports stocks, crypto, commodities, real estate, and other asset types without a separate asset-creation panel.

Initial portfolio scope:

- Multiple named portfolios per signed-in user
- Asset class selected during portfolio creation: stocks, crypto, commodities, real estate, or other assets
- Buy and sell transactions by ticker
- Non-stock portfolios use the same transaction ledger with asset name, optional symbol/tag, quantity, price, fees, and notes
- Quantity, trade date, execution price, fees, and notes
- Holdings calculated from transactions using average-cost accounting
- Stock market value from cached `quotes_latest`; non-stock market value from the latest recorded ledger price
- Realized gain from sell transactions
- Unrealized gain and return percent for open holdings
- Portfolio total value, invested capital, realized gain, unrealized gain, and total return

Portfolio data is private to the owning user through RLS. Market prices still come from the shared market-data cache.
The database also enforces portfolio ownership at the transaction level with a composite `(portfolio_id, user_id)` foreign key, so a transaction cannot be attached to another user's portfolio even if application code is wrong.

## Wealth Manager Module

The wealth manager is separate from stock portfolios. Portfolios track ticker buy/sell trades against cached market quotes. Wealth manager captures a full personal balance sheet entered by the user.

Page:

```txt
/wealth
```

Server actions (no public API routes in the initial version):

```txt
saveWealthSettingsAction
addWealthItemAction
updateWealthItemAction
removeWealthItemAction
```

### Data model

`wealth_user_settings` (one row per user, used as the portal preference source):

- `base_currency` — portal-level display currency for charts, totals, and future cross-module formatting
- `monthly_expenses_estimate` — optional; used for emergency-fund and debt-service guidance

`wealth_items` (many rows per user):

- `record_type` — `asset` or `liability`
- `category` — constrained by record type:
  - Assets: `liquid`, `fixed`, `investment`
  - Liabilities: `loan`, `overdraft`, `credit_card`, `other_debt`
- `subcategory` — predefined slug per category (cash, real_estate, mortgage, credit_card, etc.)
- `name` — user label (e.g. "Primary home", "Chase savings")
- `current_value` — positive number; liabilities are stored as positive amounts representing debt owed
- `interest_rate` — optional APR % for liabilities
- `monthly_payment` — optional scheduled payment for liabilities
- `as_of_date` — valuation date
- `notes` — optional

### Aggregations

The wealth service computes:

- Total assets, total liabilities, net worth
- Liquid, fixed, and investment subtotals
- Debt-to-asset ratio and liquidity ratio (liquid / total assets)
- Monthly debt payments and high-interest debt (APR ≥ 8%)
- Allocation slices for asset donut, liability donut, and net worth bar charts

### Guidance

Personalized guidance is rule-based in `wealthService` (not from external APIs or LLMs). Examples:

- Negative net worth and high debt-to-asset ratio
- High-interest revolving debt prioritization
- Emergency fund vs estimated monthly expenses (3–6 month target when expenses are set)
- Low liquidity, fixed-asset concentration, light investment allocation
- Heavy monthly debt service relative to estimated expenses

The UI labels this as educational guidance, not licensed financial advice.

### Architecture notes

- User-entered wealth data does not use market-data providers.
- Reads and writes use the authenticated Supabase server client; RLS restricts rows to `auth.uid()`.
- Portfolio totals are auto-merged into Wealth as generated read-only asset rows. Real estate portfolios count as fixed assets; stock, crypto, commodity, and other portfolios count as investments.
- The Wealth top panel owns the current portal display currency. The current implementation applies it across Wealth totals and establishes the shared preference for later portfolio, market, and planning screens.

### UI

- Summary metrics (net worth, assets, liabilities, ratios)
- Top portal preferences panel with country flag, country name, currency dropdown, monthly expense estimate, and quick add buttons
- SVG donut charts for asset and liability mix
- Bar comparison of assets vs liabilities
- Add/edit balance-sheet entries in a modal (`WealthEntryModal`) with dynamic category and subcategory options (`WealthItemForm` client component)
- Balance-sheet table grouped into assets and liabilities
- Read-only synced portfolio rows link back to `/portfolio` for edits at the source

## Dashboard UI

The dashboard and portfolio pages share common shell controls:

- Segmented app navigation for Dashboard, Market, Watchlist, Wealth, Earnings, Screener, and Portfolio
- Light, Dark Blue, and Black theme selector
- Compact signed-in user pill with sign-out action
- Source and last-updated freshness chips on market-data panels
- Support, resistance, and pivot levels calculated from cached daily OHLC for the selected ticker

Black is the default theme.

The dashboard does not include embedded Watchlist or Today's Earnings blocks. Those are separate top-level pages so the ticker research page remains compact.

### Access model

The MVP uses a balanced public/member model rather than locking the whole page.

Public visitors can see enough basic information to understand the product:

- Ticker symbol, company name, exchange, sector, and logo
- Latest quote overview: last price, day change, open, day range, and volume
- Basic price chart tab
- Quarterly earnings table
- Company news headlines
- Ticker search and navigation

Signed-in users unlock the deeper decision-support modules:

- Summary verdict and consolidated Buy Watch / Hold / Watch / Avoid-style indication
- Volume analysis, including buy/sell volume estimates and recent volume table
- Technical analysis, stop/limit guidance, support/resistance, indicators, and moving averages
- Analyst ratings and price targets
- Fundamentals, financial statements, valuation commentary, and P/E verdict
- Watchlist, portfolio, and wealth personalization

Locked modules render a neutral sign-in placeholder instead of hidden real data, so sensitive member-only outputs are not merely blurred in the HTML.

Dashboard tabs:

1. `Summary` - first/default tab. Consolidates analyst data, price targets, earnings, fundamentals, technicals, and news into a plain-English indication for the end user. The UI should show an overall graphical score, confidence, and per-category signal cards. The wording should be practical and understandable, such as Buy Watch, Hold / Watch, or Avoid / Sell Bias.
2. `Chart` - a dedicated public price chart tab for the selected stock. This is separate from technical and volume analysis so users can inspect price action without scrolling through every indicator.
3. `Volume` - member-only volume analysis with latest volume, 20-candle average, activity ratio, buy/sell pressure circles, and a recent volume table. Volume is not embedded inside the public Chart tab.
4. `Technical` - member-only technical indicators, summary, interval low/high ranges, moving averages, momentum, support/resistance, and stop/limit guidance. Stop/limit guidance is calculated from available technical data, such as recent support, ATR/volatility, and short-term moving averages. The range view should show lows, highs, distance from each level, and current price position across common intervals such as 5D, 1M, 3M, 6M, and cached history.
5. `Analyst` - member-only analyst ratings table plus low, mean, and high price targets with separate freshness information for ratings and targets.
6. `Earnings` - public quarterly earnings table with EPS actual, EPS estimate, EPS surprise, revenue actual, revenue estimate, revenue surprise, and a market-reaction read. The reaction compares cached OHLC closes around each report date and gives plain-English advice such as whether the market rewarded, ignored, or punished the report. If the earnings provider does not return revenue actual, the table can fall back to cached quarterly income-statement revenue and mark the value.
7. `Fundamentals` - member-only valuation/profitability/liquidity ratios, financial statements, visual indicators, and a plain-English P/E read that avoids calling a stock cheap unless growth, profitability, and debt support it.
8. `News` - public company news headlines and sentiment from provider feeds.

The primary dashboard refresh action is ticker selection/search. Signed-in users can trigger provider refreshes that fetch quote, analyst ratings, price targets, earnings, fundamentals, financial statements, OHLC, and news for the requested symbol before navigation. The server-rendered dashboard also performs a tab-aware completeness check for signed-in users: if the selected tab needs missing data, such as fewer than 30 cached OHLC rows for Technical or Volume, it refreshes the symbol before rendering that tab.

Technical-analysis terminology:

- Interval lows/highs are absolute period boundaries for cached ranges such as 5D, 1M, 3M, and 6M.
- Nearest actionable support/resistance is calculated around the latest close from recent cached candles and may differ from interval extremes.
- UI copy should keep those concepts separate so users do not confuse range boundaries with nearby trading levels.

## Watchlist Page

The watchlist is a dedicated top-level page:

```txt
/watchlist
```

Signed-in users can view saved tickers, open any ticker in the dashboard, and remove saved tickers. The dashboard can still add the currently selected ticker to the watchlist, but the persistent list should live on the Watchlist page rather than in the dashboard sidebar.

## External Providers

Initial provider candidates:

- Finnhub for quotes, analyst ratings, price targets, fundamentals, and candles
- Twelve Data for quote, ticker search, and daily OHLC fallback
- Alpha Vantage for quote, ticker search, daily OHLC, fundamentals, and quarterly earnings fallback
- Financial Modeling Prep for quote, OHLC, analyst rating, price target, fundamentals, and financial-statement fallback
- SEC company facts for US financial-statement fallback when paid provider plans block statement endpoints
- Finnhub and Alpha Vantage for company news fallback
- Zerodha Kite Connect for NSE/BSE equity search, quote, and daily OHLC when Kite credentials are configured
- MarketData.app for analyst data and earnings alternatives
- EarningsAPI for broad earnings calendar data

Provider choice should remain swappable.
Refresh services should try providers in module-specific order and cache the first successful normalized response.

Current refresh behavior:

- Ticker search reads Supabase first, then tries Zerodha, Finnhub, Twelve Data, and Alpha Vantage provider search.
- Quote refresh tries Zerodha first for Indian tickers, then Finnhub, Twelve Data, Alpha Vantage, and FMP.
- Daily OHLC refresh tries Zerodha first for Indian tickers, then Twelve Data, Alpha Vantage, Finnhub, and FMP.
- Fundamentals, financial statements, analyst data, earnings, and news use the existing module-specific provider fallback lists.
- Provider failures are isolated per module and summarized in refresh responses.

Zerodha operational notes:

- Required environment variables: `ZERODHA_API_KEY` and `ZERODHA_ACCESS_TOKEN`.
- Access tokens come from Zerodha's login/session flow and may need manual rotation.
- Instrument metadata is fetched from Kite's NSE/BSE instrument endpoints and cached in memory for one day.
- Symbols with `NSE:`, `BSE:`, `.NS`, or `.BO` are normalized before instrument lookup.

## Security Rules

- Users can read and update only their own profile.
- Users can read, add, and remove only their own watchlist items.
- Users can read and mutate only their own portfolios and portfolio transactions.
- Users can read and mutate only their own wealth settings and wealth items.
- Market data is publicly readable.
- Public dashboard pages may render basic cached market information, but detailed dashboard API routes require authentication.
- Member-only modules should not render hidden real data for anonymous visitors; they should render a sign-in placeholder.
- Market data writes happen through server/admin paths only.
- Provider refresh endpoints require authentication or admin/cron authorization depending on route.
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
- Complex portfolio performance metrics beyond average-cost holdings
- Automated brokerage or bank aggregation into wealth items
- Net worth history snapshots over time
- Alerts and notifications

These can be added after the core dashboard is stable.
