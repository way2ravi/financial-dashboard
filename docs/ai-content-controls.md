# AI Recommendations and Content Controls

## Status

Implemented in the main financial dashboard. Defaults are Information Only Mode:
all six recommendation permissions and the master switch OFF; informational
technical analysis and financial news ON. Applying this code does not migrate a
hosted database or deploy Vercel. The migration must be applied separately.

## Architecture and Inventory

No LLM SDK, investment prompt, generated-advice email sender or recommendation
notification worker currently exists in the main app. Existing recommendation
content comes from deterministic heuristics and provider analyst data.

| Surface | Enforcement / retained information |
| --- | --- |
| Home/search, watchlist, portfolio | Factual search, saved symbols, recorded transactions and historical performance unchanged. Transaction labels Buy/Sell describe user records, not advice. |
| Stock summary | Neutral quote and fundamentals summary instead of consolidated trading verdicts. |
| Technical | Same numeric formulae; neutral downside/upside method tables, reference close, price date, fetch timestamp, method weights, RSI/MACD/ATR/averages, historical ranges and hypothetical distance ratio. No preferred-method badge. |
| Analyst | Signals withheld; published third-party low/mean/high estimates retained as estimates, not recommended orders. |
| Fundamentals | Financial metrics/statements retained; heuristic advice panels require approved signal/ranking permissions. |
| Earnings | EPS, revenue, dates, estimates and realised price changes retained. Signal/rating generation, filters and cells gated. |
| Market | Index prices/breadth remain; F&O stance/actions require all recommendation permissions because the legacy view mixes strategies. Missing local data configuration has an explicit unavailable state. |
| Personal overview / wealth | Balance, allocation, debt and historical calculations remain; personalised advice generation and delivery gated. Balance-sheet descriptions neutralised. |
| News | Current policy applied after cache reads. Actionable provider copy withheld conservatively; sentiment labels stripped from application responses. Financial-news switch suppresses stock/news feed output. |
| Dashboard API | Delivery-time filtering, disabled ratings field omitted, no-store response. Unknown top-level generated fields are not forwarded. |
| Supabase REST | RLS gates analyst-rating rows and filters actionable news; settings/approval identities/audit rows are admin-only. |
| Cron/admin refresh and ticker load | Cache factual provider data only; report module counts/status, not investment advice. Cached data is filtered at read/delivery. |
| Auth emails | Account confirmation only, not financial recommendations; existing branded template untouched. |
| Future reports/alerts/emails | Use `prepareContentDelivery` immediately before delivery, with a correctly typed content envelope. Queued recommendation output must not be sent directly. |
| Social Studio (`apps/social-publisher`) | Separate local-draft prototype. No live ingestion, LLM, worker, sending or publishing exists. Left unchanged. Any future live publishing integration must call the shared server policy at delivery. |

Legacy consolidated stock views combine several recommendation types. They
remain neutral unless **all** recommendation permissions are approved and on.
Individual permissions do not accidentally enable a mixed-content legacy view.
Informational features do not depend on recommendation approval.

The policy RPC is read without caching, using the public Supabase key, on every
request/delivery. PostgreSQL validates approval expiry at read time. There is no
process-local policy cache. Saving settings is a locked, revision-checked,
transactional RPC with an application-read-only audit trail. A database trigger
also audits direct trusted-database updates/deletes, including actor identity,
timestamp and complete old/new records. The server
action also invalidates the Next.js root layout cache. Open browser pages cannot
have already-seen content recalled; subsequent requests/navigation use current
policy. Roll out the same code to every serving instance and retire old builds.

## Deployment

1. Back up the database. Review all existing `users_profile.role = 'admin'`
   profiles against a trusted staff list: the old profile policies permitted
   self-editing of the role column. Do not assume existing admin roles are trusted.
2. In a staging Supabase SQL editor, apply
   `src/lib/supabase/ai_content_controls.sql` **after** the base schema and RLS.
   This creates the singleton settings row, audit table, role-protection trigger,
   effective-policy RPC, admin-only update RPC and delivery-related RLS policies.
   Re-running the migration preserves saved settings. Re-running base `rls.sql`
   afterwards would undo the content-read policies; reapply this migration last.
3. Only a trusted database administrator should provision an admin profile.
   Never grant admin through client metadata or a signup form. Keep the Supabase
   service-role key server-side; no new environment secrets are required here.
4. Run `npm run test:content`, `npm run typecheck`, and
   `node node_modules/eslint/bin/eslint.js src tests/content-controls.test.cjs`.
   Run `npm run build` with the normal build environment/network access for fonts.
   Optional browser smoke/layout tests: `node tests/content-controls.browser.cjs`
   with Playwright available (`PLAYWRIGHT_MODULE_PATH` can point to a local
   installation), Edge installed, and `CONTENT_TEST_URL` set to the running app.
   Authenticated layout screenshots use deterministic fixtures, not real users.
   If the checkout's separate coming-soon switch is enabled, set
   `COMING_SOON_MODE=false` for the local build/server used for application tests;
   do not override the production launch gate as part of this feature rollout.
