/* eslint-disable @typescript-eslint/no-require-imports -- Optional Playwright recovery smoke checks. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const base = process.env.CONTENT_TEST_URL || "http://localhost:3004";

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), "way2-recovery-"));
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/institutional-intelligence/login`, { waitUntil: "networkidle" });
      await page.getByRole("link", { name: "Forgot password?" }).click();
      await page.getByRole("heading", { name: "Reset your password" }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.screenshot({ path: path.join(screenshots, `forgot-${width}.png`), fullPage: true });
      // Deliberately NOT the configured owner: exercises the generic response and sends no email.
      await page.getByRole("textbox", { name: "Email address" }).fill("nobody@example.invalid");
      await page.getByRole("button", { name: "Send reset email" }).click();
      await page.getByRole("status").waitFor();
      assert.match(await page.getByRole("status").innerText(), /If this is the configured owner account/);
      const reset = await page.request.get(`${base}/institutional-intelligence/reset-password`, { maxRedirects: 0 });
      assert.equal(reset.status(), 307);
      assert.match(reset.headers().location, /forgot-password\?error=session$/);
      const callback = await page.request.get(`${base}/institutional-intelligence/auth/callback?error=access_denied`, { maxRedirects: 0 });
      assert.equal(callback.status(), 307);
      assert.match(callback.headers().location, /forgot-password\?error=link$/);
      assert.equal(callback.headers()["referrer-policy"], "no-referrer");
      assert.match(callback.headers()["cache-control"], /no-store/);
    }
    assert.deepEqual(errors, []);
    console.log(`Recovery browser checks passed; no owner email was sent. Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
