/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness evaluates transpiled server modules. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loader } = require('./helpers/load-ts.cjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

const load = loader();
const { defaultSettings, recommendationFeatures, effectiveSettings, normalizeSettings, filterContent, hasActionableLanguage } = load('src/lib/content/policy.ts');
const allOn = Object.fromEntries(Object.keys(defaultSettings).map(key => [key, true]));
const approval = { status: 'approved', approvedAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', approvedFeatures: [...recommendationFeatures], approverIdentity: 'Compliance reviewer', jurisdiction: 'Documented jurisdiction', evidence: 'Review reference 123' };
const now = Date.parse('2026-11-14T12:00:00Z');

test('defaults disable every recommendation while retaining informational features', () => {
  assert.equal(defaultSettings.recommendationsEnabled, false);
  for (const key of recommendationFeatures) assert.equal(defaultSettings[key], false);
  assert.equal(defaultSettings.informationalAnalysisEnabled, true);
  assert.equal(defaultSettings.financialNewsEnabled, true);
});
test('master overrides settings and compliance approval is required per feature', () => {
  for (const record of [null, { ...approval, status: 'pending' }, { ...approval, expiresAt: '2025-01-01' }, { ...approval, approvedAt: '2028-01-01' }, { ...approval, jurisdiction: '' }, { ...approval, evidence: '' }]) {
    assert.equal(effectiveSettings(allOn, record, now).recommendationsEnabled, false);
  }
  assert.equal(effectiveSettings({ ...allOn, recommendationsEnabled: false }, approval, now).buySellSignalsEnabled, false);
  const subset = effectiveSettings(allOn, { ...approval, approvedFeatures: ['buySellSignalsEnabled'] }, now);
  assert.equal(subset.buySellSignalsEnabled, true);
  assert.equal(subset.stopLossRecommendationsEnabled, false);
  assert.equal(effectiveSettings(allOn, approval, now).stockRankingsEnabled, true);
});
test('malformed and missing configuration fails closed', async () => {
  for (const value of [null, [], {}, { ...allOn, recommendationsEnabled: 'true' }]) assert.deepEqual(normalizeSettings(value), defaultSettings);
  for (const rpc of [async () => ({ data: null, error: { message: 'missing migration' } }), async () => { throw new Error('offline'); }]) {
    const isolated = loader({ '@supabase/supabase-js': { createClient: () => ({ rpc }) } });
    assert.deepEqual(await isolated('src/lib/content/settings.ts').getContentPolicy(), defaultSettings);
  }
});
test('cached dashboard responses retain factual data but remove advice and actionable news', () => {
  const { mockDashboardData } = load('src/lib/mock/dashboard.ts');
  const { filterDashboardContent } = load('src/lib/content/dashboardPolicy.ts');
  const cached = { ...mockDashboardData, recommendedEntryPrice: 42, news: [{ id: 1, headline: 'Buy now', summary: null }, { id: 2, headline: 'Revenue rose 10%', summary: 'Quarterly results published', sentimentLabel: 'Strong Buy', sentimentScore: 1 }] };
  const filtered = filterDashboardContent(cached, defaultSettings);
  assert.equal(filtered.analystRatings, null);
  assert.equal('recommendedEntryPrice' in filtered, false);
  assert.deepEqual(filtered.quote, cached.quote);
  assert.deepEqual(filtered.earnings, cached.earnings);
  assert.deepEqual(filtered.ohlc, cached.ohlc);
  assert.equal(filtered.news.length, 1);
  assert.equal(filtered.news[0].sentimentLabel, null);
  assert.equal(filterDashboardContent(cached, { ...defaultSettings, financialNewsEnabled: false }).news.length, 0);
  assert.equal(cached.analystRatings.consensus, 'Buy');
});
test('queued email, alert and report envelopes are filtered using the current policy', () => {
  const queue = [{ kind: 'information', payload: 'EPS 1.24' }, ...recommendationFeatures.map(kind => ({ kind, payload: 'cached recommendation' }))];
  assert.equal(filterContent(queue, effectiveSettings(allOn, approval, now)).length, 7);
  assert.deepEqual(filterContent(queue, defaultSettings), queue.slice(0, 1));
  assert.equal(filterContent(queue, effectiveSettings(allOn, approval, Date.parse('2028-01-01'))).length, 1);
  assert.equal(filterContent([{ kind: 'information', payload: 'You should buy this stock' }], defaultSettings).length, 0);
  assert.equal(filterContent([{ kind: 'financialNews', payload: 'Revenue rose' }, { kind: 'technicalAnalysis', payload: 'SMA 20: 100' }], { ...defaultSettings, financialNewsEnabled: false, informationalAnalysisEnabled: false }).length, 0);
});
test('dashboard HTTP response omits disabled ratings and keeps factual quotes', async () => {
  const { mockDashboardData } = load('src/lib/mock/dashboard.ts');
  const isolated = loader({
    '@/lib/services': { getDashboardBySymbol: async () => mockDashboardData },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) } }) },
    '@/lib/content/settings': { getContentPolicy: async () => defaultSettings },
  });
  const response = await isolated('src/app/api/tickers/[symbol]/dashboard/route.ts').GET(new Request('http://localhost/api/tickers/AAPL/dashboard'), { params: Promise.resolve({ symbol: 'AAPL' }) });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal('analystRatings' in payload.data, false);
  assert.equal(payload.data.quote.price, mockDashboardData.quote.price);
});
test('non-admin settings operations are rejected before any database write', async () => {
  let writes = 0;
  const client = { auth: { getUser: async () => ({ data: { user: null } }) }, rpc: async () => { writes++; } };
  const isolated = loader({ '@/lib/supabase/server': { createClient: async () => client } });
  await assert.rejects(isolated('src/lib/content/settings.ts').requireContentAdmin(), /Administrator/);
  assert.equal(writes, 0);
});

