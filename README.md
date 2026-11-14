# Financial Dashboard

Next.js, Supabase, and Vercel stock research dashboard with watchlists, analyst data, daily earnings calendar, quarterly earnings, fundamentals, OHLC cache refresh, user portfolio tracking, and net-worth management.

For a current summary of completed and pending work, see [PROJECT_STATUS.md](./PROJECT_STATUS.md).

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard?symbol=AAPL`.

## Environment

### Temporary coming soon mode

Coming soon mode is enabled by default only on `way2investing.com` and
`www.way2investing.com`. Localhost, preview deployments, and all other domains
continue to serve the normal website. Visitors to application pages on the public domains are temporarily
redirected to `/coming-soon`, which displays the Way2Investing logo and launch message.
Public APIs return HTTP 503 while the authenticated `/api/cron/refresh` keeps running.
Static assets remain available, and dashboard navigation is hidden.

Local testing needs no override. To reopen the public site after testing and
analysis, set `COMING_SOON_MODE=false` in the hosting environment and redeploy.
Remove that override or set it to `true` to enable the holding page again.

Copy `.env.example` to `.env.local` and fill in the values:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
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

## Email Confirmation Setup

Supabase's Site URL must be your actual live website, not localhost. The domain
must match the deployed website exactly, including `.com` versus `.co.uk` and
whether you use `www`.

1. In Supabase, open Authentication > URL Configuration.
2. Set Site URL to `https://YOUR-LIVE-DOMAIN`.
3. Add `https://YOUR-LIVE-DOMAIN/auth/callback` to Redirect URLs.
4. For local testing, also allow `http://localhost:3000/auth/callback`.
5. In Vercel's production environment variables, set
   `NEXT_PUBLIC_SITE_URL=https://YOUR-LIVE-DOMAIN` and redeploy.
   In `.env.local`, leave this unset to use the local request origin, or set it
   to the live URL when testing email confirmation on another device.

The app sends `/auth/callback` as `emailRedirectTo` on signup and resend. The
callback exchanges a PKCE code for a session and returns to `/login` with a
success or error message. The default Supabase `{{ .ConfirmationURL }}` email
template is supported; open that link in the same browser used for signup.

For confirmation across different browsers or devices, change the confirmation
link in Authentication > Email Templates > Confirm signup to:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Confirm your email</a>
```

The callback also verifies this token-hash flow. Deploy the callback before
changing the template. Do not use a fixed localhost link or `{{ .SiteURL }}` as
the complete confirmation link.

Old, expired, or already-used links are not repaired by these changes. Once the
settings and deployment are updated, use Resend confirmation email on `/login`
and open the newest email. Test signup, confirmation, sign-in, and an expired
link before rollout. No real confirmation email was sent during automated tests.

URL regression tests (Node 24):

```bash
node --experimental-strip-types --test tests/site-origin.test.mjs
```

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
and [server-side email confirmation](https://supabase.com/docs/guides/auth/passwords?flow=pkce).

## Branded Authentication Email

The intended sender is `Way2Investing <noreply@way2investing.com>`.
The From address is configured in Supabase, not in Next.js environment variables.

1. Set up an email provider that permits SMTP sending from `way2investing.com`.
   An existing IONOS email account can be used if it provides suitable SMTP access;
   domain registration alone does not provide SMTP credentials.
2. Verify the domain with the provider. Apply its required DNS records at the
   authoritative DNS provider, including SPF and DKIM, and configure DMARC.
   If an SPF record already exists, merge the provider's settings into it rather
   than adding a second SPF record. Preserve existing mail-routing records.
3. In Supabase Authentication's email settings, enable Custom SMTP. Set:
   - Sender name: `Way2Investing`
   - Sender email: `noreply@way2investing.com`
   - SMTP host, port, username, and password: the values from the email provider.
4. In Email Templates > Confirm signup, set the subject to
   `Confirm your Way2Investing account` and replace the body with
   `src/lib/supabase/templates/confirm-signup.html`.
5. Deploy `/auth/callback` and configure the site/redirect URLs from the previous
   section before enabling the template. The template uses `RedirectTo` and
   `TokenHash` for confirmation across browsers and devices.
6. Request a fresh confirmation email and verify the sender, links, expiry
   handling, and SPF/DKIM results in the receiving email client.

Replies to this automated sender are not monitored. For IONOS mailbox-based SMTP,
provision `noreply@way2investing.com` and use its mailbox credentials. Other SMTP
providers may permit this From address through domain verification without a mailbox.
Keep SMTP credentials in the provider/Supabase configuration, not in the repository.

The template is prepared locally; SMTP, DNS, and the hosted Supabase template
have not been changed, and no test email has been sent.

Reference: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Main Routes

- `/dashboard?symbol=AAPL`
- `/earnings`
- `/portfolio`
- `/wealth` - net worth, assets, liabilities, synced portfolio totals, charts, and guidance
- `/login`
- `/api/earnings/calendar?date=2026-05-28`
- `/api/admin/refresh/[symbol]`
- `/api/cron/refresh`

The dashboard ticker `Load` action searches/caches the symbol and refreshes quote, analyst ratings, price targets, earnings, fundamentals, and OHLC before opening the dashboard. For NSE/BSE symbols, quote and OHLC refresh prefer Zerodha when its environment variables are configured.
The earnings page reads the Supabase earnings calendar cache first and refreshes the selected date from Finnhub when no rows are cached or when `refresh=1` is requested.
The per-stock Earnings tab summarizes the latest report, four-quarter EPS beat rate, average EPS surprise, current beat/miss streak, year-over-year EPS and revenue growth, and post-report price reaction before showing the detailed quarterly history.
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
