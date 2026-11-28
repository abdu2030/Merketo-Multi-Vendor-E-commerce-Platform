// Use the compiled production middleware with two independent HTTP servers and Redis clients.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const express = require("express");

const { RedisConnectionFactory } = require("../apps/api/dist/modules/jobs/redis-connection.factory");
const { SharedRateCounter } = require("../apps/api/dist/common/middleware/shared-rate-counter");
const { createRateLimitMiddleware } = require("../apps/api/dist/common/middleware/rate-limit.middleware");

test("two HTTP instances share a limit, expire together, and fail closed on Redis disconnect", async (t) => {
  const values = { REDIS_URL: "redis://127.0.0.1:16387", QUEUE_PREFIX: randomUUID() };
  const config = { get: (key) => values[key] };
  const counter = [];
  const urls = [];
  for (let i = 0; i < 2; i++) {
    const shared = new SharedRateCounter(new RedisConnectionFactory(config));
    counter.push(shared);
    t.after(() => shared.onModuleDestroy());
    const app = express();
    app.use(createRateLimitMiddleware({ windowMs: 1500, max: 2, shared }));
    app.get("/", (_req, res) => res.send("ok"));
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    t.after(() => new Promise(resolve => server.close(resolve)));
    urls.push("http://127.0.0.1:" + server.address().port);
  }
  // Producer connections can briefly reject commands while establishing the socket.
  await t.test("shared count", async () => {
    for (const c of counter) {
      for (let n = 0; ; n++) {
        try { await c.increment("readiness", 1000); break; }
        catch (error) { if (n >= 50) throw error; await new Promise(r => setTimeout(r, 50)); }
      }
    }
    assert.equal((await fetch(urls[0])).headers.get("x-ratelimit-remaining"), "1");
    assert.equal((await fetch(urls[1])).headers.get("x-ratelimit-remaining"), "0");
    assert.equal((await fetch(urls[0])).status, 429);
  });
  await new Promise(r => setTimeout(r, 1550));
  assert.equal((await fetch(urls[1])).status, 200);
  counter[0].onModuleDestroy();
  assert.equal((await fetch(urls[0])).status, 503);
});
