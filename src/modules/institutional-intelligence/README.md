# Institutional Intelligence (Private Research)

Private account recovery: see [password reset steps](../../../docs/RESET-PRIVATE-PASSWORD.md).
Set server-only `INSTITUTIONAL_AUTH_ORIGIN` to the local or deployed HTTPS origin
and allow its exact `/institutional-intelligence/auth/callback` URL in Supabase.

## Delivery Status

A functional, isolated first version: owner-only routes, private schema/RLS,
SEC adapter, 13F parsing and amendment reduction, cautious period comparisons,
technical evidence, explainable scoring, charts, comparison, watchlist, exports,
in-app alerts, configuration and bounded ingestion jobs. No public navigation
links, sample holdings, trade execution or personalised investment advice.

This is **not production-certified**. Setup is now complete in the configured
Supabase project: migrations and owner transfer applied, access checked, and live
research data imported. No GitHub push or Vercel deployment was performed for this
work. Address framework security advisories and recheck hosted auth/RLS/settings
before exposing it. Do not rerun completed migrations.

Checkpoint (16 November 2026): Berkshire and Vanguard Capital Management March/June
13Fs are parsed; all 14 watchlist stocks have date-specific mappings. BlackRock is
registered but its approximately 23 MB tables are not imported due to the 12 MB
reader bound. Corporate-action coverage remains unverified; no private market bars
are imported. See [coverage details](../../../docs/PRIVATE-COVERAGE-STATUS.md)
and [next engineering work](../../../HANDOFF.md).

## Architecture

- App Router entry: `/institutional-intelligence`; stock, institution and
  comparison routes below it; independent owner sign-in at `/login` below that
  prefix. All data pages call `ownerPage()` before reading records.
- `server/auth.ts`: verified Supabase session, configured owner identity AND
  `ii_owner_access` database membership. Neither URL obscurity nor admin role
  grants access. Public APIs, mutations and JSON exports independently recheck.
- `migrations/001_institutional.sql`: isolated `ii_*` tables, indexes, constraints,
  owner RLS, service-only atomic filing writes, shared request-rate reservations
  and expiring job lease. App clients cannot change evidence or owner grants.
- `engine/`: XML parsing, amendment handling, period comparisons, technical
  indicators and score methodology. No Next.js/UI dependencies in calculations.
- `server/sec.ts`: provider interface + official SEC implementation. No paid-site
  scraping or restriction bypass. API credentials stay server-side.
- `server/ingestion.ts`: idempotent upserts, atomic filing replacement, content
  hashes, bounded retries/backoff and deduplicated filing/position/volume alerts.
- `ui/`: scoped charcoal terminal design, Recharts visualisations, sortable tables,
  filters, configurable watchlist and comparisons (five stocks maximum).

Only integration changes outside the module are its route entry files, robots
metadata, proxy/header handling, root-layout chrome suppression for private
routes, an additional cron entry, dependencies and tests. Existing public
analysis components and calculations are unchanged. Coming-soon remains active
on the public domain; the exact private prefixes and robots.txt are exempt so
the owner can authenticate without reopening the public website.

## Setup

1. Apply the existing global content-controls migration when deploying that
   feature. The private module fails closed if that policy is unavailable.
2. Run `migrations/001_institutional.sql` **once** in the Supabase SQL editor as
   trusted database administration. This is a versioned migration, not a reset
   script. It does not modify existing market or portfolio tables.
3. Verify that the intended owner account exists in Supabase Authentication and
   that its email is confirmed. Use this trusted SQL, substituting the reviewed
   owner email. Do not grant ownership through signup metadata or a public API:

```sql
begin;
insert into public.ii_owner_access(user_id)
select id from auth.users
where lower(email) = lower('<verified-owner-email>')
  and email_confirmed_at is not null
on conflict do nothing;

insert into public.ii_watchlist(user_id,ticker)
select a.user_id,s.ticker
from public.ii_owner_access a cross join public.ii_securities s
where s.ticker <> 'SPY'
on conflict do nothing;
commit;
```

Confirm exactly the intended UUID was inserted. Use that UUID for the environment
variable below. If no matching verified account exists, this SQL inserts nothing
and access remains denied. The configured owner for this project is the account
provided in the chat; its contact configuration is in ignored `.env.local`, not
committed source. Do not add other owner rows casually: tables are a single-owner
research workspace, not a multi-tenant product.

4. Configure server environment variables:

