import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (existsSync(".env.metrics.local")) process.loadEnvFile(".env.metrics.local");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ...["AGENT", "CUSTOMER_A", "CUSTOMER_B"].flatMap((r) => [
    "EVAL_" + r + "_EMAIL",
    "EVAL_" + r + "_PASSWORD",
  ]),
];
if (
  required.some((k) => !process.env[k] || /YOUR_|REPLACE_/.test(process.env[k]))
) {
  console.log(
    "PENDING: three confirmed dedicated test accounts are needed in ignored .env.metrics.local. Nothing changed.",
  );
  process.exit(2);
}
const base = process.env.EVAL_APP_URL || "http://localhost:3000";
const u = new URL(base);
if (
  !(
    u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname)
  ) &&
  !(u.protocol === "https:" && u.hostname.endsWith(".vercel.app"))
)
  throw new Error("Use localhost or the approved Vercel deployment.");
const sessions = {};
const checks = [];
const ticketId = crypto.randomUUID();
const replyId = crypto.randomUUID();
let storagePath = null;
let currentCheck = "sign-in";
let diagnostic = {};
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!(
  publicKey.startsWith("sb_publishable_") ||
  (publicKey.startsWith("eyJ") &&
    JSON.parse(Buffer.from(publicKey.split(".")[1], "base64url")).role ===
      "anon")
))
  throw new Error("A public key is required.");
async function check(name, fn) {
  currentCheck = name; diagnostic = {};
  await fn();
  checks.push({ name, passed: true });
  console.log("PASS: " + name);
}
async function api(actor, path, method = "GET", body) {
  const response = await fetch(base.replace(/\/$/, "") + "/api/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + sessions[actor].token,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(65000),
  });
  diagnostic = { httpStatus: response.status };
  return { status: response.status, data: await response.json() };
}
try {
  for (const role of ["AGENT", "CUSTOMER_A", "CUSTOMER_B"]) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey, {
      global: { fetch: (url, opts = {}) => fetch(url, { ...opts, signal: opts.signal || AbortSignal.timeout(20000) }) },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await db.auth.signInWithPassword({
      email: process.env["EVAL_" + role + "_EMAIL"],
      password: process.env["EVAL_" + role + "_PASSWORD"],
    });
    if (login.error || !login.data.session)
      throw new Error(
        "Dedicated test account sign-in failed; values withheld.",
      );
    sessions[role] = {
      db,
      token: login.data.session.access_token,
      id: login.data.user.id,
    };
  }
  assert.equal(
    new Set(Object.values(sessions).map((s) => s.id)).size,
    3,
    "Use three distinct test accounts.",
  );
  for (const actor of ["CUSTOMER_A", "CUSTOMER_B"]) {
    const p = await sessions[actor].db
      .from("profiles")
      .select("role")
      .eq("id", sessions[actor].id)
      .single();
    assert.equal(p.data?.role, "customer");
  }
  await check("customer ticket creation and idempotent retry", async () => {
    const input = {
      id: ticketId,
      subject: "ResolveDesk verification fixture",
      description:
        "Fictional ticket created by the reproducible workflow check.",
      category: "Other",
    };
    const first = await api("CUSTOMER_A", "tickets", "POST", input);
    assert.equal(first.status, 201);
    const retry = await api("CUSTOMER_A", "tickets", "POST", input);
    assert.equal(retry.status, 200);
    assert.equal(first.data.ticket.id, retry.data.ticket.id);
  });
  await check(
    "customer B cannot read or reply to customer A ticket",
    async () => {
      const r = await sessions.CUSTOMER_B.db
        .from("tickets")
        .select("id")
        .eq("id", ticketId);
      assert.equal(r.error, null);
      assert.equal(r.data.length, 0);
      assert.equal(
        (
          await api("CUSTOMER_B", "tickets/" + ticketId + "/replies", "POST", {
            id: crypto.randomUUID(),
            body: "Must be denied",
          })
        ).status,
        404,
      );
    },
  );
  await check(
    "customer cannot escalate role or change ticket status",
    async () => {
      const role = await sessions.CUSTOMER_A.db
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", sessions.CUSTOMER_A.id);
      assert.ok(role.error);
      assert.equal(
        (
          await api("CUSTOMER_A", "tickets/" + ticketId, "PATCH", {
            status: "Resolved",
          })
        ).status,
        403,
      );
    },
  );
  await check(
    "agent reply, resolution timestamp and customer persistence",
    async () => {
      const r = await api("AGENT", "tickets/" + ticketId + "/replies", "POST", {
        id: replyId,
        body: "Fictional agent response for verification.",
      });
      assert.equal(r.status, 201);
      assert.equal(
        (
          await api("AGENT", "tickets/" + ticketId + "/replies", "POST", {
            id: replyId,
            body: "Fictional agent response for verification.",
          })
        ).status,
        200,
      );
      const updated = await api("AGENT", "tickets/" + ticketId, "PATCH", {
        status: "Resolved",
      });
      assert.equal(updated.status, 200);
      assert.ok(updated.data.ticket.resolved_at);
      const row = await sessions.CUSTOMER_A.db
        .from("tickets")
        .select("status,resolved_at,replies(id)")
        .eq("id", ticketId)
        .single();
      assert.equal(row.data.status, "Resolved");
      assert.equal(row.data.replies.filter((r) => r.id === replyId).length, 1);
    },
  );
  await check(
    "private conversations exclude other customers and agents",
    async () => {
      const id = crypto.randomUUID();
      const a = sessions.CUSTOMER_A.db;
      const inserted = await a.from("conversations").insert({ id });
      diagnostic = { sqlCode: inserted.error?.code || null };
      assert.equal(inserted.error, null);
      for (const actor of ["CUSTOMER_B", "AGENT"]) {
        assert.equal((await api(actor, "conversations?id=" + id)).status, 404);
      }
    },
  );
  await check(
    "agent storage works; customer original access and upload denied",
    async () => {
      storagePath =
        sessions.AGENT.id + "/verification-" + crypto.randomUUID() + ".txt";
      const bucket = sessions.AGENT.db.storage.from("knowledge");
      assert.equal(
        (
          await bucket.upload(
            storagePath,
            "Fictional policy for permission verification.",
            { contentType: "text/plain" },
          )
        ).error,
        null,
      );
      assert.equal((await bucket.download(storagePath)).error, null);
      assert.ok(
        (
          await sessions.CUSTOMER_A.db.storage
            .from("knowledge")
            .download(storagePath)
        ).error,
      );
      assert.ok(
        (
          await sessions.CUSTOMER_A.db.storage
            .from("knowledge")
            .upload(storagePath + "-denied", "Denied fixture", {
              contentType: "text/plain",
            })
        ).error,
      );
      assert.equal((await bucket.remove([storagePath])).error, null);
      storagePath = null;
    },
  );
} catch {
  checks.push({
    name: currentCheck,
      diagnostic,
    passed: false,
  });
  process.exitCode = 1;
} finally {
  if (storagePath && sessions.AGENT)
    await sessions.AGENT.db.storage.from("knowledge").remove([storagePath]);
  for (const session of Object.values(sessions))
    await session.db.auth.signOut({ scope: "local" });
  await mkdir("metrics", { recursive: true });
  await writeFile(
    "metrics/live-workflows.json",
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        scope: "LIVE Supabase + Next API",
        checks,
        fixtureTicketId: ticketId,
        fixtureRetention:
          "Fictional ticket/reply/conversation retained as evidence. Only newly created temporary storage fixture removed.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Recorded metrics/live-workflows.json without credentials.");
}
