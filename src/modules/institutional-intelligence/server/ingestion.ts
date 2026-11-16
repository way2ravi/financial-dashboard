import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash, randomUUID } from "node:crypto";
import type { Json } from "@/lib/types/database";
import type { ResearchClient } from "./db";
import { SecProvider } from "./sec";
import { readResearch } from "./repository";
import { buildSnapshots } from "../engine/ownership";
import { technicalEvidence } from "../engine/technical";
import { scoreEvidence, defaultWeights } from "../engine/score";
import { ResearchInputError } from "./auth";

export function backfillInput(body: Record<string, unknown>) {
  const cik = String(body.cik ?? "")
    .trim()
    .padStart(10, "0");
  const reportDate = String(body.reportDate ?? "");
  const archive = String(body.archive ?? "").trim();
  if (
    !/^\d{10}$/.test(cik) ||
    Number(cik) === 0 ||
    !/^\d{4}-(03-31|06-30|09-30|12-31)$/.test(reportDate) ||
    !Number.isFinite(Date.parse(reportDate)) ||
    reportDate > new Date().toISOString().slice(0, 10) ||
    (archive &&
      !new RegExp(`^CIK${cik}-submissions-\\d+\\.json$`).test(archive))
  )
    throw new ResearchInputError(
      "Enter a manager CIK, a past quarter-end date, and an optional SEC archive filename",
    );
  return { cik, reportDate, archive };
}