function candles(count, pattern) {
  return Array.from({ length: count }, (_, i) => {
    const close = pattern === 'down' ? 300 - i * 0.7 : pattern === 'flat' ? 100 : 40 + i * 0.5 + Math.sin(i) * 4;
    return { close, open: close - 0.3, high: close + 2, low: close - 2, date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10), volume: 10000 + i * 100 };
  });
}
const analysis = load('src/lib/technical/analysis.ts');
const numericalOutput = value => JSON.parse(JSON.stringify(value, (key, item) => ['summary','detail'].includes(key) ? undefined : item));
const baselineFile = path.join(__dirname, 'fixtures/technical-baseline.json');
if (process.env.CAPTURE_TECHNICAL_BASELINE === '1') {
  // One-time mechanical fixture capture from the pre-controls implementation.
  const originalSource = execFileSync('git', ['show', '5d56942:src/components/dashboard/TechnicalAnalysisPanel.tsx'], { cwd: root, encoding: 'utf8' });
  const original = loader()('src/components/dashboard/TechnicalAnalysisPanel.tsx', originalSource + '\nexport { calculateStopLoss, calculateLimitAnalysis, sma, calculateBollinger };');
  const fixture = {};
  for (const size of [30, 60, 180, 220]) for (const pattern of ['up', 'down', 'flat']) {
    const rows = candles(size, pattern); const close = rows.at(-1).close;
    const average = original.sma(rows.map(c => c.close), 20);
    const band = original.calculateBollinger(rows.map(c => c.close), 20).upper;
    fixture[`${size}-${pattern}`] = {
      downside: numericalOutput(original.calculateStopLoss(rows, close, average)),
      upside: numericalOutput(original.calculateLimitAnalysis(rows, close, average, band)),
    };
  }
  fs.mkdirSync(path.dirname(baselineFile), { recursive: true });
  fs.writeFileSync(baselineFile, JSON.stringify(fixture, null, 2) + '\n');
}
test('downside/upside calculations match the frozen pre-change implementation', () => {
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  for (const size of [30, 60, 180, 220]) for (const pattern of ['up', 'down', 'flat']) {
    const rows = candles(size, pattern); const close = rows.at(-1).close;
    const average = analysis.sma(rows.map(c => c.close), 20);
    const band = analysis.calculateBollinger(rows.map(c => c.close), 20).upper;
    assert.deepEqual(numericalOutput(analysis.calculateStopLoss(rows, close, average)), baseline[`${size}-${pattern}`].downside);
    assert.deepEqual(numericalOutput(analysis.calculateLimitAnalysis(rows, close, average, band)), baseline[`${size}-${pattern}`].upside);
    assert.equal(analysis.calculateStopLoss(rows, close, average).summary, '');
  }
});
test('neutral technical renderer retains indicators and every method without recommended selections', () => {
  const { NeutralTechnical } = load('src/components/dashboard/NeutralAnalysis.tsx');
  const ohlc = candles(180, 'up').map(row => ({ ...row, fetchedAt: '2026-11-14T10:00:00Z' }));
  const html = renderToStaticMarkup(React.createElement(NeutralTechnical, { ohlc }));
  for (const text of ['Technical Downside Levels - Method Comparison', 'Technical Upside Levels', 'Composite Technical Level', 'SMA 20', 'RSI 14', 'MACD', 'ATR 14', 'Hypothetical', 'Reference close', 'Data fetched']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Best default|Good Default|Which stop loss|Buy Now|Sell Now|recommended target|Use the quick limit/i);
  assert.ok(html.includes('Fixed 8%'));
});
test('all public stock tab containers choose neutral renderers with recommendations disabled', async () => {
  const isolated = loader({ '@/lib/content/settings': { getContentPolicy: async () => defaultSettings } });
  const { DashboardTabs } = isolated('src/components/dashboard/DashboardTabs.tsx');
  const { mockDashboardData } = load('src/lib/mock/dashboard.ts');
  for (const activeTab of ['summary','technical','analyst','news']) {
    const tree = await DashboardTabs({ activeTab, activeTechnicalTab: 'stop-limit', data: { ...mockDashboardData, ohlc: candles(60, 'up') }, isAuthenticated: true });
    const html = renderToStaticMarkup(tree);
    assert.doesNotMatch(html, /Strong Buy|Strong Sell|Which stop loss|Best default choice|Good Default|best stock to buy/i);
  }
});
test('provider wording guard covers explicit trading instructions', () => {
  for (const text of ['You should buy', 'Strong Sell', 'Recommended target', 'Perfect entry point', 'Best stocks to buy', 'Accumulate shares']) assert.equal(hasActionableLanguage(text), true, text);
  assert.equal(hasActionableLanguage('Quarterly revenue rose 12%'), false);
});
test('migration restricts mutations and audits changes atomically; API disables delivery caching', () => {
  const sql = fs.readFileSync(path.join(root, 'src/lib/supabase/ai_content_controls.sql'), 'utf8');
  for (const text of ['enable row level security','for update','expected_revision','auth.uid()','insert into public.ai_content_audit','protect_profile_role','security definer','revoke all','Public can read analyst ratings']) assert.ok(sql.includes(text), text);
  const api = fs.readFileSync(path.join(root, 'src/app/api/tickers/[symbol]/dashboard/route.ts'), 'utf8');
  assert.ok(api.includes('private, no-store'));
});
