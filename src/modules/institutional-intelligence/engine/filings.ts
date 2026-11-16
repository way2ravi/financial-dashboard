import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { Filing, Holding } from "../types";

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  processEntities: false,
  isArray: (name: string) =>
    name === "infoTable" ||
    name === "nonDerivativeTransaction" ||
    name === "derivativeTransaction",
});
export function parseXml(xml: string): Record<string, unknown> {
  if (
    xml.length > 12_000_000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
    throw new Error("Invalid or unsafe filing XML");
  return xmlParser.parse(xml) as Record<string, unknown>;
}
export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function array(value: unknown): unknown[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}
export function find(value: unknown, key: string): unknown {
  const obj = record(value);
  if (key in obj) return obj[key];
  for (const child of Object.values(obj)) {
    const result = find(child, key);
    if (result !== undefined) return result;
  }
  return undefined;
}
export function filingDate(value: unknown): string {
  const text = String(value ?? "");
  const match = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const normalized = match ? `${match[3]}-${match[1]}-${match[2]}` : text;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
    !Number.isFinite(Date.parse(normalized)) ||
    new Date(normalized).toISOString().slice(0, 10) !== normalized
  )
    throw new Error("Invalid reporting date");
  return normalized;
}
function quantity(value: unknown) {
  const text = String(value ?? "");
  if (!/^\d+(\.\d+)?$/.test(text))
    throw new Error("Invalid reported share quantity");
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > Number.MAX_SAFE_INTEGER)
    throw new Error("Share quantity exceeds safe numeric range");
  return amount;
}
export function parse13FCover(xml: string) {
  const parsed = parseXml(xml);
  const isAmendment = /^(true|1)$/i.test(
    String(find(parsed, "isAmendment") ?? "false"),
  );
  const amendmentType = String(
    find(parsed, "amendmentType") ?? "",
  ).toUpperCase();
  const amendment: Filing["amendment"] = !isAmendment
    ? "original"
    : amendmentType === "RESTATEMENT"
      ? "restatement"
      : amendmentType === "NEW HOLDINGS" ||
          amendmentType === "ADDS NEW HOLDINGS ENTRIES"
        ? "additive"
        : "unresolved";
  return {
    reportDate: filingDate(
      find(parsed, "reportCalendarOrQuarter") ?? find(parsed, "periodOfReport"),
    ),
    amendment,
    amendmentNumber: quantity(find(parsed, "amendmentNo") ?? 0),
    expectedEntries: quantity(find(parsed, "tableEntryTotal") ?? 0),
    confidential: /^(true|1)$/i.test(
      String(find(parsed, "isConfidentialOmitted") ?? "false"),
    ),
  };
}
export function parse13FTable(xml: string, accession: string): Holding[] {
  const root = record(parseXml(xml).informationTable);
  if (!Object.keys(root).length)
    throw new Error("Missing 13F informationTable root");
  const rows = array(root.infoTable);
  const aggregated = new Map<string, Holding>();
  for (const value of rows) {
    const row = record(value);
    const details = record(row.shrsOrPrnAmt);
    const cusip = String(row.cusip ?? "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9*@#]{9}$/.test(cusip))
      throw new Error("Invalid CUSIP; filing quarantined");
    const holding: Holding = {
      accession,
      cusip,
      issuer: String(row.nameOfIssuer ?? ""),
      share_class: String(row.titleOfClass ?? ""),
      shares: quantity(details.sshPrnamt),
      share_type: String(details.sshPrnamtType ?? ""),
      put_call: String(row.putCall ?? "").toUpperCase(),
      value: null,
    };
    // Currency-unit interpretation is deliberately not inferred across SEC schema versions.
    const key = [
      cusip,
      holding.share_class,
      holding.share_type,
      holding.put_call,
    ].join("|");
    const existing = aggregated.get(key);
    if (existing) {
      existing.shares += holding.shares;
      if (existing.shares > Number.MAX_SAFE_INTEGER)
        throw new Error("Aggregated shares exceed safe numeric range");
    } else aggregated.set(key, holding);
  }
  return [...aggregated.values()];
}

// Filings are reduced by manager + reporting period, never by filing date alone.
// Additive amendments cannot replace originals or be counted as another manager.
export function effectiveHoldings(filings: Filing[], holdings: Holding[]) {
  const groups = new Map<string, Filing[]>();
  for (const filing of filings.filter((f) => /^13F-HR/.test(f.form))) {
    const key = `${filing.cik}:${filing.report_date}`;
    groups.set(key, [...(groups.get(key) ?? []), filing]);
  }
  const result: Array<{
    filing: Filing;
    holdings: Holding[];
    complete: boolean;
  }> = [];
  for (const group of groups.values()) {
    const sorted = group.sort(
      (a, b) =>
        a.filed_date.localeCompare(b.filed_date) ||
        a.amendment_number - b.amendment_number ||
        a.accession.localeCompare(b.accession),
    );
    let rows: Holding[] = [];
    let base: Filing | null = null;
    let complete = true;
    for (const filing of sorted) {
      if (filing.status !== "parsed" || filing.amendment === "unresolved") {
        complete = false;
        continue;
      }
      const entries = holdings.filter((h) => h.accession === filing.accession);
      if (
        filing.amendment === "original" ||
        filing.amendment === "restatement"
      ) {
        rows = entries;
        base = filing;
        complete = !filing.metadata.confidential;
      } else if (filing.amendment === "additive") {
        if (!base) {
          complete = false;
          continue;
        }
        const existingKeys = new Set(
          rows.map((h) =>
            [h.cusip, h.share_class, h.share_type, h.put_call].join("|"),
          ),
        );
        if (
          entries.some((h) =>
            existingKeys.has(
              [h.cusip, h.share_class, h.share_type, h.put_call].join("|"),
            ),
          )
        ) {
          complete = false;
          continue;
        }
        rows = [...rows, ...entries];
        base = { ...filing, amendment: base.amendment };
      }
    }
    if (base) result.push({ filing: base, holdings: rows, complete });
  }
  return result;
}

export function parseInsiderForm4(xml: string) {
  const doc = record(parseXml(xml).ownershipDocument);
  if (!Object.keys(doc).length)
    throw new Error("Not an insider ownership document");
  return {
    category: "Insider disclosure (not institutional ownership)",
    issuerCik: String(record(doc.issuer).issuerCik ?? ""),
    reportDate: filingDate(doc.periodOfReport),
    transactions: array(
      record(doc.nonDerivativeTable).nonDerivativeTransaction,
    ).map((item) => {
      const row = record(item);
      return {
        transactionDate: filingDate(record(row.transactionDate).value),
        code: String(record(row.transactionCoding).transactionCode ?? ""),
        shares: quantity(
          record(record(row.transactionAmounts).transactionShares).value,
        ),
      };
    }),
  };
}
export function parseBeneficialOwnership(xml: string) {
  const doc = parseXml(xml);
  return {
    category: "Beneficial ownership disclosure (not a 13F transaction)",
    issuerCik: String(find(doc, "issuerCik") ?? ""),
    eventDate: String(find(doc, "dateOfEvent") ?? ""),
    details:
      "Review original filing for voting power, reporting-person groups and beneficial ownership basis.",
  };
}
