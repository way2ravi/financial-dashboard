import "server-only";
import type { ResearchClient } from "./db";
import type { Filing, Holding } from "../types";
import {
  array,
  record,
  parse13FCover,
  parse13FTable,
  parseInsiderForm4,
  parseBeneficialOwnership,
  parseXml,
} from "../engine/filings";
import { createHash } from "node:crypto";

export interface FilingProvider {
  submissions(cik: string): Promise<{ name: string; filings: Filing[] }>;
  filing(filing: Filing): Promise<{ filing: Filing; holdings: Holding[] }>;
}
export class SecProvider implements FilingProvider {
  constructor(
    private client: ResearchClient,
    private userAgent = process.env.SEC_USER_AGENT,
  ) {}
  async request(url: string) {
    const target = new URL(url);
    if (!this.userAgent || !/\S+@\S+\.\S+/.test(this.userAgent))
      throw new Error(
        "Configure SEC_USER_AGENT with an identifying organisation and contact email",
      );
    if (
      target.protocol !== "https:" ||
      !["www.sec.gov", "data.sec.gov"].includes(target.hostname) ||
      target.username ||
      target.password ||
      target.port
    )
      throw new Error("SEC URL rejected");
    const { data: delay, error } = await this.client.rpc(
      "ii_reserve_sec_request",
    );
    if (error || delay === null || delay > 15000)
      throw new Error("SEC rate-limit reservation unavailable; retry next run");
    await new Promise((resolve) => setTimeout(resolve, delay));
    const response = await fetch(target, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json, application/xml, text/xml",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(
        `SEC returned ${response.status}; ${response.status === 429 || response.status === 403 ? "pause and retry in a later scheduled run" : "filing not downloaded"}`,
      );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty SEC response");
    let size = 0;
    const decoder = new TextDecoder();
    let text = "";
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 12_000_000)
          throw new Error("SEC file exceeds the bounded ingestion limit");
        text += decoder.decode(part.value, { stream: true });
      }
      return text + decoder.decode();
    } finally {
      await reader.cancel();
    }
  }
  async submissions(cik: string) {
    if (!/^\d{10}$/.test(cik)) throw new Error("CIK must contain 10 digits");
    const data = record(
      JSON.parse(
        await this.request(`https://data.sec.gov/submissions/CIK${cik}.json`),
      ),
    );
    return {
      name: String(data.name ?? cik),
      filings: this.submissionRows(cik, record(record(data.filings).recent)),
    };
  }
  async historical13F(cik: string, reportDate: string) {
    if (!/^\d{10}$/.test(cik)) throw new Error("CIK must contain 10 digits");
    const data = record(
      JSON.parse(
        await this.request(`https://data.sec.gov/submissions/CIK${cik}.json`),
      ),
    );
    const history = record(data.filings);
    const matches = (rows: Record<string, unknown>) =>
      this.submissionRows(cik, rows).filter(
        (f) => /^13F-HR(\/A)?$/.test(f.form) && f.report_date === reportDate,
      );
    const filings = matches(record(history.recent));
    // Inspect at most two archive files; deeper history requires an explicit page.
    const archives = array(history.files)
      .map(record)
      .filter(
        (file) =>
          typeof file.name === "string" &&
          new RegExp(`^CIK${cik}-submissions-\\d+\\.json$`).test(file.name) &&
          /^\d{4}-\d{2}-\d{2}$/.test(String(file.filingTo)) &&
          String(file.filingTo) >= reportDate,
      );
    if (!filings.length) {
      for (const file of archives.slice(0, 2)) {
        const rows = record(
          JSON.parse(
            await this.request(`https://data.sec.gov/submissions/${file.name}`),
          ),
        );
        filings.push(...matches(rows));
      }
      if (!filings.length && archives.length > 2)
        throw new Error(
          `Quarter not found in bounded search. Try archive: ${String(archives[2].name)}`,
        );
    }
    return filings;
  }
  async archived13F(cik: string, reportDate: string, archive: string) {
    if (
      !/^\d{10}$/.test(cik) ||
      !new RegExp(`^CIK${cik}-submissions-\\d+\\.json$`).test(archive)
    )
      throw new Error("Invalid SEC archive filename");
    const profile = record(
      JSON.parse(
        await this.request(`https://data.sec.gov/submissions/CIK${cik}.json`),
      ),
    );
    if (
      !array(record(profile.filings).files).some(
        (file) => record(file).name === archive,
      )
    )
      throw new Error("Archive not listed in this manager's SEC history");
    const rows = record(
      JSON.parse(
        await this.request(`https://data.sec.gov/submissions/${archive}`),
      ),
    );
    return this.submissionRows(cik, rows).filter(
      (f) => /^13F-HR(\/A)?$/.test(f.form) && f.report_date === reportDate,
    );
  }
  private submissionRows(cik: string, recent: Record<string, unknown>) {
    const forms = array(recent.form),
      accessions = array(recent.accessionNumber),
      dates = array(recent.filingDate),
      reports = array(recent.reportDate);
    const filings: Filing[] = [];
    for (let i = 0; i < forms.length; i++) {
      const form = String(forms[i]);
      const accession = String(accessions[i]);
      if (
        !/^(13F-HR(\/A)?|SC 13[DG](\/A)?|SCHEDULE 13[DG](\/A)?|4(\/A)?)$/.test(
          form,
        ) ||
        !/^\d{10}-\d{2}-\d{6}$/.test(accession)
      )
        continue;
      filings.push({
        accession,
        cik,
        form,
        report_date: String(reports[i] ?? "") || null,
        filed_date: String(dates[i]),
        source_url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll("-", "")}/${accession}-index.html`,
        amendment: form.endsWith("/A") ? "unresolved" : "original",
        amendment_number: 0,
        status: "discovered",
        detected_at: new Date().toISOString(),
        content_hash: null,
        metadata: {
          coverage:
            "SEC submission history; bounded discovery, not certification of complete archive or amendment coverage",
        },
      });
    }
    return filings;
  }
  async filing(filing: Filing) {
    const base = `https://www.sec.gov/Archives/edgar/data/${Number(filing.cik)}/${filing.accession.replaceAll("-", "")}`;
    const listing = record(
      record(JSON.parse(await this.request(`${base}/index.json`))).directory,
    );
    const files = array(listing.item)
      .map(record)
      .map((item) => String(item.name))
      .filter(
        (name) =>
          /^[A-Za-z0-9_.-]+\.xml$/i.test(name) &&
          !name.toLowerCase().includes("xsl"),
      );
    const documents: Array<{ text: string; parsed: Record<string, unknown> }> =
      [];
    for (const name of files.slice(0, 6)) {
      const text = await this.request(`${base}/${name}`);
      documents.push({ text, parsed: parseXml(text) });
    }
    const hash = createHash("sha256")
      .update(documents.map((d) => d.text).join("\n"))
      .digest("hex");
    let holdings: Holding[] = [];
    if (filing.form.startsWith("13F")) {
      const coverDoc = documents.find((d) => d.parsed.edgarSubmission);
      const tableDoc = documents.find((d) => d.parsed.informationTable);
      if (!coverDoc || !tableDoc)
        throw new Error(
          "13F cover/information table missing; filing not committed",
        );
      const cover = parse13FCover(coverDoc.text);
      holdings = parse13FTable(tableDoc.text, filing.accession);
      if (cover.amendment === "unresolved")
        throw new Error("Unresolved amendment type; manual review required");
      // Entry totals refer to raw rows, which may aggregate into fewer position rows.
      const rawEntries = array(
        record(tableDoc.parsed.informationTable).infoTable,
      ).length;
      if (cover.expectedEntries !== rawEntries)
        throw new Error(
          "Information table does not reconcile to cover entry total",
        );
      filing = {
        ...filing,
        report_date: cover.reportDate,
        amendment: cover.amendment,
        amendment_number: cover.amendmentNumber,
        metadata: {
          ...filing.metadata,
          confidential: cover.confidential,
          rawEntries,
        },
      };
    } else if (/^4/.test(filing.form)) {
      const document = documents.find((d) => d.parsed.ownershipDocument);
      if (!document) throw new Error("Form 4 ownership XML is missing");
      filing = {
        ...filing,
        metadata: {
          ...filing.metadata,
          insider: parseInsiderForm4(document.text),
        },
      };
    } else {
      const document = documents.find((d) => d.parsed.edgarSubmission);
      if (!document)
        throw new Error(
          "Structured beneficial-ownership XML unavailable; review original filing",
        );
      filing = {
        ...filing,
        metadata: {
          ...filing.metadata,
          beneficialOwnership: parseBeneficialOwnership(document.text),
        },
      };
    }
    return {
      filing: { ...filing, status: "parsed" as const, content_hash: hash },
      holdings,
    };
  }
}
