/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loader } = require("./helpers/load-ts.cjs");
const load = loader(),
  base = "src/modules/institutional-intelligence/";
const {
  parse13FTable,
  parse13FCover,
  effectiveHoldings,
  parseXml,
  parseInsiderForm4,
} = load(base + "engine/filings.ts");
const { buildSnapshots } = load(base + "engine/ownership.ts");
const { scoreEvidence, defaultWeights, validateWeights } = load(
  base + "engine/score.ts",
);
const { technicalEvidence } = load(base + "engine/technical.ts");
const accession = "0001104659-24-089653";
const table = fs.readFileSync(
  path.join(__dirname, "fixtures/sec-" + accession + "-table.xml"),
  "utf8",
);
const cover = fs.readFileSync(
  path.join(__dirname, "fixtures/sec-" + accession + "-cover.xml"),
  "utf8",
);
function filing(id, period, amendment = "original", extra = {}) {
  return {
    accession: id,
    cik: "0001913494",
    form: amendment === "original" ? "13F-HR" : "13F-HR/A",
    report_date: period,
    filed_date: period === "2026-06-30" ? "2026-08-14" : "2026-11-16",
    source_url: "https://www.sec.gov/Archives/edgar/data/1913494/example",
    amendment,
    amendment_number: amendment === "original" ? 0 : 1,
    status: "parsed",
    detected_at: "2026-11-16T00:00:00Z",
    content_hash: null,
    metadata: {},
    ...extra,
  };
}
function holding(accession, shares, cusip = "433539202", extra = {}) {
  return {
    accession,
    cusip,
    issuer: "Synthetic test issuer",
    share_class: "COM",
    shares,
    share_type: "SH",
    put_call: "",
    value: null,
    ...extra,
  };
}
function dataset() {
  return {
    securities: [{ ticker: "TEST", actions_verified_through: "2026-09-30" }],
    institutions: [
      {
        cik: "0001913494",
        name: "Synthetic test manager",
        independence_group: null,
      },
    ],
    filings: [filing("prior", "2026-06-30"), filing("current", "2026-09-30")],
    holdings: [holding("prior", 100), holding("current", 125)],
    identifiers: [
      {
        ticker: "TEST",
        cusip: "433539202",
        valid_from: "2020-01-01",
        valid_to: null,
      },
    ],
    actions: [],
    prices: [],
    watchlist: ["TEST"],
    alerts: [],
    jobs: [],
    scoreHistory: [],
    setupError: null,
  };
}