| Variable                        | Purpose                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Existing Supabase project URL.                                                                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing public key; RLS still applies.                                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only evidence writes and ingestion. Never expose in browser variables.                                   |
| `INSTITUTIONAL_OWNER_EMAIL`     | Exact verified owner email; never client-side.                                                                  |
| `INSTITUTIONAL_OWNER_USER_ID`   | Recommended immutable UUID pin, checked in addition to email.                                                   |
| `SEC_USER_AGENT`                | Identifying organisation/application plus a working contact email, e.g. `Company research contact@example.com`. |
| `CRON_SECRET`                   | Existing long random cron secret; required for scheduled ingestion.                                             |
| `INSTITUTIONAL_JOBS_ENABLED`    | Defaults off; set `true` only after staging checks and data setup.                                              |

Local contact/owner email have been configured from the user's supplied address;
jobs remain disabled. Vercel needs its own environment configuration and redeploy.
Never place service keys in source, query strings, exports or screenshots.

5. Visit the private URL directly. Sign in using the existing confirmed Supabase
   account/password. The public `/login` is not required while coming-soon is on.
   Authentication errors are generic and a non-owner is denied before data reads.
6. Under Configuration, add real manager CIKs. Names are verified against SEC
   submissions, not inferred from the stock ticker. Record verified CUSIP mappings
   with effective dates, and licensed company metadata as needed. Never guess a
   CUSIP or reuse an expired identifier without verification.
7. Import licensed daily market history as a JSON array, separately per ticker
   and for SPY. At least 250 consistently adjusted daily bars are recommended.
   Example **schema only**, not real prices:

```json
[
  {
    "date": "YYYY-MM-DD",
    "open": 0,
    "high": 0,
    "low": 0,
    "close": 0,
    "volume": 0
  }
]
```

Zero prices are rejected. Use actual licensed values. The adjusted checkbox is
an explicit source attestation: all OHLCV fields must share a consistent split
adjustment basis. Unadjusted prices are retained as observations but cannot
produce technical confirmation. There is no automatic commercial market-feed
integration yet; renewing/importing the licensed data remains an operator step. 8. Record splits from a verified corporate-action source, then explicitly attest
coverage through the reporting quarter. Unknown action coverage means an
unverified comparison, not an assumed absence of splits. To allow future strong
classifications, separately review manager affiliation and set real
`ii_institutions.independence_group` values through trusted SQL; different CIKs
alone do not establish independent economic ownership. 9. Run ingestion manually and review the filing register/log before enabling cron.

## Data Integrity and Limits

