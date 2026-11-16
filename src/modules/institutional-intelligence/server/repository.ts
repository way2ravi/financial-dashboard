import "server-only";
import type { ResearchClient } from "./db";
import { defaultWatchlist, type ResearchData } from "../types";

export async function readResearch(
  client: ResearchClient,
  userId: string,
): Promise<ResearchData> {
  const empty: ResearchData = {
    securities: defaultWatchlist.map((ticker) => ({
      ticker,
      name: null,
      sector: null,
      market_cap: null,
      shares_outstanding: null,
      denominator_date: null,
      actions_verified_through: null,
    })),
    institutions: [],
    filings: [],
    holdings: [],
    identifiers: [],
    actions: [],
    prices: [],
    watchlist: [...defaultWatchlist],
    alerts: [],
    jobs: [],
    scoreHistory: [],
    setupError: null,
  };
  try {
    const [
      securities,
      institutions,
      filings,
      identifiers,
      actions,
      prices,
      watchlist,
      alerts,
      jobs,
      scores,
    ] = await Promise.all([
      client.from("ii_securities").select("*"),
      client.from("ii_institutions").select("*"),
      client
        .from("ii_filings")
        .select("*")
        .order("filed_date", { ascending: false })
        .limit(800),
      client.from("ii_identifiers").select("*"),
      client.from("ii_corporate_actions").select("*"),
      client
        .from("ii_prices")
        .select("*")
        .order("date", { ascending: false })
        .order("ticker")
        .range(0, 999),
      userId
        ? client.from("ii_watchlist").select("ticker").eq("user_id", userId)
        : Promise.resolve({ data: [], error: null }),
      client
        .from("ii_alerts")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(200),
      client
        .from("ii_ingestion_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20),
      client
        .from("ii_scores")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(1000),
    ]);
    if (
      [
        securities,
        institutions,
        filings,
        identifiers,
        actions,
        prices,
        watchlist,
        alerts,
        jobs,
        scores,
      ].some((result) => result.error)
    )
      throw new Error("Research tables could not be loaded");
    const marketPrices = [...(prices.data ?? [])];
    if (marketPrices.length === 1000)
      for (let offset = 1000; offset < 15000; offset += 1000) {
        const result = await client
          .from("ii_prices")
          .select("*")
          .order("date", { ascending: false })
          .order("ticker")
          .range(offset, offset + 999);
        if (result.error) throw result.error;
        marketPrices.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 1000) break;
      }
    // Read holdings in pages: a truncated 13F must never be interpreted as a closed position.
    const holdings: ResearchData["holdings"] = [];
    const accessions = (filings.data ?? []).map((f) => f.accession);
    for (let start = 0; start < accessions.length; start += 40) {
      const batch = accessions.slice(start, start + 40);
      for (let offset = 0; ; offset += 1000) {
        const result = await client
          .from("ii_holdings")
          .select("*")
          .in("accession", batch)
          .order("accession")
          .order("cusip")
          .order("share_class")
          .order("share_type")
          .order("put_call")
          .range(offset, offset + 999);
        if (result.error) throw result.error;
        holdings.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < 1000) break;
        if (holdings.length > 100000)
          throw new Error(
            "Holdings dataset exceeds interactive read bound; add server-side aggregation before expanding coverage",
          );
      }
    }
    return {
      securities: securities.data ?? [],
      institutions: institutions.data ?? [],
      filings: filings.data ?? [],
      holdings,
      identifiers: identifiers.data ?? [],
      actions: actions.data ?? [],
      prices: marketPrices,
      watchlist: watchlist.data?.map((w) => w.ticker) ?? [],
      alerts: alerts.data ?? [],
      jobs: jobs.data ?? [],
      scoreHistory: scores.data ?? [],
      setupError: null,
    };
  } catch {
    return {
      ...empty,
      setupError:
        "Research data is unavailable. Apply the private module migration and verify database permissions. No sample financial data is shown.",
    };
  }
}