export async function runIngestion(
  backfill?: ReturnType<typeof backfillInput>,
) {
  const client = createAdminClient() as unknown as ResearchClient;
  const id = randomUUID();
  const lease = await client.rpc("ii_claim_ingestion", { job_id: id });
  if (lease.error)
    throw new Error("Private research migration/ingestion lease unavailable");
  if (!lease.data) return { status: "busy", processed: 0 };
  let processed = 0,
    failed = 0;
  const deadline = Date.now() + 45000;
  try {
    const log = await client
      .from("ii_ingestion_logs")
      .insert({ id, status: "running" });
    if (log.error) throw log.error;
    const provider = new SecProvider(client);
    const managers = await client
      .from("ii_institutions")
      .select("*")
      .eq("enabled", true)
      .order("cik");
    if (managers.error) throw managers.error;
    // Rotate managers by completed log count rather than repeatedly scanning the first one.
    const count = await client
      .from("ii_ingestion_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed");
    const manager = backfill
      ? managers.data?.find((m) => m.cik === backfill.cik)
      : managers.data?.length
        ? managers.data[(count.count ?? 0) % managers.data.length]
        : null;
    if (backfill && !manager)
      throw new ResearchInputError(
        "Add and enable this manager before backfilling",
      );
    if (manager) {
      const discovered = backfill
        ? {
            filings: backfill.archive
              ? await provider.archived13F(
                  manager.cik,
                  backfill.reportDate,
                  backfill.archive,
                )
              : await provider.historical13F(manager.cik, backfill.reportDate),
          }
        : await provider.submissions(manager.cik);
      if (backfill && !discovered.filings.length)
        throw new ResearchInputError(
          "No 13F found for this quarter in the searched SEC history",
        );
      if (backfill && discovered.filings.length > 40)
        throw new ResearchInputError(
          "Quarter exceeds the 40-filing backfill limit; review SEC history manually",
        );
      for (const filing of discovered.filings.slice(0, 40)) {
        const result = await client
          .from("ii_filings")
          .upsert(filing, { onConflict: "accession", ignoreDuplicates: true });
        if (result.error) throw result.error;
      }
      let pendingQuery = client
        .from("ii_filings")
        .select("*")
        .eq("cik", manager.cik)
        .neq("status", "parsed");
      if (backfill)
        pendingQuery = pendingQuery
          .eq("report_date", backfill.reportDate)
          .in("form", ["13F-HR", "13F-HR/A"]);
      const pending = await pendingQuery
        .order("filed_date", { ascending: false })
        .limit(40);
      if (pending.error) throw pending.error;
      for (const filing of (pending.data ?? [])
        .filter(
          (f) =>
            !f.metadata.retryAfter ||
            Date.parse(String(f.metadata.retryAfter)) <= Date.now(),
        )
        .slice(0, 2)) {
        if (Date.now() > deadline) break;
        try {
          const result = await provider.filing(filing);
          const committed = await client.rpc("ii_commit_filing", {
            filing: result.filing as unknown as Json,
            positions: result.holdings as unknown as Json,
          });
          if (committed.error) throw committed.error;
          const alert = await client.from("ii_alerts").upsert(
            {
              dedup_key: `filing:${filing.accession}`,
              ticker: null,
              cik: filing.cik,
              accession: filing.accession,
              kind: filing.form.startsWith("13F")
                ? "New regulatory holdings disclosure"
                : /^4/.test(filing.form)
                  ? "Insider filing (separate dataset)"
                  : "Beneficial ownership filing",
              report_date: result.filing.report_date,
              filed_date: filing.filed_date,
              evidence: {
                sourceUrl: filing.source_url,
                note: "Filing date is not a trade date",
              },
            },
            { onConflict: "dedup_key", ignoreDuplicates: true },
          );
          if (alert.error) throw alert.error;
          processed++;
        } catch (error) {
          failed++;
          const retries = Number(filing.metadata.retries ?? 0) + 1;
          const result = await client
            .from("ii_filings")
            .update({
              status: "failed",
              metadata: {
                ...filing.metadata,
                retries,
                retryAfter: new Date(
                  Date.now() +
                    Math.min(24 * 3600, 1800 * 2 ** Math.min(retries, 6)) *
                      1000,
                ).toISOString(),
                error:
                  error instanceof Error
                    ? error.message
                    : "Filing could not be parsed",
              },
            })
            .eq("accession", filing.accession);
          if (result.error) throw result.error;
        }
      }
    }
    if (Date.now() < deadline) await updateScoresAndAlerts(client);
    const finished = await client
      .from("ii_ingestion_logs")
      .update({
        status: "completed",
        processed,
        error: failed
          ? `${failed} filings deferred after errors; retries use exponential backoff.`
          : null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (finished.error) throw finished.error;
    return {
      status: "completed",
      processed,
      ...(backfill
        ? {
            note: "Bounded 13F backfill; not a certification of complete filing or amendment history. Repeat if matching filings remain pending.",
          }
        : {}),
    };
  } catch (error) {
    await client
      .from("ii_ingestion_logs")
      .update({
        status: "retryable",
        processed,
        finished_at: new Date().toISOString(),
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Ingestion failed",
      })
      .eq("id", id);
    throw error;
  } finally {
    await client.rpc("ii_release_ingestion", { job_id: id });
  }
}

async function updateScoresAndAlerts(client: ResearchClient) {
  const data = await readResearch(client, "");
  if (data.setupError) throw new Error(data.setupError);
  const settings = await client
    .from("ii_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (settings.error) throw settings.error;
  for (const security of data.securities.filter((s) => s.ticker !== "SPY")) {
    const snapshots = buildSnapshots(data, security.ticker),
      snapshot = snapshots.at(-1);
    const bars = data.prices.filter((p) => p.ticker === security.ticker);
    const technical = technicalEvidence(
      bars,
      data.prices.filter((p) => p.ticker === "SPY"),
    );
    const score = scoreEvidence(
      snapshot,
      technical,
      settings.data?.weights ?? defaultWeights,
    );
    if (snapshot) {
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify({
            ticker: security.ticker,
            snapshot,
            components: score.components,
            weights: score.weights,
            version: score.version,
            barDate: technical?.date,
          }),
        )
        .digest("hex");
      const result = await client.from("ii_scores").upsert(
        {
          fingerprint,
          ticker: security.ticker,
          report_date: snapshot.reportDate,
          score,
        },
        { onConflict: "fingerprint", ignoreDuplicates: true },
      );
      if (result.error) throw result.error;
      for (const change of snapshot.changes) {
        const significant =
          change.changePercent !== null &&
          Math.abs(change.changePercent) >= settings.data.alert_threshold;
        if (
          change.status !== "New" &&
          change.status !== "Closed" &&
          !significant
        )
          continue;
        const alert = await client.from("ii_alerts").upsert(
          {
            dedup_key: `position:${security.ticker}:${change.cik}:${snapshot.reportDate}:${change.status}:${change.shares}`,
            ticker: security.ticker,
            cik: change.cik,
            kind: `Reported position ${change.status.toLowerCase()}`,
            report_date: change.reportDate,
            filed_date: change.filedDate,
            evidence: {
              ...change,
              note: "Quarter-end holdings comparison; transaction dates are not disclosed",
            },
          },
          { onConflict: "dedup_key", ignoreDuplicates: true },
        );
        if (alert.error) throw alert.error;
      }
    }
    if (
      technical?.relativeVolume &&
      technical.relativeVolume >= settings.data.volume_threshold
    ) {
      const result = await client.from("ii_alerts").upsert(
        {
          dedup_key: `volume:${security.ticker}:${technical.date}`,
          ticker: security.ticker,
          kind: "Unusual volume (quantitative observation)",
          report_date: technical.date,
          evidence: {
            relativeVolume: technical.relativeVolume,
            note: "Volume does not identify institutional purchases",
          },
        },
        { onConflict: "dedup_key", ignoreDuplicates: true },
      );
      if (result.error) throw result.error;
    }
  }
}
