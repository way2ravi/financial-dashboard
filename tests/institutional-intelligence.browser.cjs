/* eslint-disable @typescript-eslint/no-require-imports -- Optional isolated browser test. */
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { build } = require("esbuild");
const { loader } = require("./helpers/load-ts.cjs");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE_PATH || "playwright",
);
const root = path.resolve(__dirname, "..");
const base = process.env.CONTENT_TEST_URL || "http://localhost:3004";
const load = loader();
const { defaultWatchlist } = load(
  "src/modules/institutional-intelligence/types.ts",
);
const { defaultWeights } = load(
  "src/modules/institutional-intelligence/engine/score.ts",
);
const fixture = {
  rows: defaultWatchlist.map((ticker) => ({
    security: { ticker, name: null, sector: null, market_cap: null },
    watched: true,
    history: [],
    snapshot: null,
    technical: null,
    score: {
      total: null,
      label: "Directional signals disabled",
      confidence: "Unavailable",
      components: {},
      missing: ["ownership", "breadth", "technical"],
      weights: defaultWeights,
      version: "ii-evidence-1.0.0",
    },
    latestPrice: null,
    daily: null,
    weekly: null,
    volume: null,
    refreshedAt: null,
    marketSource: null,
    prices: [],
    scoreHistory: [],
  })),
  institutions: [
    { cik: "0001067983", name: "Synthetic test manager", enabled: true },
  ],
  filings: [],
  alerts: [],
  jobs: [],
  scoreHistory: [],
  setupError: null,
  configuration: {
    secConfigured: true,
    marketBars: 0,
    mappings: 0,
    weights: defaultWeights,
    alertThreshold: 25,
    volumeThreshold: 2,
  },
  mode: "Information Only Mode",
  canShowSignals: false,
  canRank: false,
};
(async () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "way2-institutional-"));
  const compiled = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {IntelligenceDashboard} from '@/modules/institutional-intelligence/ui/Dashboard'; import styles from '@/modules/institutional-intelligence/ui/terminal.module.css'; createRoot(document.getElementById('app')).render(<div className={styles.terminal}><IntelligenceDashboard initial={${JSON.stringify(fixture)}} focusTicker={window.TEST_FOCUS_TICKER}/></div>);`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    write: false,
    outdir: output,
    format: "iife",
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "private-fixture-stubs",
        setup(b) {
          b.onResolve({ filter: /^next\/(link|image)$/ }, (args) => ({
            path: args.path,
            namespace: "fixture",
          }));
          b.onResolve(
            { filter: /^@\/app\/institutional-intelligence\/login\/actions$/ },
            () => ({ path: "actions", namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            contents:
              args.path === "actions"
                ? "export async function researchSignOut(){}"
                : args.path === "next/link"
                  ? "import React from 'react';export default function Link({href,children,...props}){return React.createElement('a',{href,...props},children)}"
                  : "import React from 'react';export default function Image({src,alt,...props}){return React.createElement('img',{src,alt,...props})}",
            loader: "js",
            resolveDir: root,
          }));
        },
      },
    ],
  });
  const js = compiled.outputFiles.find((f) => f.path.endsWith(".js")).text,
    css = compiled.outputFiles.find((f) => f.path.endsWith(".css")).text;
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const route of [
      "/institutional-intelligence",
      "/institutional-intelligence/stocks/NVDA",
      "/institutional-intelligence/institutions/0001913494",
      "/institutional-intelligence/compare",
    ]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      assert.ok(
        page.url().includes("/institutional-intelligence/login"),
        route,
      );
    }
    const response = await page.goto(
      base + "/institutional-intelligence/login",
      { waitUntil: "networkidle" },
    );
    assert.equal(response.status(), 200);
    assert.match(response.headers()["x-robots-tag"], /noindex/);
    assert.match(
      await page.locator('meta[name="robots"]').getAttribute("content"),
      /noindex/,
    );
    assert.equal(
      (
        await page.request.get(
          base + "/api/institutional-intelligence?export=json",
        )
      ).status(),
      401,
    );
    assert.equal(
      (
        await page.request.get(base + "/api/institutional-intelligence/jobs")
      ).status(),
      401,
    );
    const robots = await page.request.get(base + "/robots.txt");
    assert.match(await robots.text(), /Disallow: \/institutional-intelligence/);
    await page.screenshot({
      path: path.join(output, "login.png"),
      fullPage: true,
    });
    await page.route("**/api/institutional-intelligence", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        if (body.action === "backfill13F") {
          assert.equal(body.cik, "0001067983");
          assert.equal(body.reportDate, "2026-03-31");
          assert.equal(body.archive, "");
        }
        if (body.action === "watch" || body.action === "unwatch")
          fixture.rows.find((r) => r.security.ticker === body.ticker).watched =
            body.action === "watch";
        await route.fulfill({
          json: { ok: true, status: "completed", processed: 0 },
        });
      } else await route.fulfill({ json: fixture });
    });
    let splitScenario = "empty";
    await page.route(
      "**/api/institutional-intelligence/splits",
      async (route) => {
        const body = route.request().postDataJSON();
        assert.deepEqual(body, {
          ticker: "GOOGL",
          from: "2026-03-31",
          to: "2026-06-30",
        });
        await route.fulfill(
          splitScenario === "error"
            ? {
                status: 400,
                json: {
                  error:
                    "Massive rate limit reached. Wait a minute before retrying",
                },
              }
            : {
                json: {
                  ...body,
                  checkedAt: "2026-11-16T12:00:00Z",
                  sourceUrl:
                    "https://api.massive.com/stocks/v1/splits?ticker=GOOGL",
                  paginationPending: splitScenario === "partial",
                  events:
                    splitScenario === "event"
                      ? [
                          {
                            date: "2026-04-10",
                            kind: "reverse_split",
                            oldShares: 10,
                            newShares: 1,
                            ratio: 0.1,
                          },
                        ]
                      : [],
                },
              },
        );
      },
    );
    await page.route("**/icon.png", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/png",
        body: fs.readFileSync(path.join(root, "src/app/icon.png")),
      }),
    );
    async function render(width, focus) {
      await page.setViewportSize({ width, height: 1000 });
      await page.setContent(
        `<html><head><base href="${base}"><style>body{margin:0}${css}</style></head><body><div id="app"></div><script>window.TEST_FOCUS_TICKER=${JSON.stringify(focus ?? null)}</script></body></html>`,
      );
      await page.addScriptTag({ content: js });
      await page
        .getByRole("heading", {
          name: focus
            ? `${focus} / Stock Intelligence`
            : "Institutional Intelligence",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
        `Overflow at ${width}`,
      );
    }
    for (const width of [1440, 768, 390]) {
      await render(width);
      await page.screenshot({
        path: path.join(output, `overview-${width}.png`),
        fullPage: true,
      });
      await page
        .getByRole("textbox", { name: "Stock", exact: true })
        .fill("NVDA");
      assert.equal(await page.locator("tbody tr").count(), 1);
      await page.getByRole("textbox", { name: "Stock", exact: true }).fill("");
      await page.getByRole("button", { name: "STOCK", exact: true }).click();
      assert.match(await page.locator("tbody tr").first().innerText(), /TSLA/);
      await page.getByRole("button", { name: "Compare", exact: true }).click();
      for (const ticker of defaultWatchlist.slice(0, 6))
        await page
          .getByRole("checkbox", { name: `Compare ${ticker}`, exact: true })
          .check()
          .catch(async (error) => {
            if (ticker !== defaultWatchlist[5]) throw error;
          });
      assert.equal(
        await page.getByRole("checkbox", { checked: true }).count(),
        5,
      );
      assert.match(await page.getByRole("status").innerText(), /five stocks/);
      await page
        .getByRole("button", { name: "Configuration", exact: true })
        .click();
      await page.getByRole("heading", { name: "Provider status" }).waitFor();
      const splitForm = page
        .locator("form")
        .filter({
          has: page.getByRole("heading", {
            name: "Massive split-history check",
          }),
        });
      await splitForm.getByLabel("Ticker", { exact: true }).fill("GOOGL");
      await splitForm
        .getByLabel("After date", { exact: true })
        .fill("2026-03-31");
      await splitForm
        .getByLabel("Through date", { exact: true })
        .fill("2026-06-30");
      for (const scenario of ["event", "partial", "error", "empty"]) {
        splitScenario = scenario;
        await splitForm
          .getByRole("button", { name: "Check split history", exact: true })
          .click();
        if (scenario === "error") await splitForm.getByRole("alert").waitFor();
        else {
          const status = splitForm.getByRole("status");
          await status.waitFor();
          assert.match(
            await status.innerText(),
            scenario === "event"
              ? /1 split events/
              : scenario === "partial"
                ? /Partial results/
                : /No split events returned/,
          );
          assert.match(
            await splitForm.innerText(),
            /Corporate-action coverage: not verified/,
          );
        }
      }
      await page
        .getByRole("combobox", { name: "Reporting manager", exact: true })
        .selectOption("0001067983");
      await page
        .getByLabel("Quarter-end date", { exact: true })
        .fill("2026-03-31");
      await page
        .getByRole("button", { name: "Backfill quarter", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Ingestion completed" })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      );
      await page.screenshot({
        path: path.join(output, `configuration-${width}.png`),
        fullPage: true,
      });
      await render(width, "NVDA");
      await page
        .getByRole("heading", { name: "Quantitative technical inference" })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      );
      await page.screenshot({
        path: path.join(output, `stock-${width}.png`),
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      `Private route and responsive interactive fixture checks passed. Screenshots: ${output}`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
