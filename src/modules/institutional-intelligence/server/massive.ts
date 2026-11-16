import "server-only";
import { ResearchInputError } from "./auth";
import { filingDate, record } from "../engine/filings";
import type { SplitCheck } from "../types";

export function splitCheckInput(input: unknown, now = new Date()) {
  const body = record(input);
  const ticker = String(body.ticker ?? "")
    .trim()
    .toUpperCase();
  let from: string, to: string;
  try {
    from = filingDate(body.from);
    to = filingDate(body.to);
  } catch {
    throw new ResearchInputError("Enter valid start and end dates");
  }
  const oldest = new Date(now);
  oldest.setUTCFullYear(oldest.getUTCFullYear() - 2);
  if (
    !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(ticker) ||
    from >= to ||
    from < oldest.toISOString().slice(0, 10) ||
    to > now.toISOString().slice(0, 10)
  )
    throw new ResearchInputError(
      "Choose a valid ticker and an increasing date range within the last two years",
    );
  return { ticker, from, to };
}

export async function checkMassiveSplits(
  input: ReturnType<typeof splitCheckInput>,
): Promise<SplitCheck> {
  const key = process.env.MASSIVE_API_KEY?.trim();
  if (!key)
    throw new ResearchInputError(
      "MASSIVE_API_KEY is not configured on this server",
    );
  const url = new URL("https://api.massive.com/stocks/v1/splits");
  Object.entries({
    ticker: input.ticker,
    "execution_date.gt": input.from,
    "execution_date.lte": input.to,
    limit: "1000",
    sort: "execution_date.asc",
  }).forEach(([name, value]) => url.searchParams.set(name, value));
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ResearchInputError("Massive could not be reached. Retry later");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new ResearchInputError(
      response.status === 429
        ? "Massive rate limit reached. Wait a minute before retrying"
        : [401, 403, 404].includes(response.status)
          ? "Massive rejected this request. Check the server key and plan access"
          : "Massive is temporarily unavailable. Retry later",
    );
  }
  const reader = response.body?.getReader();
  if (!reader)
    throw new ResearchInputError("Massive returned an empty response");
  let text = "",
    size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 1_000_000) throw new Error("Response limit");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    throw new ResearchInputError(
      "Massive response was incomplete or too large. No result accepted",
    );
  } finally {
    await reader.cancel();
  }
  let body: Record<string, unknown>;
  try {
    body = record(JSON.parse(text));
  } catch {
    throw new ResearchInputError(
      "Massive returned invalid data. No result accepted",
    );
  }
  if (
    body.status !== "OK" ||
    !Array.isArray(body.results) ||
    body.results.length > 1000
  )
    throw new ResearchInputError(
      "Massive returned an unexpected response. No result accepted",
    );
  const events = body.results.map((value) => {
    const row = record(value);
    const date = String(row.execution_date);
    const oldShares = row.split_from,
      newShares = row.split_to;
    const kind = String(row.adjustment_type);
    if (
      row.ticker !== input.ticker ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      date <= input.from ||
      date > input.to ||
      typeof oldShares !== "number" ||
      typeof newShares !== "number" ||
      !Number.isFinite(oldShares) ||
      !Number.isFinite(newShares) ||
      oldShares <= 0 ||
      newShares <= 0 ||
      !Number.isFinite(newShares / oldShares) ||
      !["forward_split", "reverse_split", "stock_dividend"].includes(kind)
    )
      throw new ResearchInputError(
        "Massive returned an invalid split event. No result accepted",
      );
    return { date, kind, oldShares, newShares, ratio: newShares / oldShares };
  });
  return {
    ...input,
    checkedAt: new Date().toISOString(),
    events,
    paginationPending: Boolean(body.next_url),
    sourceUrl: url.href,
  };
}