5. Against a **disposable/staging** Supabase database with an admin and ordinary
   user, run `psql <connection> -f tests/content-controls.integration.sql`.
   The script checks real RLS, role escalation protection, audit writes,
   revision conflicts, master override and approval expiry, then rolls back.
6. Sign in as a verified admin and open `/admin/settings` (settings icon next to
   the account). Confirm defaults, test an ordinary user's denied access, make
   and audit a harmless change, and return the master to OFF.
7. Apply the migration to production and deploy the tested build to Vercel.
   Verify stock/search/chart/earnings/news/portfolio/wealth at mobile and desktop
   widths with real data. Verify direct PostgREST reads cannot bypass the policy.

Missing configuration/migration/RPC/network access fails closed to default
Information Only Mode. The admin form cannot save until its table is available.

## Approval and Operating Procedure

Do not activate recommendations as a routine configuration change. Obtain an
independent regulatory/legal review first, then record review status, approval
date, approved feature list, approver identity, applicable jurisdiction, expiry
and evidence/reference. A switch alone cannot activate a feature. Expired,
missing, future-dated or incomplete approval cannot activate recommendations.
The recorded jurisdiction is **not** geofencing: administrators must establish
that deployment/audience restrictions match the approval before enabling it.
The application does not verify the authenticity of a legal approval document.

Raw provider-language screening is deliberately conservative and may exclude
legitimate news that mentions analyst calls. It is not a semantic compliance
classifier. New AI providers must emit structured, allowlisted informational
fields and use policy before generation **and** before delivery, not rely on
prompt instructions or keyword matching alone. Keep advice out of factual DTOs.

The new risk/terms pages and concise disclosure require qualified legal review
before launch. Neither the disclosure nor this feature establishes compliance.

## Verification and Remaining Deployment Checks

The 12-test automated suite exercises defaults, feature/master/approval combinations,
fail-closed reads, cached-response filtering, dispatch-envelope suppression,
non-admin rejection, stock-panel server rendering and formula parity against
fixtures captured from commit `5d56942` (12 price histories, both directions).
No real emails are sent by these tests. New outbound delivery modules must use
the shared delivery gate and add end-to-end tests when they are introduced.

Live Supabase migration/RLS and signed-in admin flows need the staging checks
above; they cannot be certified by mocked unit tests. Production deployment and
any legal approval remain explicit operator steps, not automatic app actions.

## Rollback

Turn the master OFF first using the audited admin interface; confirm the public
policy RPC returns all recommendation permissions false. Retain the role trigger,
audit history and database policies. Roll back to a tested **information-only**
application build, not an older build that ignores these controls. If a full
database restore is unavoidable, take the site out of service first; restoring
old permissive RLS while serving old application code can expose recommendations.
Do not drop audit records or remove role protection during a routine rollback.

## Changed Files

- `src/lib/content/{policy,settings,dashboardPolicy}.ts`: shared policy, uncached configuration/delivery reader, safe dashboard projection.
- `src/lib/supabase/ai_content_controls.sql`, `src/lib/types/database.ts`: persistence, typed RPCs, audit/security and direct-data enforcement.
- `src/app/admin/settings/page.tsx`, `src/app/admin/settings/actions.ts`: admin controls, approval form, history, atomic saving and cache invalidation.
- `src/lib/technical/analysis.ts`, `src/components/dashboard/TechnicalAnalysisPanel.tsx`: mechanically extracted calculations; existing numeric behaviour preserved.
- `src/components/dashboard/{NeutralAnalysis,InformationDisclosure,DashboardTabs,FundamentalsGrid,AuthStatus}.tsx`: neutral server views, disclosure, gating and admin navigation.
- `src/components/wealth/WealthAdvicePanel.tsx`, `src/lib/services/{dashboardService,wealthService,screenerService}.ts`: server delivery/generation gates and neutral screener naming.
- `src/app/{dashboard,earnings,market,wealth}/page.tsx`, `src/app/api/tickers/[symbol]/dashboard/route.ts`: page/API enforcement.
- `src/app/layout.tsx`, `src/app/{risk-disclosure,terms}/page.tsx`: shared disclosure and linked full text.
- `tests/content-controls.test.cjs`, `tests/content-controls.browser.cjs`, `tests/helpers/load-ts.cjs`, `tests/fixtures/technical-baseline.json`, `tests/content-controls.integration.sql`, `package.json`: automated, browser and staging verification.
- This document: deployment, inventory, limitations and rollback.
