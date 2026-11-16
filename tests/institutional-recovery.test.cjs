/* eslint-disable @typescript-eslint/no-require-imports -- Node server-action test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loader } = require("./helpers/load-ts.cjs");
const path = "src/modules/institutional-intelligence/auth/recovery.ts";
const actionPath =
  "src/app/institutional-intelligence/forgot-password/actions.ts";
const updatePath =
  "src/app/institutional-intelligence/reset-password/actions.ts";
const callbackPath =
  "src/app/institutional-intelligence/auth/callback/route.ts";
const origin = "http://localhost:3004";
const { recoveryOrigin, passwordIsValid } = loader()(path);

function redirect(location) {
  const error = new Error("Redirect");
  error.location = location;
  throw error;
}
const isRedirect = (location) => (error) => error.location === location;
async function configured(run) {
  const oldOrigin = process.env.INSTITUTIONAL_AUTH_ORIGIN;
  const oldOwner = process.env.INSTITUTIONAL_OWNER_EMAIL;
  process.env.INSTITUTIONAL_AUTH_ORIGIN = origin;
  process.env.INSTITUTIONAL_OWNER_EMAIL = "owner@example.com";
  try {
    await run();
  } finally {
    if (oldOrigin === undefined) delete process.env.INSTITUTIONAL_AUTH_ORIGIN;
    else process.env.INSTITUTIONAL_AUTH_ORIGIN = oldOrigin;
    if (oldOwner === undefined) delete process.env.INSTITUTIONAL_OWNER_EMAIL;
    else process.env.INSTITUTIONAL_OWNER_EMAIL = oldOwner;
  }
}
function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}
function harness({
  owner = true,
  exchangeError = null,
  updateError = null,
  sendError = null,
  signOutError = null,
} = {}) {
  const calls = {
    exchanges: [],
    verifications: [],
    updates: [],
    sends: [],
    signOuts: [],
  };
  const client = {
    auth: {
      exchangeCodeForSession: async (code) => {
        calls.exchanges.push(code);
        return { error: exchangeError };
      },
      verifyOtp: async (input) => {
        calls.verifications.push(input);
        return { error: exchangeError };
      },
      updateUser: async (input) => {
        calls.updates.push(input);
        return { error: updateError };
      },
      resetPasswordForEmail: async (email, options) => {
        calls.sends.push({ email, options });
        return { error: sendError };
      },
      signOut: async (options) => {
        calls.signOuts.push(options);
        return { error: options?.scope === "global" ? signOutError : null };
      },
    },
  };
  const load = loader({
    "next/navigation": { redirect },
    "@/lib/supabase/server": { createClient: async () => client },
    "@/modules/institutional-intelligence/server/auth": {
      requireOwner: async () => {
        if (!owner) throw new Error("Denied");
        return { client, user: { id: "owner" } };
      },
    },
  });
  return { calls, load };
}

test("recovery origin is explicit, trusted and never a credential-bearing/path URL", () => {
  assert.equal(recoveryOrigin(origin), origin);
  assert.equal(
    recoveryOrigin("https://way2investing.com"),
    "https://way2investing.com",
  );
  for (const value of [
    undefined,
    "http://evil.example",
    "https://user:pass@example.com",
    "https://example.com/reset",
    "https://example.com?next=evil",
    "https://example.com/#fragment",
    "javascript:alert(1)",
  ])
    assert.throws(() => recoveryOrigin(value));
});
test("password validation requires matching 12-1024 character values", () => {
  assert.equal(
    passwordIsValid("sample-test-password", "sample-test-password"),
    true,
  );
  assert.equal(passwordIsValid("short", "short"), false);
  assert.equal(
    passwordIsValid("sample-test-password", "different-password"),
    false,
  );
  assert.equal(passwordIsValid("x".repeat(1025), "x".repeat(1025)), false);
});
test("owner recovery request uses the configured recipient and fixed callback", async () =>
  configured(async () => {
    const { calls, load } = harness();
    await assert.rejects(
      load(actionPath).requestResearchPasswordReset(
        form({ email: " OWNER@example.com " }),
      ),
      isRedirect("/institutional-intelligence/forgot-password?sent=1"),
    );
    assert.deepEqual(calls.sends, [
      {
        email: "owner@example.com",
        options: {
          redirectTo: `${origin}/institutional-intelligence/auth/callback`,
        },
      },
    ]);
  }));
test("non-owner requests have generic responses and send no email", async () =>
  configured(async () => {
    const { calls, load } = harness();
    await assert.rejects(
      load(actionPath).requestResearchPasswordReset(
        form({ email: "other@example.com" }),
      ),
      isRedirect("/institutional-intelligence/forgot-password?sent=1"),
    );
    assert.equal(calls.sends.length, 0);
  }));
test("send failures are handled without exposing provider response details", async () =>
  configured(async () => {
    const { load } = harness({
      sendError: { message: "provider-private-detail" },
    });
    await assert.rejects(
      load(actionPath).requestResearchPasswordReset(
        form({ email: "owner@example.com" }),
      ),
      isRedirect("/institutional-intelligence/forgot-password?error=send"),
    );
  }));
test("valid PKCE exchange and owner grant reach the fixed reset form without open redirects", async () =>
  configured(async () => {
    const { calls, load } = harness();
    const response = await load(callbackPath).GET(
      new Request(
        `${origin}/institutional-intelligence/auth/callback?code=test-code&next=https://evil.example`,
      ),
    );
    assert.equal(
      response.headers.get("location"),
      `${origin}/institutional-intelligence/reset-password`,
    );
    assert.deepEqual(calls.exchanges, ["test-code"]);
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.match(response.headers.get("X-Robots-Tag"), /noindex/);
  }));
test("callback rejects failed exchanges, provider errors and mismatched origins", async () =>
  configured(async () => {
    const failed = harness({ exchangeError: { message: "expired" } });
    const response = await failed
      .load(callbackPath)
      .GET(
        new Request(
          `${origin}/institutional-intelligence/auth/callback?code=expired`,
        ),
      );
    assert.match(
      response.headers.get("location"),
      /forgot-password\?error=link$/,
    );
    for (const url of [
      `${origin}/institutional-intelligence/auth/callback?error=access_denied&code=ignored`,
      "https://evil.example/institutional-intelligence/auth/callback?code=ignored",
    ]) {
      const h = harness();
      await h.load(callbackPath).GET(new Request(url));
      assert.equal(h.calls.exchanges.length, 0);
    }
  }));
test("token hashes are accepted only for recovery, never signup confirmations", async () =>
  configured(async () => {
    const h = harness();
    const response = await h
      .load(callbackPath)
      .GET(
        new Request(
          `${origin}/institutional-intelligence/auth/callback?token_hash=test-hash&type=recovery`,
        ),
      );
    assert.match(response.headers.get("location"), /reset-password$/);
    assert.deepEqual(h.calls.verifications, [
      { token_hash: "test-hash", type: "recovery" },
    ]);
    const other = harness();
    await other
      .load(callbackPath)
      .GET(
        new Request(
          `${origin}/institutional-intelligence/auth/callback?token_hash=test-hash&type=signup`,
        ),
      );
    assert.equal(other.calls.verifications.length, 0);
  }));
test("a valid recovery session for a non-owner cannot enter private password reset", async () =>
  configured(async () => {
    const h = harness({ owner: false });
    const response = await h
      .load(callbackPath)
      .GET(
        new Request(
          `${origin}/institutional-intelligence/auth/callback?code=other-user`,
        ),
      );
    assert.match(
      response.headers.get("location"),
      /forgot-password\?error=link$/,
    );
    assert.equal(h.calls.signOuts.length, 1);
  }));
test("password updates independently enforce owner access and matching inputs", async () => {
  const denied = harness({ owner: false });
  await assert.rejects(
    denied
      .load(updatePath)
      .updateResearchPassword(
        form({
          password: "sample-test-password",
          confirmation: "sample-test-password",
        }),
      ),
    isRedirect("/institutional-intelligence/forgot-password?error=session"),
  );
  assert.equal(denied.calls.updates.length, 0);
  const invalid = harness();
  await assert.rejects(
    invalid
      .load(updatePath)
      .updateResearchPassword(
        form({ password: "short", confirmation: "short" }),
      ),
    isRedirect("/institutional-intelligence/reset-password?error=validation"),
  );
  assert.equal(invalid.calls.updates.length, 0);
});
test("successful password updates request global sign-out and return to sign-in", async () => {
  const h = harness();
  await assert.rejects(
    h
      .load(updatePath)
      .updateResearchPassword(
        form({
          password: "sample-test-password",
          confirmation: "sample-test-password",
        }),
      ),
    isRedirect("/institutional-intelligence/login?notice=password-updated"),
  );
  assert.deepEqual(h.calls.updates, [{ password: "sample-test-password" }]);
  assert.deepEqual(h.calls.signOuts, [{ scope: "global" }]);
});
test("update and session-revocation errors produce safe, distinct outcomes", async () => {
  const failed = harness({ updateError: { message: "rejected" } });
  await assert.rejects(
    failed
      .load(updatePath)
      .updateResearchPassword(
        form({
          password: "sample-test-password",
          confirmation: "sample-test-password",
        }),
      ),
    isRedirect("/institutional-intelligence/reset-password?error=update"),
  );
  assert.equal(failed.calls.signOuts.length, 0);
  const revoke = harness({ signOutError: { message: "unavailable" } });
  await assert.rejects(
    revoke
      .load(updatePath)
      .updateResearchPassword(
        form({
          password: "sample-test-password",
          confirmation: "sample-test-password",
        }),
      ),
    isRedirect(
      "/institutional-intelligence/login?notice=password-updated-sessions",
    ),
  );
  assert.deepEqual(revoke.calls.signOuts, [
    { scope: "global" },
    { scope: "local" },
  ]);
});
