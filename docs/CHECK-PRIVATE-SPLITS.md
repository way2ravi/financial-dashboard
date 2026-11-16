# Check Split History

## Local Steps

1. Open http://localhost:3004/institutional-intelligence and sign in.
2. Open **Configuration**.
3. Find **Massive split-history check**.
4. Enter ticker **GOOGL**.
5. Set **After date** to **31 March 2026**.
6. Set **Through date** to **30 June 2026**.
7. Click **Check split history** and wait for the result.

The start date is excluded; the end date is included. This matches the interval
between two quarter-end holdings snapshots. Dates must be within the last two
years, reflecting the current free Stocks Basic plan limit. Wait at least
15 seconds between requests. Other uses of the same account consume quota too.

## Interpret Results

- **No split events returned:** the provider returned an empty list for that range.
  It does not certify no mergers, conversions, ticker changes or other actions.
- **Split events returned:** inspect effective dates, event categories and old/new
  share counts. The multiplier is new shares divided by old shares; it is not the
  provider's cumulative historical price adjustment factor.
- **Partial results:** additional provider pages remain. Do not treat it as a full
  result. This bounded tool does not follow pagination URLs.
- **Error:** no result is accepted. Check the key/access, wait for rate limits, or
  retry later as indicated. Never treat an error as an empty event history.

## Safety and Scope

This check is read-only. It does not write events, confirm action coverage, alter
holdings, enable signals, or change Information Only Mode. Results are temporary
in-browser observations, not persisted audit evidence. Changing input fields clears
the old result. Use the displayed UTC check time and key-free query reference when
reviewing evidence; the query reference may require your own authentication.

`MASSIVE_API_KEY` stays in the server environment. No public key variable is used.
The API requires the configured confirmed owner plus database grant, rejects
cross-origin POSTs, and returns no-store/noindex responses. The upstream host/path
are fixed, authentication uses an Authorization header, redirects are rejected,
and responses are limited to 15 seconds, 1 MB and 1,000 events. Malformed payloads,
unexpected symbols, dates, event types and ratios are rejected. A per-process
15-second cooldown reduces accidental quota use; it is not a distributed quota
guarantee across multiple deployments or workers.

No Supabase migration is needed. Keep this private: a free individual subscription
does not establish public/commercial redistribution rights. Production setup must
separately configure the server key and pass the existing deployment/security gates.

Sources: https://massive.com/docs/rest/stocks/corporate-actions/splits and
https://massive.com/docs/rest/quickstart.

Tests: `npm run test:splits`. Provider responses in automated tests are synthetic;
the responsive browser test uses intercepted responses, not live API quota.
