# Review Branch Testing

Prepared: 16 November 2026. Scope: private Institutional Intelligence, supporting
setup/recovery/data tools and integration with existing Information Only controls.
The content-controls implementation was already on main at commit `9349f38`.

## Release Status

This branch is for review. Do not merge to main or call it production-ready yet.
The latest npm audit returned 17 advisories: 1 critical, 8 high and 8 moderate.
Next.js 16.2.6 remains affected. No forced audit fix or framework upgrade was made.
The audit identifies Next.js 16.4.6 as an available fix, but that upgrade and its
transitive dependencies need a separate review and regression test pass.

A GitHub push may trigger a Vercel preview. Verify its access protection before
sharing it, and avoid exposing an unpatched preview to general visitors. A branch
push is not approval to change the production environment or reopen the public site.

## Local Checks

The five feature suites total 61 passing tests:

```text
npm run test:content
npm run test:institutional
npm run test:recovery
npm run test:backfill
npm run test:splits
npm run lint
npm run typecheck
npm run build
```

Root ESLint excludes private `.env*` directories, nested generated Next output and
the separate Social Studio app. This does not certify Social Studio; use its own
package's tests/typecheck/build when changing that application. Never relax backup
folder permissions or include exports merely to get lint to pass.

## Preview Environment Setup

Do this only for an access-protected preview after the security gate is addressed.

1. Open the Vercel project and confirm you are configuring **Preview**, not Production.
2. Keep `COMING_SOON_MODE=true` and `INSTITUTIONAL_JOBS_ENABLED=false`.
3. Configure the existing Supabase URL/public key and server-only service-role key.
   Configure the exact existing private owner email and UUID from your secure setup.
4. Add server-only `SEC_USER_AGENT`, `FINNHUB_API_KEY` and `MASSIVE_API_KEY` if testing
   their integrations. Do not expose keys using `NEXT_PUBLIC_` variables.
5. Set `INSTITUTIONAL_AUTH_ORIGIN` to the exact HTTPS preview origin. Add that origin's
   `/institutional-intelligence/auth/callback` to Supabase Redirect URLs. Leave the
   production Site URL unchanged. Recovery links must open in the requesting browser.
6. Redeploy only the preview after environment changes. Verify the deployed branch.

These are configuration instructions, not confirmation the preview is configured.

## Test Checklist

1. In a signed-out browser, request the private dashboard, stock, institution and
   comparison pages. They must require private sign-in. Private data/export/split
   APIs must deny unauthorized access and return no-store/noindex headers.
2. Sign in as an ordinary, confirmed non-owner account. It must not gain private
   access, even if it has a public-site admin role. Do not change owner grants to test.
3. Sign in as the configured owner. Confirm 14 watchlist stocks and existing March/
   June Vanguard Capital Management observations. GOOGL also has Berkshire records.
4. Confirm BlackRock remains pending/quarantined. Do not repeatedly ingest its
   oversized files. Refer to [coverage status](PRIVATE-COVERAGE-STATUS.md).
5. Check GOOGL splits after 31 March through 30 June 2026. A successful empty
   provider response must not become corporate-action verification. Observe cooldowns.
6. Test password recovery in the same browser. Do not share reset links/passwords.
7. Confirm Information Only permissions remain off for rankings, buy/sell signals,
   personalised advice, entries, stops and targets. Do not enter compliance approval.
8. Check the actual production public domain still shows coming-soon. On preview
   domains, coming-soon is deliberately not enforced by the public-host condition;
   it is not a substitute for preview access protection or private authentication.

The preview uses the configured database. SEC ingestion, mappings and watchlist
writes can affect shared real data; they are not disposable fixture tests. Prefer
read-only checks and isolated staging data for destructive/permission experiments.

## Before Merge

Resolve audited vulnerabilities, retest, review the diff, verify hosted access,
confirm data-use rights, and obtain approval before merging/deploying. Enabling
scheduled jobs, recommendations and the public launch are separate changes.
