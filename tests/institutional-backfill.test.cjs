/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loader } = require("./helpers/load-ts.cjs");
const base = "src/modules/institutional-intelligence/server/";
const { SecProvider } = loader()(base + "sec.ts");
const cik = "0001067983";
const quarter = "2026-03-31";
const archive = `CIK${cik}-submissions-001.json`;
function rows(forms = ["13F-HR", "13F-HR/A", "4", "13F-HR"]) {
  return {
    form: forms,
    accessionNumber: forms.map(
      (_, i) => `0001193125-26-${String(i + 1).padStart(6, "0")}`,
    ),
    reportDate: forms.map((_, i) => (i === 3 ? "2026-06-30" : quarter)),
    filingDate: forms.map(() => "2026-05-15"),
  };
}
function provider(profile, archives = {}) {
  const sec = new SecProvider({}, "Tests test@example.invalid");
  const urls = [];
  sec.request = async (url) => {
    urls.push(url);
    if (url.endsWith(`CIK${cik}.json`)) return JSON.stringify(profile);
    const file = url.split("/").at(-1);
    assert.ok(file in archives, `Unexpected archive: ${file}`);
    return JSON.stringify(archives[file]);
  };
  return { sec, urls };
}
test("quarter backfill bypasses the latest forty unrelated filings", async () => {
  const recent = rows(Array(45).fill("4").concat("13F-HR"));
  const { sec, urls } = provider({ filings: { recent } });
  const found = await sec.historical13F(cik, quarter);
  assert.equal(found.length, 1);
  assert.equal(found[0].form, "13F-HR");
  assert.equal(urls.length, 1);
});
test("backfill preserves base and amendment, excluding unrelated forms and quarters", async () => {
  const { sec } = provider({ filings: { recent: rows() } });
  const found = await sec.historical13F(cik, quarter);
  assert.deepEqual(
    found.map((f) => f.form),
    ["13F-HR", "13F-HR/A"],
  );
  assert.equal(found[1].amendment, "unresolved");
});
test("archive fallback reads the SEC columnar archive format", async () => {
  const { sec, urls } = provider(
    {
      filings: {
        recent: {},
        files: [{ name: archive, filingTo: "2026-06-01" }],
      },
    },
    { [archive]: rows() },
  );
  assert.equal((await sec.historical13F(cik, quarter)).length, 2);
  assert.equal(urls.length, 2);
});
test("untrusted archive paths and other-manager files are not fetched", async () => {
  const { sec, urls } = provider({
    filings: {
      recent: {},
      files: [
        { name: "../../evil.json", filingTo: "2026-06-01" },
        { name: "CIK9999999999-submissions-001.json", filingTo: "2026-06-01" },
      ],
    },
  });
  assert.equal((await sec.historical13F(cik, quarter)).length, 0);
  assert.equal(urls.length, 1);
  await assert.rejects(
    sec.archived13F(cik, quarter, "../../evil.json"),
    /Invalid/,
  );
});
test("explicit archive must be listed in the matching SEC manager profile", async () => {
  const { sec, urls } = provider({ filings: { files: [] } });
  await assert.rejects(sec.archived13F(cik, quarter, archive), /not listed/);
  assert.equal(urls.length, 1);
});
test("bounded archive search stops after two files and identifies the next page", async () => {
  const files = [1, 2, 3].map((n) => ({
    name: `CIK${cik}-submissions-00${n}.json`,
    filingTo: "2026-06-01",
  }));
  const { sec, urls } = provider(
    { filings: { recent: {}, files } },
    Object.fromEntries(files.map((f) => [f.name, {}])),
  );
  await assert.rejects(sec.historical13F(cik, quarter), /submissions-003.json/);
  assert.equal(urls.length, 3);
});
test("explicit listed archive imports only the requested quarter", async () => {
  const { sec } = provider(
    { filings: { files: [{ name: archive }] } },
    { [archive]: rows() },
  );
  assert.equal((await sec.archived13F(cik, quarter, archive)).length, 2);
});
test("backfill input rejects non-quarter dates, future dates and foreign archive filenames", () => {
  class ResearchInputError extends Error {}
  const load = loader({
    "./auth": { ResearchInputError },
    "@/lib/supabase/admin": {},
    "./repository": {},
  });
  const { backfillInput } = load(base + "ingestion.ts");
  assert.deepEqual(backfillInput({ cik: "1067983", reportDate: quarter }), {
    cik,
    reportDate: quarter,
    archive: "",
  });
  for (const body of [
    { cik: "0", reportDate: quarter },
    { cik, reportDate: "2026-04-01" },
    { cik, reportDate: "9999-12-31" },
    { cik, reportDate: quarter, archive: "../evil.json" },
  ])
    assert.throws(() => backfillInput(body), ResearchInputError);
});
test("targeted ingestion uses the shared lease, scopes the queue, and skips committed filings on repeat", async () => {
  const calls = [];
  let parsed = false;
  const filing = {
    accession: "0001193125-26-000001",
    cik,
    form: "13F-HR",
    report_date: quarter,
    metadata: {},
  };
  const client = {
    rpc: async (name) => {
      calls.push([name]);
      if (name === "ii_commit_filing") parsed = true;
      return { data: true, error: null };
    },
    from: (table) => {
      const query = {};
      for (const method of [
        "select",
        "insert",
        "update",
        "upsert",
        "eq",
        "neq",
        "order",
        "limit",
        "in",
      ])
        query[method] = (...args) => {
          calls.push([table, method, ...args]);
          return query;
        };
      query.single = async () => ({ data: {}, error: null });
      query.then = (resolve) =>
        resolve({
          error: null,
          count: 0,
          data:
            table === "ii_institutions"
              ? [{ cik, enabled: true }]
              : table === "ii_filings"
                ? parsed
                  ? []
                  : [filing]
                : [],
        });
      return query;
    },
  };
  class Provider {
    async historical13F() {
      return [filing];
    }
    async filing(f) {
      return { filing: { ...f, status: "parsed" }, holdings: [] };
    }
  }
  const load = loader({
    "@/lib/supabase/admin": { createAdminClient: () => client },
    "./sec": { SecProvider: Provider },
    "./repository": { readResearch: async () => ({ securities: [] }) },
    "./auth": { ResearchInputError: class extends Error {} },
  });
  const { runIngestion } = load(base + "ingestion.ts");
  assert.equal(
    (await runIngestion({ cik, reportDate: quarter, archive: "" })).processed,
    1,
  );
  assert.equal(
    (await runIngestion({ cik, reportDate: quarter, archive: "" })).processed,
    0,
  );
  assert.equal(calls.filter((c) => c[0] === "ii_commit_filing").length, 1);
  assert.equal(calls.filter((c) => c[0] === "ii_release_ingestion").length, 2);
  assert.ok(
    calls.some(
      (c) =>
        c[0] === "ii_filings" &&
        c[1] === "eq" &&
        c[2] === "report_date" &&
        c[3] === quarter,
    ),
  );
  assert.ok(
    calls.some(
      (c) =>
        c[0] === "ii_filings" &&
        c[1] === "in" &&
        c[2] === "form" &&
        c[3].join() === "13F-HR,13F-HR/A",
    ),
  );
  assert.ok(
    calls.some(
      (c) =>
        c[0] === "ii_filings" &&
        c[1] === "upsert" &&
        c[3].ignoreDuplicates === true,
    ),
  );
});
test("backfill endpoint requires owner authentication and same-origin writes", async () => {
  const auth = loader()(base + "auth.ts");
  for (const scenario of ["anonymous", "non-owner", "cross-origin", "owner"]) {
    let runs = 0;
    const load = loader({
      "@/modules/institutional-intelligence/server/auth": {
        ...auth,
        requireOwner: async () => {
          if (scenario === "anonymous") throw new auth.ResearchAccessError(401);
          if (scenario === "non-owner") throw new auth.ResearchAccessError(403);
          return { user: { id: "owner" }, client: {} };
        },
      },
      "@/modules/institutional-intelligence/server/ingestion": {
        backfillInput: (body) => {
          assert.equal(body.reportDate, quarter);
          return body;
        },
        runIngestion: async () => {
          runs++;
          return { processed: 1 };
        },
      },
      "@/modules/institutional-intelligence/server/repository": {},
      "@/modules/institutional-intelligence/server/view": {},
      "@/modules/institutional-intelligence/server/mutations": {},
    });
    const response = await load(
      "src/app/api/institutional-intelligence/route.ts",
    ).POST(
      new Request("https://example.com/api/institutional-intelligence", {
        method: "POST",
        headers: {
          origin:
            scenario === "cross-origin"
              ? "https://other.example"
              : "https://example.com",
        },
        body: JSON.stringify({
          action: "backfill13F",
          cik,
          reportDate: quarter,
        }),
      }),
    );
    assert.equal(
      response.status,
      scenario === "owner" ? 200 : scenario === "anonymous" ? 401 : 403,
    );
    assert.equal(runs, scenario === "owner" ? 1 : 0);
  }
});