test("real SEC 13F cover and table reconcile to independently visible source quantities", () => {
  const metadata = parse13FCover(cover),
    holdings = parse13FTable(table, accession);
  assert.equal(metadata.reportDate, "2024-06-30");
  assert.equal(metadata.expectedEntries, 2);
  assert.equal(metadata.amendment, "original");
  assert.equal(holdings.length, 2);
  assert.equal(holdings[0].cusip, "433539202");
  assert.equal(holdings[0].shares, 694769);
  assert.equal(holdings[1].shares, 5209366);
  assert.equal(
    holdings.reduce((s, h) => s + h.shares, 0),
    5904135,
  );
  assert.equal(holdings[0].value, null);
});
test("XML parser rejects entities, malformed documents and invalid reporting dates", () => {
  assert.throws(
    () =>
      parseXml(
        '<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a>&x;</a>',
      ),
    /unsafe/,
  );
  assert.throws(() => parseXml("<broken>"), /Invalid/);
  assert.throws(
    () =>
      parse13FCover(
        cover
          .replace("06-30-2024", "99-99-2024")
          .replace("06-30-2024", "99-99-2024"),
      ),
    /date/,
  );
  assert.throws(
    () => parse13FTable(table.replace("694769", "NaN"), accession),
    /quantity/,
  );
});
test("CUSIP leading zeros and option/share classes are preserved", () => {
  const rows = parse13FTable(
    table.replace("433539202", "000000001"),
    accession,
  );
  assert.equal(rows[0].cusip, "000000001");
  const data = dataset();
  data.holdings.push(holding("current", 500, "433539202", { put_call: "PUT" }));
  assert.equal(buildSnapshots(data, "TEST").at(-1).shares, 125);
});
test("restatements replace originals; additive amendments add distinct holdings once", () => {
  const filings = [
    filing("a", "2026-09-30"),
    filing("b", "2026-09-30", "restatement"),
    filing("c", "2026-09-30", "additive", { amendment_number: 2 }),
  ];
  const holdings = [
    holding("a", 10),
    holding("b", 20),
    holding("c", 30, "64082B102"),
  ];
  const rows = effectiveHoldings(filings, holdings);
  assert.equal(rows.length, 1);
  assert.equal(
    rows[0].holdings.reduce((s, h) => s + h.shares, 0),
    50,
  );
  const repeated = effectiveHoldings(filings, [...holdings]);
  assert.deepEqual(repeated, rows);
});
test("overlapping additive entries and failed amendments invalidate completeness", () => {
  const result = effectiveHoldings(
    [filing("a", "2026-09-30"), filing("b", "2026-09-30", "additive")],
    [holding("a", 10), holding("b", 20)],
  );
  assert.equal(result[0].complete, false);
  assert.equal(result[0].holdings[0].shares, 10);
  const failed = effectiveHoldings(
    [
      filing("a", "2026-09-30"),
      filing("b", "2026-09-30", "unresolved", { status: "failed" }),
    ],
    [holding("a", 10)],
  );
  assert.equal(failed[0].complete, false);
});
test("ownership changes use report periods, not filing dates; partial sample never claims total ownership", () => {
  const snapshot = buildSnapshots(dataset(), "TEST").at(-1);
  assert.equal(snapshot.shares, 125);
  assert.equal(snapshot.added, 25);
  assert.equal(snapshot.changes[0].changePercent, 25);
  assert.equal(snapshot.changes[0].reportDate, "2026-09-30");
  assert.equal(snapshot.changes[0].filedDate, "2026-11-16");
  assert.equal(snapshot.ownershipPercent, null);
});
test("verified split continuity removes false accumulation; missing coverage blocks comparisons", () => {
  const data = dataset();
  data.holdings[1].shares = 400;
  data.actions = [
    {
      ticker: "TEST",
      effective_date: "2026-08-01",
      split_ratio: 4,
      source_url: "https://example.com/split",
    },
  ];
  const snapshot = buildSnapshots(data, "TEST").at(-1);
  assert.equal(snapshot.changes[0].status, "Unchanged");
  assert.equal(snapshot.changes[0].delta, 0);
  data.securities[0].actions_verified_through = null;
  assert.equal(
    buildSnapshots(data, "TEST").at(-1).changes[0].status,
    "Unverified",
  );
});
test("ticker/CUSIP changes use dated identifiers and ambiguous mappings prevent comparisons", () => {
  const data = dataset();
  data.holdings[1].cusip = "64082B102";
  data.identifiers[0].valid_to = "2026-07-01";
  data.identifiers.push({
    ticker: "TEST",
    cusip: "64082B102",
    valid_from: "2026-07-02",
    valid_to: null,
  });
  assert.equal(buildSnapshots(data, "TEST").at(-1).changes[0].delta, 25);
  data.identifiers.push({
    ticker: "OTHER",
    cusip: "64082B102",
    valid_from: "2026-07-02",
    valid_to: null,
  });
  assert.equal(buildSnapshots(data, "TEST").at(-1).comparable, false);
});
test("missing manager filing is not an exit; a complete current report can establish a closed position", () => {
  const data = dataset();
  data.filings.pop();
  data.filings.push(
    filing("other", "2026-09-30", "original", { cik: "0000000002" }),
  );
  assert.equal(buildSnapshots(data, "TEST").at(-1).closedPositions, 0);
  const complete = dataset();
  complete.holdings.pop();
  assert.equal(
    buildSnapshots(complete, "TEST").at(-1).changes[0].status,
    "Closed",
  );
});
test("missing components are not substituted with neutral values; score is explainable and versioned", () => {
  const result = scoreEvidence(
    buildSnapshots(dataset(), "TEST").at(-1),
    null,
    defaultWeights,
    Date.parse("2026-11-16"),
  );
  assert.equal(result.total, null);
  assert.equal(result.components.technical, null);
  assert.ok(result.missing.includes("technical"));
  assert.equal(result.version, "ii-evidence-1.0.0");
  assert.equal(validateWeights({ ...defaultWeights, quality: 11 }), false);
  assert.throws(() => scoreEvidence(undefined, null, {}), /sum to 100/);
});
test("one manager or one volume spike cannot produce a strong classification", () => {
  const snapshot = buildSnapshots(dataset(), "TEST").at(-1);
  snapshot.changes[0].shares = 1000;
  snapshot.changes[0].delta = 900;
  const tech = { cmf: 1, macd: 1, relativeStrength: 30, relativeVolume: 100 };
  const result = scoreEvidence(
    snapshot,
    tech,
    defaultWeights,
    Date.parse("2026-11-16"),
  );
  assert.ok(!result.label.startsWith("Strong"));
  assert.equal(result.confidence, "Low");
});
test("technical evidence uses adjusted aligned data and excludes latest volume from its baseline", () => {
  const bars = Array.from({ length: 230 }, (_, i) => ({
    ticker: "TEST",
    date: new Date(Date.UTC(2026, 3, i + 1)).toISOString().slice(0, 10),
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: i === 229 ? 300 : 100,
    adjusted: true,
  }));
  const benchmark = bars.map((b) => ({ ...b, ticker: "SPY" }));
  const now = Date.parse(bars.at(-1).date) + 1000;
  const result = technicalEvidence(bars, benchmark, now);
  assert.equal(result.relativeVolume, 3);
  assert.equal(result.relativeStrength, 0);
  assert.ok(result.sma200 > 0);
  assert.ok(result.rsi >= 0 && result.rsi <= 100);
  assert.equal(
    technicalEvidence(
      bars.map((b) => ({ ...b, adjusted: false })),
      benchmark,
      now,
    ),
    null,
  );
  assert.equal(technicalEvidence(bars, benchmark, now + 10 * 86400000), null);
  assert.equal(technicalEvidence(bars, [], now).relativeStrength, null);
});
test("Form 4 is explicitly separated and retains the disclosed transaction date", () => {
  const parsed = parseInsiderForm4(
    "<ownershipDocument><periodOfReport>2026-11-10</periodOfReport><issuer><issuerCik>123</issuerCik></issuer><nonDerivativeTable><nonDerivativeTransaction><transactionDate><value>2026-11-09</value></transactionDate><transactionCoding><transactionCode>P</transactionCode></transactionCoding><transactionAmounts><transactionShares><value>25</value></transactionShares></transactionAmounts></nonDerivativeTransaction></nonDerivativeTable></ownershipDocument>",
  );
  assert.match(parsed.category, /Insider/);
  assert.equal(parsed.transactions[0].transactionDate, "2026-11-09");
  assert.equal(parsed.transactions[0].shares, 25);
});
test("owner check requires a verified configured account and a separate database grant", async () => {
  const { matchesOwner } = load(base + "server/auth.ts");
  const user = {
    id: "one",
    email: "owner@example.com",
    email_confirmed_at: "2026-01-01",
  };
  assert.equal(matchesOwner(user, "owner@example.com", "one"), true);
  assert.equal(
    matchesOwner({ ...user, email_confirmed_at: null }, "owner@example.com"),
    false,
  );
  assert.equal(matchesOwner(user, "other@example.com"), false);
  assert.equal(matchesOwner(user, undefined, "two"), false);
  const previous = process.env.INSTITUTIONAL_OWNER_EMAIL;
  process.env.INSTITUTIONAL_OWNER_EMAIL = "owner@example.com";
  const isolated = loader({
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user } }) },
        rpc: async () => ({ data: false, error: null }),
      }),
    },
  });
  await assert.rejects(
    isolated(base + "server/auth.ts").requireOwner(),
    /denied/,
  );
  if (previous === undefined) delete process.env.INSTITUTIONAL_OWNER_EMAIL;
  else process.env.INSTITUTIONAL_OWNER_EMAIL = previous;
});
test("private API/export rejects unauthorised requests before reading data", async () => {
  const auth = load(base + "server/auth.ts");
  let reads = 0;
  const isolated = loader({
    "@/modules/institutional-intelligence/server/auth": {
      ...auth,
      requireOwner: async () => {
        throw new auth.ResearchAccessError(401);
      },
    },
    "@/modules/institutional-intelligence/server/repository": {
      readResearch: async () => {
        reads++;
      },
    },
    "@/modules/institutional-intelligence/server/mutations": {
      mutateResearch: async () => {
        throw new Error("must not run");
      },
    },
    "@/modules/institutional-intelligence/server/ingestion": {
      runIngestion: async () => {
        throw new Error("must not run");
      },
    },
  });
  const route = isolated("src/app/api/institutional-intelligence/route.ts");
  const response = await route.GET(
    new Request(
      "https://example.com/api/institutional-intelligence?export=json",
    ),
  );
  assert.equal(response.status, 401);
  assert.equal(reads, 0);
  assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.equal(
    (
      await route.POST(
        new Request("https://example.com/api/institutional-intelligence", {
          method: "POST",
          body: '{"action":"ingest"}',
        }),
      )
    ).status,
    401,
  );
});
test("SEC provider rejects non-SEC URLs and missing contact identity", async () => {
  const { SecProvider } = load(base + "server/sec.ts");
  const provider = new SecProvider({}, "Way2Investing contact@example.com");
  await assert.rejects(
    provider.request("https://attacker.example/a"),
    /rejected/,
  );
  await assert.rejects(
    new SecProvider({}, "anonymous").request("https://data.sec.gov/a"),
    /USER_AGENT/,
  );
});
test("default watchlist, hidden routes and database safety contract are explicit", () => {
  const { defaultWatchlist } = load(base + "types.ts");
  assert.equal(defaultWatchlist.length, 14);
  assert.ok(defaultWatchlist.includes("NVDA"));
  const sql = fs.readFileSync(
    path.join(__dirname, "../", base, "migrations/001_institutional.sql"),
    "utf8",
  );
  for (const text of [
    "enable row level security",
    "ii_is_owner()",
    "500 milliseconds",
    "lease_until",
    "primary key(accession,cusip,share_class,share_type,put_call)",
    "from public,anon,authenticated",
  ])
    assert.ok(sql.includes(text), text);
  for (const route of [
    "src/app/institutional-intelligence/page.tsx",
    "src/app/institutional-intelligence/stocks/[ticker]/page.tsx",
    "src/app/institutional-intelligence/institutions/[cik]/page.tsx",
    "src/app/institutional-intelligence/compare/page.tsx",
  ])
    assert.ok(
      fs
        .readFileSync(path.join(__dirname, "..", route), "utf8")
        .includes("ownerPage()"),
    );
  for (const file of [
    "src/components/dashboard/AppNav.tsx",
    "src/components/dashboard/MobileAppNav.tsx",
    "src/app/page.tsx",
  ])
    assert.ok(
      !fs
        .readFileSync(path.join(__dirname, "..", file), "utf8")
        .includes("/institutional-intelligence"),
    );
});

