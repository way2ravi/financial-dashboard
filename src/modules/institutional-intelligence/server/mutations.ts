import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResearchClient } from "./db";
import { SecProvider } from "./sec";
import { filingDate, record, array } from "../engine/filings";
import { validateWeights } from "../engine/score";
import type { PriceBar } from "../types";
import { ResearchInputError } from "./auth";

export function tickerInput(value: unknown) {
  const ticker = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(ticker))
    throw new ResearchInputError("Enter a valid US ticker");
  return ticker;
}
function source(value: unknown) {
  let url:URL;
  try { url=new URL(String(value)); } catch { throw new ResearchInputError("An HTTPS source reference is required"); }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new ResearchInputError("An HTTPS source reference is required");
  return url.href;
}
function positive(value: unknown) {
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0)
    throw new ResearchInputError("A positive number is required");
  return result;
}
export async function mutateResearch(
  input: unknown,
  userId: string,
  userClient: ResearchClient,
) {
  const body = record(input),
    action = String(body.action);
  const admin = createAdminClient() as unknown as ResearchClient;
  if (action === "watch" || action === "unwatch") {
    const ticker = tickerInput(body.ticker);
    const security = await admin
      .from("ii_securities")
      .upsert({ ticker }, { onConflict: "ticker", ignoreDuplicates: true });
    if (security.error) throw security.error;
    const result =
      action === "watch"
        ? await userClient
            .from("ii_watchlist")
            .upsert(
              { user_id: userId, ticker },
              { onConflict: "user_id,ticker", ignoreDuplicates: true },
            )
        : await userClient
            .from("ii_watchlist")
            .delete()
            .eq("user_id", userId)
            .eq("ticker", ticker);
    if (result.error) throw result.error;
  } else if (action === "institution") {
    const cik = String(body.cik ?? "")
      .replace(/^0+/, "")
      .padStart(10, "0");
    if (!/^\d{10}$/.test(cik) || Number(cik) === 0)
      throw new ResearchInputError("Enter a valid manager CIK");
    const profile = await new SecProvider(admin).submissions(cik);
    const result = await admin
      .from("ii_institutions")
      .upsert(
        { cik, name: profile.name, enabled: true },
        { onConflict: "cik" },
      );
    if (result.error) throw result.error;
  } else if (action === "identifier") {
    const ticker = tickerInput(body.ticker),
      cusip = String(body.cusip ?? "").toUpperCase();
    if (!/^[A-Z0-9*@#]{9}$/.test(cusip))
      throw new ResearchInputError("CUSIP must have nine characters");
    const result = await admin
      .from("ii_identifiers")
      .upsert(
        {
          ticker,
          cusip,
          valid_from: filingDate(body.validFrom),
          valid_to: body.validTo ? filingDate(body.validTo) : null,
          source_url: source(body.sourceUrl),
        },
        { onConflict: "ticker,cusip,valid_from" },
      );
    if (result.error) throw result.error;
  } else if (action === "corporateAction") {
    const result = await admin
      .from("ii_corporate_actions")
      .upsert(
        {
          ticker: tickerInput(body.ticker),
          effective_date: filingDate(body.date),
          split_ratio: positive(body.ratio),
          source_url: source(body.sourceUrl),
        },
        { onConflict: "ticker,effective_date" },
      );
    if (result.error) throw result.error;
  } else if (action === "verifyActions") {
    // This is an explicit owner attestation following review of a licensed corporate-action source.
    if (body.confirmed !== true || !body.sourceUrl)
      throw new ResearchInputError("Source review must be explicitly confirmed");
    const sourceUrl = source(body.sourceUrl);
    const result = await admin
      .from("ii_securities")
      .update({
        actions_verified_through: filingDate(body.date),
        actions_review_source: sourceUrl,
      })
      .eq("ticker", tickerInput(body.ticker));
    if (result.error) throw result.error;
  } else if (action === "securityMetadata") {
    const result = await admin
      .from("ii_securities")
      .update({
        name:
          String(body.name ?? "")
            .trim()
            .slice(0, 200) || null,
        sector:
          String(body.sector ?? "")
            .trim()
            .slice(0, 100) || null,
        market_cap: body.marketCap ? positive(body.marketCap) : null,
        metadata_source_url: source(body.sourceUrl),
      })
      .eq("ticker", tickerInput(body.ticker));
    if (result.error) throw result.error;
  } else if (action === "prices") {
    const entries = array(body.bars);
    if (!entries.length || entries.length > 5000 || body.licensed !== true)
      throw new ResearchInputError(
        "Import 1-5000 licensed historical bars and confirm usage rights",
      );
    const ticker = tickerInput(body.ticker),
      sourceUrl = source(body.sourceUrl);
    const rows: PriceBar[] = entries.map((value) => {
      const bar = record(value);
      const volume = Number(bar.volume);
      const result = {
        ticker,
        date: filingDate(bar.date),
        open: positive(bar.open),
        high: positive(bar.high),
        low: positive(bar.low),
        close: positive(bar.close),
        volume,
        adjusted: body.adjusted === true,
        source_url: sourceUrl,
        fetched_at: new Date().toISOString(),
      };
      if (
        !Number.isFinite(volume) ||
        volume < 0 ||
        result.high < Math.max(result.open, result.close, result.low) ||
        result.low > Math.min(result.open, result.close)
      )
        throw new ResearchInputError("Invalid OHLCV bar");
      return result;
    });
    const result = await admin
      .from("ii_prices")
      .upsert(rows, { onConflict: "ticker,date" });
    if (result.error) throw result.error;
  } else if (action === "settings") {
    const weights = record(body.weights) as Record<string, number>;
    if (!validateWeights(weights)) throw new ResearchInputError("Weights must sum to 100");
    const result = await admin
      .from("ii_settings")
      .update({
        weights,
        alert_threshold: positive(body.alertThreshold),
        volume_threshold: positive(body.volumeThreshold),
      })
      .eq("id", 1);
    if (result.error) throw result.error;
  } else if (action === "readAlert") {
    const result = await userClient
      .from("ii_alerts")
      .update({ read_at: new Date().toISOString() })
      .eq("dedup_key", String(body.key));
    if (result.error) throw result.error;
  } else throw new ResearchInputError("Unsupported research action");
}
