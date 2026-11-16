# Start Here: Your Manual Setup Checklist

## Current Account: Setup Already Completed

Checkpoint: 16 November 2026. Your migrations, backup export, owner transfer,
confirmed email, local server settings, sign-in and password recovery are complete.
**Do not repeat the SQL or owner-transfer steps below.** They are retained for
a new installation, not as your next actions.

Use [the current handoff](../HANDOFF.md) and
[coverage status](PRIVATE-COVERAGE-STATUS.md). Berkshire and Vanguard Capital
Management data are imported. BlackRock needs engineering work because its
tables exceed the importer limit. No further manual setup is required now.

Local Finnhub quotes and Massive split checks work. Private historical prices
and complete corporate-action coverage remain pending. Never mark coverage
verified just to clear an unavailable result.

Instructions below about missing local owner credentials or an empty dashboard
describe the original setup, not today's state. Vercel configuration and the
security/deployment gate still need review.

## Original Installation Checklist

This covers BOTH recent changes:
1. Information Only Mode and the admin settings page.
2. The private Institutional Intelligence dashboard.

Nothing in this checklist requires you to write code. Keep coming-soon active.
Do not push/deploy, enable recommendations or turn on scheduled jobs yet.

Owner update: the intended owner and SEC contact are now `way2investing9@gmail.com`.
If you already completed the original account grant for `way2ravi@gmail.com`,
run `docs/setup/05-transfer-private-owner.sql` next, rather than repeating step 6.
This transfers private access/watchlist and leaves the old user account intact.

## Who Does What?

**You:** verify your Supabase account, run the reviewed database SQL in order,
and enter server settings privately in Vercel/local configuration.

**Codex:** fix the framework security advisories, run the application/database
permission checks, test sign-in, and prepare the GitHub/Vercel deployment.

Do not share your password, service-role key, secret API key or cron secret in
chat or screenshots. Your user UUID and SQL error text are not those secrets.

## 1. Open the Correct Supabase Project

- Open https://supabase.com/dashboard and sign in.
- Select the existing project used by Way2Investing. Do not create another project.
- In the left menu open **Authentication**, then **Users**.
- Search for **way2investing9@gmail.com** and open that user.
- Check that the email is confirmed. Note its **User UID / ID** for step 6.

**Expected:** exactly your existing, confirmed account.
**Stop if:** the account is absent or unconfirmed. Tell Codex what you see; do not
create several duplicate users or change email settings to work around it.

## 2. Check What Is Already Installed (No Changes)

- Open **SQL Editor** in the same project.
- Start a new query using **New query** or the **+** control.
- Open `docs/setup/01-check-current-state.sql` in this workspace.
- Place that file's SQL in the query editor. Click **Run**.
- Review both results; depending on the editor, use its result tabs or run each
  SELECT separately.

**Expected:** your account has `email_is_confirmed = true`; feature table checks
show `NULL` if you have never installed them.

**Checkpoint:** send Codex the results or a screenshot containing only these
results. If feature tables already exist, do not rerun the private migration.

## 3. Confirm a Backup Before Database Changes

Steps 4 and 5 change database permissions and create tables. Use a staging/test
database first where possible. Before applying them to the live project, confirm
there is a current, restorable backup. If your plan has no backup/restore option,
stop here and ask Codex to help arrange a database export. Do not reset the database.

Keep the public website on coming-soon throughout this work.

## 4. Install the Information Only Controls

- In **SQL Editor**, start a new blank query.
- Open `src/lib/supabase/ai_content_controls.sql`.
- Place its complete SQL in the editor, replacing the previous query.
- Use the database administrator / `postgres` role, not `anon` or `authenticated`.
- Click **Run** once. If Supabase warns about permission/policy changes, verify
  this is the correct reviewed file before confirming.

**Expected:** a success message, normally with no result rows.
**Stop if:** any red error appears. Share the error text; do not continue or rerun
unrelated schema scripts. In particular, do not rerun `schema.sql` or `rls.sql`.

## 5. Install the Private Research Tables

Only do this when step 2 showed that the private tables do not exist.

- Start another new blank query.
- Open `src/modules/institutional-intelligence/migrations/001_institutional.sql`.
- Place its complete SQL in the editor.
- Click **Run** once as the database administrator.

**Expected:** success. Tables beginning `ii_` now appear in Table Editor.
**Stop if:** any error appears. This file is not intended to be run repeatedly.

## 6. Give Your Account Admin and Private Access

