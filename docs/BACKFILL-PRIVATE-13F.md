# Import an Earlier Holdings Quarter

Use the private local dashboard. No Supabase SQL or deployment change is needed.

1. Sign in and open **Configuration**.
2. Find **Historical 13F backfill**.
3. Select **BERKSHIRE HATHAWAY INC**.
4. Set **Quarter-end date** to **31 March 2026**.
5. Leave **SEC archive filename** blank.
6. Click **Backfill quarter** and wait for the completion message.
7. Open **Filings** and look for a **13F-HR** with reporting period **2026-03-31**.
   If it is discovered, repeat the same backfill form. Each run parses at most two
   eligible filings, including amendments. Stop on errors and inspect the private log.

## What This Does

The owner-only, same-origin action uses the existing ingestion lease, SEC contact,
shared request limiter, atomic filing commit and retry backoff. It selects only
13F-HR and 13F-HR/A for the chosen manager and quarter, bypassing newer Form 4s.
Already parsed filings are not reimported; stored records are not overwritten by
discovery. Jobs remain disabled unless separately enabled.

Discovery checks all recent submissions rather than only the latest forty matching
filings. If the quarter is absent there, it inspects at most two eligible SEC-listed
archive files. For deeper history, enter a specific filename listed in that
manager's official SEC submissions JSON, such as
`CIK0001067983-submissions-001.json`. Never enter a full URL. Filenames are checked
against the manager's SEC archive list before fetching. Read errors and continuation
filenames in the Configuration ingestion log. An empty search is not proof of no holding.

This is bounded, quarter-specific backfill, not an exhaustive archive crawler or
certification of complete amendment history. No price data, CUSIP mapping or
corporate-action verification is generated automatically. The existing GOOGL
mapping covers only 30 June 2026; an independently sourced mapping for the March
reporting date is still needed. Do not extend identifier dates or attest corporate
actions without checking evidence. Comparisons remain unverified until all checks pass.

Automated tests use synthetic SEC histories and mocked database operations. The
browser test exercises the form with an isolated fixture, not live SEC ingestion.