13F is a delayed quarter-end disclosure, not a record of trades on the filing
date. [SEC FAQ](https://www.sec.gov/rules-regulations/staff-guidance/frequently-asked-questions-about-form-13f)
describes the generally 45-day filing timetable. Confidential omissions,
amendments, options, shared discretion and incomplete manager coverage limit
interpretation. Ordinary-share totals exclude PUT/CALL and principal amounts.
Reported value units vary by schema era; this version deliberately does not use
value fields in calculations until an explicit unit-aware adapter is validated.

Restatements replace earlier tables. Additive amendments add distinct entries;
overlaps and unknown amendment types invalidate completeness. Missing current
manager filings do not imply exits. New/closed positions require complete,
adjacent comparable reports and verified corporate-action/identifier continuity.
Ambiguous identifier assignment blocks comparisons. Exact trade dates are not
inferred. Institution totals are a **tracked sample**, never claimed to be all
institutional ownership. Ownership percentage stays unavailable until a verified
complete universe and period-aligned denominator are supplied; the current
version does not calculate such a percentage.

The adapter reads the SEC recent-submissions segment, not every archived history
file or every US institution. Discovery currently follows configured manager CIKs.
Form 4 and 13D/13G documents are separately recognised/parsed where structured XML
is available, but issuer-wide discovery, full beneficial-ownership person/group
normalisation and threshold alerts remain follow-up work. Legacy unstructured
documents fail visibly rather than being interpreted with guessed fields.

The interactive read is bounded: 800 filings, 100,000 holdings, 15,000 price bars,
200 recent alerts and 1,000 score-history rows. Holdings are paginated rather than
silently truncated; an overlarge dataset fails closed. Use SQL/materialized
aggregations and an archive/backfill worker before expanding to broad coverage.

An owner-only [Massive split-history check](../../../docs/CHECK-PRIVATE-SPLITS.md)
is available in Configuration. It is read-only and never certifies corporate-action
coverage or imports events automatically.
No automatic metadata, price, CUSIP or corporate-action import supplier is bundled. The
UI supports licensed/sourced imports and explicitly shows missing data. Ingestion
does not conjure market prices from SEC ownership filings.

## Scoring and Global Controls

Version `ii-evidence-1.0.0`; initial component weights: ownership trend 30,
breadth 20, significant holders 15, price/volume 15, relative strength 10,
recency/quality 10. The dashboard Methodology view documents each formula.
Missing components are null, not 50, and the total is withheld rather than
implicitly reweighted. Confidence is separate. Strong classifications need
three verified independent groups, comparable recent filings and directionally
supporting technical evidence. The thresholds/weights are **not empirically
validated** and must not be presented as predictive investment signals.

Technical calculations use the established `technicalindicators` library for
SMA/RSI/MACD/OBV/ADL, plus the explicit standard 20-session CMF formula. Relative
volume excludes the latest session from its 20-session baseline. Relative strength
requires exact stock/benchmark start and end dates. Stale/unadjusted/future bars
do not support confirmation. The UI retains data dates and source references.

The shared Way2Investing policy is checked before responses. Information Only
Mode withholds directional totals/labels and cached score history, including
through RLS for direct `ii_scores` reads. Neutral filing facts, reported share
changes and educational component observations remain available. It does not
enable personalised instructions or investment-pick rankings.

Historical score rows are fingerprints of methodology, weights, inputs and
observation context; reruns do not duplicate identical calculations. They are not
a point-in-time, survivorship-bias-free backtest dataset. Build and independently
validate that dataset before using scores predictively.

## Jobs and Costs

Additional Vercel cron: `/api/institutional-intelligence/jobs`, weekdays 09:00 UTC.
Existing public refresh schedule is unchanged. Each run leases the SEC worker,
rotates one configured manager, discovers up to 40 filings and processes at most
two, with a bounded execution budget. Failed filings receive a persisted retry
time with exponential backoff. A five-minute lease permits recovery from a killed
worker. Requests use a shared PostgreSQL reservation at no more than two per
second across instances, below the [SEC fair-access maximum](https://www.sec.gov/about/developer-resources).
Do not run independent clients that collectively exceed the SEC limit.

Daily polling is not real-time and may take several runs to catch up. For timely
multi-manager alerts or large filings, deploy a durable worker/queue and a plan
with the required scheduling/runtime limits, rather than increasing batches in a
short serverless request. Oversize filings are quarantined; do not silently truncate.
Reconcile filing failures in the private register/log.

SEC data access has no subscription fee. Hosting/database/egress still cost
according to the existing Vercel/Supabase plans. Commercial historical prices,
corporate actions, identifier mapping and redistribution can require separate
licences; no cost or entitlement is assumed. Fintel/WhaleWisdom integrations are
not enabled and paid sites are not scraped. Email/Telegram/push delivery is not
implemented; current alerts are private in-app records only. Material score-change
and full beneficial-ownership threshold alerts remain follow-up work.

## Validation and Release Gate

```text
npm run test:institutional
npm run test:content
npm run typecheck
node node_modules/eslint/bin/eslint.js src tests/institutional-intelligence.test.cjs
npm run build
```

Real SEC fixture provenance is in `tests/fixtures/sec-institutional-sources.md`.
Other test datasets are explicitly synthetic edge cases, never production data.
The suite covers parsing, amendments, repeated evaluation, splits, identifier
changes, missing reports, scoring, adjusted data, owner checks, denied API/export
access, SSRF guards and hidden route contracts. Run staging database tests in
`tests/institutional-intelligence.integration.sql` with trusted owner and ordinary
user fixtures; these are not replaced by mocked unit tests.

Optional Playwright runner: `node tests/institutional-intelligence.browser.cjs`.
Set `PLAYWRIGHT_MODULE_PATH` if using an external Playwright installation and
`CONTENT_TEST_URL` to the local server. It tests real unauthenticated routes and
an isolated client fixture for responsive interactions, without a production
authentication bypass. It does not certify real owner sign-in or hosted RLS.

Release blockers / remaining phases:

- Migrations, owner access and initial database permission checks are complete.
  Recheck unauthorized sessions, PostgREST, exports, origin checks and cron auth
  on the eventual hosted build; local verification is not release certification.
- Address existing repository dependency advisories. The audit during this work
  reported Next.js 16.2.6 as critical (with additional inherited tooling/runtime
  advisories). No framework upgrade was performed because it affects the public
  application. Re-run `npm audit` and test a supported patched release before launch.
- Choose licensed price/metadata/action/identifier sources and automate freshness.
- Expand the bounded quarter-specific [13F backfill](../../../docs/BACKFILL-PRIVATE-13F.md)
  into exhaustive historical coverage; add broader issuer/form discovery, complete
  beneficial-owner normalisation and material score/threshold notifications.
- Validate group overlap, disclosure completeness, filing corrections, corporate
  actions and signal thresholds against broader real filing fixtures.
- Complete historical testing, performance validation, SQL aggregation and durable
  queue/worker capacity before claiming broad coverage or predictive meaning.

## Rollback

Disable `INSTITUTIONAL_JOBS_ENABLED`, remove the new cron entry if needed, and
revoke the owner grant to close access. Retain data and logs. Reverting the private
route integration should restore the previous proxy/layout exactly; do not remove
the separate public coming-soon or global information-only controls. Never make
the research tables public as a workaround for setup errors.
