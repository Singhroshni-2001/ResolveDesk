import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (existsSync(".env.metrics.local")) process.loadEnvFile(".env.metrics.local");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ...["CUSTOMER_A", "CUSTOMER_B"].flatMap((r) => [
    `EVAL_${r}_EMAIL`,
    `EVAL_${r}_PASSWORD`,
  ]),
];
const checks = [];
const sessions = {};
const fixtures = {};
let currentCheck = "configuration";
let failureCode;
async function check(name, fn) {
  currentCheck = name;
  await fn();
  checks.push({ name, status: "PASS" });
  console.log("PASS: " + name);
}
const timeoutFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(20000),
  });
const base = process.env.EVAL_APP_URL || "http://localhost:3000";
async function api(actor, path, method = "GET", body) {
  const r = await timeoutFetch(base.replace(/\/$/, "") + "/api/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + sessions[actor].token,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(65000),
  });
  failureCode = { httpStatus: r.status };
  return { status: r.status, data: await r.json() };
}
try {
  if (
    required.some(
      (k) => !process.env[k] || /YOUR_|REPLACE_/.test(process.env[k]),
    )
  ) {
    checks.push({
      name: currentCheck,
      status: "PENDING",
      reason:
        "Two confirmed customer credentials required only in ignored .env.metrics.local; nothing changed",
    });
  } else {
    const target = new URL(base);
    assert.ok(
      (target.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(target.hostname)) ||
        (target.protocol === "https:" &&
          target.hostname === "resolvedesk-mocha.vercel.app"),
      "Use localhost or the explicitly approved production deployment",
    );
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.ok(
      key.startsWith("sb_publishable_") ||
        (key.startsWith("eyJ") &&
          JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role ===
            "anon"),
      "Public key required",
    );
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    assert.ok(
      project.protocol === "https:" &&
        project.hostname.endsWith(".supabase.co"),
    );
    for (const actor of ["A", "B"]) {
      currentCheck = `customer ${actor} sign-in`;
      const db = createClient(project.href, key, {
        global: { fetch: timeoutFetch },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const login = await db.auth.signInWithPassword({
        email: process.env[`EVAL_CUSTOMER_${actor}_EMAIL`],
        password: process.env[`EVAL_CUSTOMER_${actor}_PASSWORD`],
      });
      if (login.error)
        failureCode = {
          httpStatus: login.error.status,
          authCode: /^[a-z_]+$/.test(login.error.code || "")
            ? login.error.code
            : "withheld",
        };
      assert.ok(
        !login.error && login.data.session,
        "Test sign-in failed; values withheld",
      );
      checks.push({ name: `customer ${actor} sign-in`, status: "PASS" });
      sessions[actor] = {
        db,
        token: login.data.session.access_token,
        id: login.data.user.id,
      };
      await check(`customer ${actor} role and own API rows`, async () => {
        const p = await db
          .from("profiles")
          .select("role")
          .eq("id", login.data.user.id)
          .single();
        assert.equal(p.data?.role, "customer");
        checks.push({ name: `customer ${actor} hosted role`, status: "PASS" });
        currentCheck = `customer ${actor} local workspace API`;
        const workspace = await api(actor, "workspace");
        assert.equal(workspace.status, 200);
        assert.equal(workspace.data.role, "customer");
        assert.ok(
          workspace.data.tickets.every(
            (t) => t.customer_id === login.data.user.id,
          ),
        );
        if (actor === "A") {
          fixtures.A =
            workspace.data.tickets.find((t) =>
              t.subject.startsWith("[TEST] Customer A persistence"),
            )?.id || workspace.data.tickets[0]?.id;
          assert.ok(fixtures.A, "A must have an existing test ticket");
        } else {
          assert.ok(
            workspace.data.tickets.length,
            "B must have an existing test ticket",
          );
          fixtures.B = workspace.data.tickets[0].id;
        }
      });
    }
    assert.notEqual(sessions.A.id, sessions.B.id, "Use two distinct accounts");
    for (const actor of ["A", "B"]) {
      const other = actor === "A" ? "B" : "A";
      const id = fixtures[other];
      await check(
        `${actor} cannot read ${other} ticket through Supabase REST/RLS`,
        async () => {
          const r = await sessions[actor].db
            .from("tickets")
            .select("id")
            .eq("id", id);
          assert.equal(r.error, null);
          assert.deepEqual(r.data, []);
        },
      );
      await check(
        `${actor} cannot reply to ${other} ticket through Next API`,
        async () => {
          const r = await api(actor, `tickets/${id}/replies`, "POST", {
            id: crypto.randomUUID(),
            body: "[TEST] Unauthorized cross-customer reply must be rejected.",
          });
          assert.equal(r.status, 404);
        },
      );
      await check(
        `${actor} cannot change own ticket status through Next API`,
        async () => {
          const r = await api(actor, `tickets/${fixtures[actor]}`, "PATCH", {
            status: "Resolved",
          });
          assert.equal(r.status, 403);
        },
      );
      await check(
        `${actor} existing ticket survives fresh API fetch`,
        async () => {
          const r = await api(actor, "workspace");
          assert.equal(r.status, 200);
          assert.ok(r.data.tickets.some((t) => t.id === fixtures[actor]));
          assert.ok(!r.data.tickets.some((t) => t.id === id));
        },
      );
    }
  }
} catch (error) {
  const code = error?.cause?.code;
  if (/^[A-Z_]+$/.test(code || "")) failureCode = { networkCode: code };
  checks.push({
    name: currentCheck,
    status: "FAIL",
    ...(failureCode || {}),
    reason:
      "Assertion, configuration or request failed; credential values withheld. Review the last passing check.",
  });
  process.exitCode = 1;
} finally {
  for (const s of Object.values(sessions))
    await s.db.auth.signOut({ scope: "local" }).catch(() => {});
  await mkdir("metrics", { recursive: true });
  await writeFile(
    "metrics/live-customers.json",
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        scope:
          "LIVE hosted Supabase and Next HTTP API; target identifies production/local; browser reload is separate evidence",
        target:
          new URL(base).hostname === "resolvedesk-mocha.vercel.app"
            ? "Vercel production"
            : "local Next app with hosted Supabase",
        fixtures,
        preservation:
          "Existing tickets retained; test-session-only sign-out; no role changes or deletions",
        checks,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Recorded metrics/live-customers.json without credentials.");
}
if (checks.some((c) => c.status === "PENDING")) process.exitCode = 2;
