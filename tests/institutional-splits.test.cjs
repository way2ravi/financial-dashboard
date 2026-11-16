/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loader } = require("./helpers/load-ts.cjs");
const base = "src/modules/institutional-intelligence/server/";
const { splitCheckInput, checkMassiveSplits } = loader()(base + "massive.ts");
const input = { ticker: "GOOGL", from: "2026-03-31", to: "2026-06-30" };
const now = new Date("2026-11-16T12:00:00Z");
const event = {
  ticker: "GOOGL",
  execution_date: "2026-04-10",
  adjustment_type: "forward_split",
  split_from: 1,
  split_to: 2,
};
async function withProvider(body, run, status = 200) {
  const previousFetch = global.fetch,
    previousKey = process.env.MASSIVE_API_KEY;
  process.env.MASSIVE_API_KEY = "synthetic-test-secret";
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify(body), { status });
  };
  try {
    await run(calls);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.MASSIVE_API_KEY;
    else process.env.MASSIVE_API_KEY = previousKey;
  }
}
test("split input validates ticker, date order, real dates and free-plan history", () => {
  assert.deepEqual(
    splitCheckInput({ ...input, ticker: " googl " }, now),
    input,
  );
  for (const body of [
    { ...input, ticker: "https://evil.example" },
    { ...input, from: "2023-01-01" },
    { ...input, from: input.to },
    { ...input, to: "2099-01-01" },
    { ...input, from: "2026-02-30" },
    null,
  ])
    assert.throws(() => splitCheckInput(body, now));
});
test("empty provider results remain a read-only split observation with safe provenance", async () => {
  await withProvider({ status: "OK", results: [] }, async (calls) => {
    const result = await checkMassiveSplits(input);
    assert.deepEqual(result.events, []);
    assert.equal(result.paginationPending, false);
    assert.equal(calls.length, 1);
    const { url, options } = calls[0];
    assert.equal(new URL(url).hostname, "api.massive.com");
    assert.equal(new URL(url).pathname, "/stocks/v1/splits");
    assert.equal(
      new URL(url).searchParams.get("execution_date.gt"),
      input.from,
    );
    assert.equal(new URL(url).searchParams.get("execution_date.lte"), input.to);
    assert.equal(options.headers.Authorization, "Bearer synthetic-test-secret");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.doesNotMatch(
      JSON.stringify(result),
      /synthetic-test-secret|apiKey|verified_through/,
    );
  });
});
test("forward, reverse and stock-dividend ratios preserve new-shares divided by old-shares", async () => {
  await withProvider(
    {
      status: "OK",
      results: [
        event,
        {
          ...event,
          adjustment_type: "reverse_split",
          split_from: 10,
          split_to: 1,
        },
        { ...event, adjustment_type: "stock_dividend", split_to: 1.05 },
      ],
    },
    async () => {
      assert.deepEqual(
        (await checkMassiveSplits(input)).events.map((row) => row.ratio),
        [2, 0.1, 1.05],
      );
    },
  );
});
test("pagination is flagged and never follows a supplied URL or exposes its credentials", async () => {
  await withProvider(
    {
      status: "OK",
      results: [],
      next_url: "https://evil.example/?apiKey=synthetic-test-secret",
    },
    async (calls) => {
      const result = await checkMassiveSplits(input);
      assert.equal(result.paginationPending, true);
      assert.equal(calls.length, 1);
      assert.doesNotMatch(JSON.stringify(result), /evil|synthetic-test-secret/);
    },
  );
});
test("provider errors are sanitized, never interpreted as no split events", async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    await withProvider(
      { error: "synthetic-test-secret" },
      async () => {
        await assert.rejects(
          checkMassiveSplits(input),
          (error) => !error.message.includes("synthetic-test-secret"),
        );
      },
      status,
    );
  }
  for (const body of [
    { status: "ERROR", results: [] },
    { status: "OK" },
    { status: "OK", results: {} },
  ])
    await withProvider(body, async () => {
      await assert.rejects(checkMassiveSplits(input));
    });
});
test("malformed or mismatched split records fail closed", async () => {
  for (const changes of [
    { ticker: "MSFT" },
    { execution_date: "2026-02-30" },
    { execution_date: input.from },
    { split_from: 0 },
    { split_to: -1 },
    { split_to: "2" },
    { adjustment_type: "unknown" },
  ])
    await withProvider(
      { status: "OK", results: [{ ...event, ...changes }] },
      async () => {
        await assert.rejects(checkMassiveSplits(input), /invalid split event/);
      },
    );
});
test("unreachable, malformed JSON and oversized responses do not leak upstream errors", async () => {
  const previousFetch = global.fetch,
    previousKey = process.env.MASSIVE_API_KEY;
  process.env.MASSIVE_API_KEY = "synthetic-test-secret";
  try {
    for (const response of [
      () => {
        throw new Error("synthetic-test-secret");
      },
      () => new Response("not JSON"),
      () => new Response("x".repeat(1_000_001)),
    ]) {
      global.fetch = async () => response();
      await assert.rejects(
        checkMassiveSplits(input),
        (error) => !error.message.includes("synthetic-test-secret"),
      );
    }
    delete process.env.MASSIVE_API_KEY;
    await assert.rejects(checkMassiveSplits(input), /not configured/);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.MASSIVE_API_KEY;
    else process.env.MASSIVE_API_KEY = previousKey;
  }
});
test("split API enforces owner and origin checks before provider calls", async () => {
  const auth = loader()(base + "auth.ts");
  for (const scenario of ["anonymous", "non-owner", "cross-origin", "owner"]) {
    let calls = 0;
    const load = loader({
      "@/modules/institutional-intelligence/server/auth": {
        ...auth,
        requireOwner: async () => {
          if (scenario === "anonymous") throw new auth.ResearchAccessError(401);
          if (scenario === "non-owner") throw new auth.ResearchAccessError(403);
        },
      },
      "@/modules/institutional-intelligence/server/massive": {
        splitCheckInput: () => input,
        checkMassiveSplits: async () => {
          calls++;
          return { ...input, events: [] };
        },
      },
    });
    const route = load(
      "src/app/api/institutional-intelligence/splits/route.ts",
    );
    const request = () =>
      new Request("https://example.com/api/institutional-intelligence/splits", {
        method: "POST",
        headers: {
          origin:
            scenario === "cross-origin"
              ? "https://evil.example"
              : "https://example.com",
        },
        body: JSON.stringify(input),
      });
    const response = await route.POST(request());
    assert.equal(
      response.status,
      scenario === "owner" ? 200 : scenario === "anonymous" ? 401 : 403,
    );
    assert.equal(calls, scenario === "owner" ? 1 : 0);
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    if (scenario === "owner") {
      assert.equal((await route.POST(request())).status, 429);
      assert.equal(calls, 1);
    }
  }
});
