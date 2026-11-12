import assert from "node:assert/strict";
import test from "node:test";
import { getSiteOrigin } from "../src/lib/auth/siteOrigin.ts";

test("configured public URL takes precedence over localhost", () => {
  assert.equal(getSiteOrigin("https://way2investing.com/", "http://localhost:3000"), "https://way2investing.com");
});

test("uses the actual deployment origin when no canonical URL is configured", () => {
  assert.equal(getSiteOrigin(undefined, "https://preview.vercel.app"), "https://preview.vercel.app");
  assert.equal(getSiteOrigin(" ", "http://localhost:3001"), "http://localhost:3001");
});

test("never silently defaults to localhost without a request origin", () => {
  assert.throws(() => getSiteOrigin(undefined, null));
});

test("rejects non-website URLs and URLs carrying credentials or extra paths", () => {
  for (const value of ["javascript:alert(1)", "//example.com", "https://user:password@example.com", "https://example.com/path", "https://example.com/?next=bad", "https://example.com/#token"]) {
    assert.throws(() => getSiteOrigin(value, "http://localhost:3000"));
  }
});
