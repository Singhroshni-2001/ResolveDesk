import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (existsSync(".env.metrics.local")) process.loadEnvFile(".env.metrics.local");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "EVAL_AGENT_EMAIL",
  "EVAL_AGENT_PASSWORD",
];
const checks = [];
const manifest = [];
let db;
let currentCheck = "agent configuration";
const base = process.env.EVAL_APP_URL || "http://localhost:3000";
const timeoutFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(20000),
  });
async function check(name, fn) {
  currentCheck = name;
  await fn();
  checks.push({ name, status: "PASS" });
  console.log("PASS: " + name);
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
        "Confirmed owner-provisioned agent credentials required locally; nothing uploaded",
    });
  } else {
    const target = new URL(base);
    assert.ok(
      (target.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(target.hostname)) ||
        (target.protocol === "https:" &&
          target.hostname === "resolvedesk-mocha.vercel.app"),
    );
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.ok(
      key.startsWith("sb_publishable_") ||
        (key.startsWith("eyJ") &&
          JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role ===
            "anon"),
    );
    db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
      global: { fetch: timeoutFetch },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await db.auth.signInWithPassword({
      email: process.env.EVAL_AGENT_EMAIL,
      password: process.env.EVAL_AGENT_PASSWORD,
    });
    assert.ok(!login.error && login.data.session);
    const token = login.data.session.access_token;
    await check("owner-provisioned agent role", async () => {
      const p = await db
        .from("profiles")
        .select("role")
        .eq("id", login.data.user.id)
        .single();
      assert.ok(["agent", "admin"].includes(p.data?.role));
    });
    async function post(path, form) {
      const r = await timeoutFetch(base.replace(/\/$/, "") + "/api/" + path, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        ...(form ? { body: form } : {}),
        signal: AbortSignal.timeout(65000),
      });
      return { status: r.status, data: await r.json() };
    }
    let inferenceReady = false;
    try {
      const smoke = JSON.parse(
        await readFile("metrics/gemini-smoke.json", "utf8"),
      );
      inferenceReady =
        smoke.results.length === 2 &&
        smoke.results.every((r) => r.status === "PASS") &&
        smoke.models.embedding ===
          (process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2");
    } catch {}
    for (const name of ["returns.md", "shipping.md", "billing.txt"]) {
      const bytes = await readFile("samples/" + name);
      const hash = createHash("sha256").update(bytes).digest("hex");
      const mime = name.endsWith(".md") ? "text/markdown" : "text/plain";
      let id;
      await check(name + " upload and same-hash retry", async () => {
        function form() {
          const f = new FormData();
          f.set("file", new File([bytes], name, { type: mime }));
          return f;
        }
        const first = await post("documents", form());
        assert.ok([200, 201].includes(first.status));
        assert.ok(first.data.id);
        id = first.data.id;
        const retry = await post("documents", form());
        assert.equal(retry.status, 200);
        assert.equal(retry.data.id, id);
      });
      await check(name + " original bytes in private storage", async () => {
        const d = await db
          .from("documents")
          .select("storage_path,content_hash")
          .eq("id", id)
          .single();
        assert.equal(d.data?.content_hash, hash);
        const file = await db.storage
          .from("knowledge")
          .download(d.data.storage_path);
        assert.equal(file.error, null);
        assert.equal(
          createHash("sha256")
            .update(Buffer.from(await file.data.arrayBuffer()))
            .digest("hex"),
          hash,
        );
      });
      if (inferenceReady) {
        await check(
          name + " bounded processing and ready-state retry",
          async () => {
            let done = false;
            for (let i = 0; i < 20 && !done; i++) {
              const r = await post("documents/" + id + "/process");
              assert.equal(r.status, 200);
              done = r.data.done === true;
            }
            assert.ok(done);
            const again = await post("documents/" + id + "/process");
            assert.equal(again.status, 200);
            assert.equal(again.data.done, true);
          },
        );
      } else
        checks.push({
          name: name + " Gemini processing",
          status: "PENDING",
          reason:
            "Actual Gemini smoke must pass first; no inference retries on payment/model failures",
        });
      const document = await db
        .from("documents")
        .select("name,status,embedding_model")
        .eq("id", id)
        .single();
      assert.equal(document.error, null);
      const chunks = await db
        .from("chunks")
        .select("ordinal,page,embedding")
        .eq("document_id", id);
      assert.equal(chunks.error, null);
      assert.ok(chunks.data.length);
      assert.equal(
        new Set(chunks.data.map((c) => c.ordinal)).size,
        chunks.data.length,
      );
      manifest.push({
        name,
        sha256: hash,
        documentId: id,
        status: document.data.status,
        embeddingModel: document.data.embedding_model,
        logicalPages: new Set(chunks.data.map((c) => c.page)).size,
        chunks: chunks.data.length,
        embeddedChunks: chunks.data.filter((c) => c.embedding !== null).length,
      });
    }
  }
} catch {
  checks.push({
    name: currentCheck,
    status: "FAIL",
    reason:
      "Request/permission/assertion failure; inspect the last passing stage. All created originals and metadata retained for resume; no credentials recorded.",
  });
  process.exitCode = 1;
} finally {
  if (db) await db.auth.signOut({ scope: "local" }).catch(() => {});
  await mkdir("metrics", { recursive: true });
  await writeFile(
    "metrics/live-ingestion.json",
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        scope:
          "LIVE Supabase storage and Next ingestion; only passed processing checks establish usable vectors",
        conditions: {
          sampleFiles: 3,
          concurrency: 1,
          preservation:
            "No document/ticket deletions; same-hash reuse; test-session-only sign-out",
        },
        checks,
        corpus: manifest.length
          ? {
              documents: manifest.length,
              logicalPages: manifest.reduce((n, d) => n + d.logicalPages, 0),
              chunks: manifest.reduce((n, d) => n + d.chunks, 0),
              manifest,
            }
          : null,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Recorded metrics/live-ingestion.json without credentials.");
}
if (checks.some((c) => c.status === "PENDING") && !process.exitCode)
  process.exitCode = 2;