- Start another new blank query.
- Open `docs/setup/04-authorise-your-account.sql`.
- Place its complete SQL in the editor and click **Run**.
- Your email is already filled in. No editing is necessary.

**Expected:** one account row showing:
- `email`: `way2investing9@gmail.com`
- `role`: `admin`
- `private_access_enabled`: `true`
- `default_stocks`: `14`

The final result contains the content settings. Recommendation permissions must
be `false`; informational analysis and financial news should be `true`.

Note the `owner_user_id` from the account result. If you see an error or a
different owner, stop and share the result. Do not grant access to other users.

## 7. Enter the Server Settings Privately

In Vercel, open your **Way2Investing project**, then **Settings > Environment
Variables**. Choose the relevant environment; Production is for the hosted site.
Do not overwrite existing Supabase URL/public-key values that already work.

| Name | Value |
| --- | --- |
| `COMING_SOON_MODE` | `true` |
| `INSTITUTIONAL_OWNER_EMAIL` | `way2investing9@gmail.com` |
| `INSTITUTIONAL_OWNER_USER_ID` | `2a242050-c61d-43dc-af11-f960ef69f685` |
| `SEC_USER_AGENT` | `Way2Investing private research way2investing9@gmail.com` |
| `INSTITUTIONAL_JOBS_ENABLED` | `false` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your existing server-only Supabase service-role key; never a browser/public key |

The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must
also remain configured. Keep an existing `CRON_SECRET`; do not replace it casually.
If none exists, tell Codex and it can generate a strong one for later job setup.

Find API keys in Supabase **Project Settings > API Keys**. If your project uses
legacy keys, use the legacy `service_role` key for this existing variable. Do not
rotate working keys or migrate key types during this setup. If the UI shows only
new publishable/secret keys, pause and ask Codex to check compatibility.

The variable name must remain `SUPABASE_SERVICE_ROLE_KEY`, never
`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. Mark server secrets sensitive in Vercel.

For local testing, the same server values belong in the ignored `.env.local`.
Owner email, SEC contact and disabled-job values are already there. The owner UUID
and service-role key still need checking/setting. Enter secrets directly in the
local editor, not in chat. Codex can help locate the correct file and restart the
server after you finish.

**Do not click Redeploy yet.** Vercel variable changes apply to a new deployment;
they do not update the currently running deployment.

## 8. Hand Back to Codex for Local Verification

Tell Codex: "Supabase steps are complete and server settings are entered."

Codex should then restart the local preview and check:
- Your account can sign in at `/institutional-intelligence/login`.
- `/admin/settings` shows Information Only Mode.
- All recommendation switches remain off. Do not enter regulatory approval.
- The private dashboard shows the 14 default stocks, with missing data explicitly
  unavailable rather than example prices/holdings.
- A signed-out browser cannot access private pages, APIs or exports.
- Actual database permissions pass staging checks, not only mocked tests.

The local server URL may change when restarted; use the URL Codex confirms then.

## 9. Leave These for Later

Do NOT guess CUSIP identifiers, buy subscriptions, import example prices, enable
automated jobs, or change corporate-action attestations just to fill the screen.
Missing-data messages are expected until verified providers are configured.

We can connect one real institution and one stock together after access works.
Historical market data, broader backfills and advanced alerts are separate work.

## 10. Deploy Only After the Security Check

The current framework has outstanding security advisories. Codex must address
them and retest before deployment. That is coding work, not a manual Supabase task.

After the security fix and access tests, Codex can prepare the GitHub push and
verify the Vercel deployment. Keep `COMING_SOON_MODE=true` and
`INSTITUTIONAL_JOBS_ENABLED=false` for the first hosted private test. Reopening the
public site and enabling schedules are separate decisions.

## Quick Troubleshooting

| What you see | What to do |
| --- | --- |
| Read-only query returns no account | Confirm you selected the correct project and email. Stop before writes. |
| Email is not confirmed | Complete account confirmation before authorising it. |
| `relation already exists` in private migration | Stop; do not delete tables or rerun it. Share the exact error. |
| Private login denies access | Check confirmed email, exact owner UUID, owner-table grant and restarted server configuration. |
| Private dashboard is empty | Expected until verified SEC mappings and market data are configured. |
| Production still shows the old site | No new code has been deployed; environment settings alone do not deploy it. |

## Official UI References

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Vercel environment-variable settings](https://vercel.com/docs/environment-variables/managing-environment-variables)