test("global information-only policy filters calculated and cached directional scores",async()=>{
  const {defaultSettings}=load("src/lib/content/policy.ts");
  const isolated=loader({"@/lib/content/settings":{getContentPolicy:async()=>defaultSettings}});
  const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{weights:defaultWeights,alert_threshold:25,volume_threshold:2}})})})})};
  const data=dataset();data.scoreHistory=[{ticker:"TEST",report_date:"2026-09-30",score:{total:99,label:"Strong Accumulation",weights:defaultWeights,version:"ii-evidence-1.0.0"}}];
  const view=await isolated(base+"server/view.ts").researchView(data,client);
  assert.equal(view.rows[0].score.total,null);
  assert.equal(view.rows[0].score.label,"Directional signals disabled");
  assert.deepEqual(view.rows[0].scoreHistory,[]);
  assert.doesNotMatch(JSON.stringify(view),/Strong Accumulation/);
});

test("authenticated private mutations reject cross-origin requests",async()=>{
  const auth=load(base+"server/auth.ts");let mutations=0;
  const isolated=loader({
    "@/modules/institutional-intelligence/server/auth":{...auth,requireOwner:async()=>({client:{},user:{id:"owner"}})},
    "@/modules/institutional-intelligence/server/mutations":{mutateResearch:async()=>{mutations++;}},
    "@/modules/institutional-intelligence/server/ingestion":{runIngestion:async()=>{throw new Error("must not run");}},
  });
  const response=await isolated("src/app/api/institutional-intelligence/route.ts").POST(new Request("https://example.com/api/institutional-intelligence",{method:"POST",headers:{origin:"https://attacker.example"},body:'{"action":"watch","ticker":"NVDA"}'}));
  assert.equal(response.status,403);assert.equal(mutations,0);
});
