# Private Research Coverage Checkpoint

Updated: 16 November 2026.

## Completed

- Added the SEC-verified reporting entities Vanguard Capital Management LLC
  (`0002100119`) and BlackRock, Inc. (`0002012383`). Existing Berkshire unchanged.
- Imported Vanguard Capital Management's March 2026 original 13F, restatement and
  additional-holdings amendment, plus its June 2026 original 13F. All four records
  show parsed. Amendments remain separate source records, not separate managers.
- Added 26 date-specific identifier records, preserving the two existing GOOGL
  records. There are now 28 mappings: 14 tickers on each of 31 March and 30 June.
- Verified that every watchlist ticker has one tracked holder in each period;
  GOOGL has two (Vanguard Capital Management plus Berkshire).
- All comparisons remain unverified. No corporate-action attestations, price
  imports, independent-manager group attestations, public recommendation settings,
  owner grants, cron configuration or deployments were changed.

These are changes in the configured private Supabase database, not sample data.
No GitHub push or Vercel deployment was performed.

## Identifier Evidence

Tickers/issuer identities were checked against the SEC company ticker directory.
CUSIP, issuer and share class were reconciled against the imported SEC information
tables. Only common-share classes were mapped: Alphabet Class C and Opendoor
warrants were excluded. These are point-in-time mappings, not assertions of
identifier continuity throughout the intervening quarter or any later period.

| Ticker | Common-share CUSIP |
| --- | --- |
| NVDA | 67066G104 |
| PLTR | 69608A108 |
| ORCL | 68389X105 |
| TSLA | 88160R101 |
| MSFT | 594918104 |
| GOOGL | 02079K305 |
| SOFI | 83406F102 |
| IOT | 79589L106 |
| BBAI | 08975B109 |
| QUBT | 74766W108 |
| DVLT | 86633R609 |
| HIMS | 433000106 |
| CMG | 169656105 |
| OPEN | 683712103 |

Sources:

- SEC ticker directory: https://www.sec.gov/files/company_tickers.json
- March restatement: https://www.sec.gov/Archives/edgar/data/2100119/000210011926001311/13F_0002100119_20260331_VCM1.xml
- June: https://www.sec.gov/Archives/edgar/data/2100119/000210011926001527/13F_0002100119_20260630.xml

Existing GOOGL mappings retain their Berkshire source URLs.

## Coverage Limits

Vanguard Group's parent files 13F notices pointing to affiliated reporting
managers. Vanguard Capital Management is only one reporting entity. This setup
does not represent all Vanguard affiliates or total institutional ownership.
See https://www.sec.gov/Archives/edgar/data/102909/000010290926002714/0000102909-26-002714-index.html.

### BlackRock Is Pending, Not Imported

The March import was stopped by the existing bounded file reader:
`SEC file exceeds the bounded ingestion limit`. No partial positions were committed.
The June filing was registered as discovered without attempting its oversized table.

| Period | Accession | Information-table bytes | State |
| --- | --- | ---: | --- |
| 31 March 2026 | 0002012383-26-001841 | 23,314,133 | Failed/quarantined, not counted |
| 30 June 2026 | 0002012383-26-003238 | 23,016,794 | Discovered, not counted |

Sizes were checked against each official SEC accession directory `index.json`.
Both exceed the 12,000,000-byte reader limit. Do not repeatedly click ingestion or
raise the web-request limit merely to clear these statuses. The next engineering
task is a bounded large-filing worker with staged parsing, reconciliation, atomic
commit, retry/idempotency tests, and interactive-read capacity checks. Existing
oversize safeguards and exponential retry backoff remain in place.

## What to Check Now

1. Refresh the local private dashboard.
2. Open Watchlist: all 14 stocks should have March/June holdings observations.
3. Open GOOGL and the two parsed managers' pages to inspect the source-linked rows.
4. Leave corporate-action verification unchecked and Information Only Mode enabled.

Remaining work: BlackRock large-file ingestion, additional Vanguard affiliates
with overlap review, complete corporate-action/identifier continuity, licensed
historical prices, and the existing dependency/security/deployment gates.
