import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, validSession, passwordMatches, isPasswordConfigured, SESSION_SECONDS } from "../src/lib/password-session.ts";

test("sessions require a password and signing secret, resist tampering, expire, and invalidate on rotation", () => {
  const oldPassword = process.env.SOCIAL_STUDIO_PASSWORD;
  const oldSecret = process.env.SOCIAL_STUDIO_SESSION_SECRET;
  try {
    delete process.env.SOCIAL_STUDIO_PASSWORD;
    delete process.env.SOCIAL_STUDIO_SESSION_SECRET;
    assert.equal(isPasswordConfigured(), false);
    assert.equal(validSession("anything"), false);
    assert.equal(passwordMatches("1234"), false);
    assert.throws(() => createSession());

    process.env.SOCIAL_STUDIO_PASSWORD = "test-password";
    process.env.SOCIAL_STUDIO_SESSION_SECRET = "short";
    assert.equal(isPasswordConfigured(), false);
    process.env.SOCIAL_STUDIO_SESSION_SECRET = "a".repeat(64);
    assert.equal(passwordMatches("test-password"), true);
    assert.equal(passwordMatches("incorrect"), false);
    assert.equal(passwordMatches("x".repeat(1025)), false);
    const now = 1_800_000_000_000;
    const token = createSession(now);
    assert.equal(validSession(token, now), true);
    assert.equal(validSession(undefined, now), false);
    assert.equal(validSession("authenticated", now), false);
    assert.equal(validSession(`${token}extra`, now), false);
    assert.equal(validSession(`${token.slice(0, -1)}${token.endsWith("0") ? "1" : "0"}`, now), false);
    assert.equal(validSession(token.replace(/^\d+/, "9999999999"), now), false);
    assert.equal(validSession(token, now + SESSION_SECONDS * 1000), false);
    process.env.SOCIAL_STUDIO_PASSWORD = "replacement-password";
    assert.equal(validSession(token, now), false);
    process.env.SOCIAL_STUDIO_PASSWORD = "test-password";
    process.env.SOCIAL_STUDIO_SESSION_SECRET = "b".repeat(64);
    assert.equal(validSession(token, now), false);
  } finally {
    if (oldPassword === undefined) delete process.env.SOCIAL_STUDIO_PASSWORD;
    else process.env.SOCIAL_STUDIO_PASSWORD = oldPassword;
    if (oldSecret === undefined) delete process.env.SOCIAL_STUDIO_SESSION_SECRET;
    else process.env.SOCIAL_STUDIO_SESSION_SECRET = oldSecret;
  }
});
