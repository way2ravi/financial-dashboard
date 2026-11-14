/* eslint-disable @typescript-eslint/no-require-imports -- Optional Node/Playwright smoke runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./helpers/load-ts.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.CONTENT_TEST_URL || 'http://localhost:3002';

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'way2investing-policy-'));
  try {
    const page = await browser.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    const home = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(home.status(), 200);
    const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(items => items.map(item => item.href));
    const rootClass = await page.locator('html').getAttribute('class');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/', '/stock?symbol=AAPL&tab=chart', '/screener', '/earnings', '/market', '/dashboard', '/wealth', '/portfolio', '/watchlist', '/risk-disclosure', '/terms']) {
        const response = await page.goto(base + route, { waitUntil: 'networkidle' });
        assert.ok(response.status() < 400, `${route}: ${response.status()}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Page overflow: ${route} / ${width}`);
        const text = await page.locator('body').innerText();
        assert.doesNotMatch(text, /Strong Buy|Strong Sell|Which stop loss is good|Best default choice|Good Default|You should buy|You should sell|Use this stop.loss/i, route);
      }
      const response = await page.goto(base + '/admin/settings');
      assert.equal(response.status(), 404, 'Unauthenticated administrator page must be denied');
    }
    const api = await page.request.get(base + '/api/tickers/AAPL/dashboard');
    assert.equal(api.status(), 401, 'Unauthenticated dashboard API must be denied');

    // Signed-in UI layouts use deterministic test fixtures, never real account data.
    const load = loader();
    const { defaultSettings } = load('src/lib/content/policy.ts');
    const { NeutralTechnical } = load('src/components/dashboard/NeutralAnalysis.tsx');
    const ohlc = Array.from({ length: 180 }, (_, i) => ({ date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10), close: 100 + Math.sin(i) * 5 + i / 10, open: 100 + i / 10, high: 108 + i / 10, low: 94 + i / 10, volume: 10000, fetchedAt: '2026-11-14T10:00:00Z' }));
    const row = { settings: defaultSettings, approval: null, revision: 1 };
    const client = { from: () => {
      const query = { select: () => query, eq: () => query, order: () => query, limit: async () => ({ data: [] }), maybeSingle: async () => ({ data: row, error: null }) };
      return query;
    } };
    const adminLoad = loader({
      '@/lib/content/settings': { requireContentAdmin: async () => client, getContentPolicy: async () => defaultSettings },
      './actions': { saveContentSettings: '/test-only' },
      'next/navigation': { notFound: () => { throw new Error('unexpected denial'); } },
    });
    const adminTree = await adminLoad('src/app/admin/settings/page.tsx').default({ searchParams: Promise.resolve({}) });
    const variants = {
      technical: renderToStaticMarkup(React.createElement('main', { className: 'mx-auto max-w-7xl px-4' }, React.createElement(NeutralTechnical, { ohlc }))),
      admin: renderToStaticMarkup(adminTree),
    };
    for (const [name, markup] of Object.entries(variants)) for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.setContent(`<!doctype html><html class="${rootClass}"><head><base href="${base}">${styles.map(href => `<link rel="stylesheet" href="${href}">`).join('')}</head><body class="app-bg">${markup}</body></html>`);
      await page.waitForLoadState('networkidle');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} layout overflow: ${width}`);
      await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
      if (name === 'admin') {
        assert.equal(await page.getByRole('switch').count(), 9);
        assert.equal(await page.getByRole('switch', { checked: true }).count(), 2);
        const master = page.getByRole('switch', { name: 'Enable AI Investment Recommendations', exact: true });
        await master.check(); assert.equal(await master.isChecked(), true);
        await master.uncheck(); assert.equal(await master.isChecked(), false);
      }
    }
    assert.deepEqual(failures, []);
    console.log(`Browser checks passed at desktop/mobile widths. Fixture screenshots: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
