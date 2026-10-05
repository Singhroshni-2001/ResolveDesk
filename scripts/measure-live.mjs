import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (existsSync(".env.metrics.local")) process.loadEnvFile(".env.metrics.local");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "GEMINI_API_KEY",
  "EVAL_AGENT_EMAIL",
  "EVAL_AGENT_PASSWORD",
];
if (
  required.some((k) => !process.env[k] || /YOUR_|REPLACE_/.test(process.env[k]))
) {
  console.log(
    "PENDING: add app settings and a dedicated agent test account to ignored .env.metrics.local. No measurements made.",
  );
  process.exit(2);
}
const base = process.env.EVAL_APP_URL || "http://localhost:3000";
const target = new URL(base);
if (
  !(
    target.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(target.hostname)
  ) &&
  !(target.protocol === "https:" && target.hostname.endsWith(".vercel.app"))
)
  throw new Error(
    "Evaluation target must be localhost or your approved vercel.app deployment.",
  );
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!(
  key.startsWith("sb_publishable_") ||
  (key.startsWith("eyJ") &&
    JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role === "anon")
))
  throw new Error("Use a public key, never an elevated key.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const auth = await db.auth.signInWithPassword({
  email: process.env.EVAL_AGENT_EMAIL,
  password: process.env.EVAL_AGENT_PASSWORD,
});
if (auth.error || !auth.data.session)
  throw new Error(
    "Test-agent sign-in failed. Verify the local credentials and email confirmation; values withheld.",
  );
const token = auth.data.session.access_token;
const profile = await db
  .from("profiles")
  .select("role")
  .eq("id", auth.data.user.id)
  .single();
if (!["agent", "admin"].includes(profile.data?.role))
  throw new Error(
    "The dedicated test account must be owner-provisioned as an agent.",
  );
async function all(table, select) {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const result = await db
      .from(table)
      .select(select)
      .order("id")
      .range(start, start + 499);
    if (result.error)
      throw new Error(
        "Cannot read evaluation corpus; verify migrations and permissions.",
      );
    rows.push(...result.data);
    if (result.data.length < 500) return rows;
  }
}
const documents = await all(
  "documents",
  "id,name,status,content_hash,embedding_model",
);
const chunks = await all("chunks", "id,document_id,page");
const corpus = documents.map((d) => ({
  name: d.name,
  sha256: d.content_hash,
  status: d.status,
  embeddingModel: d.embedding_model,
  pages: new Set(
    chunks.filter((c) => c.document_id === d.id).map((c) => c.page),
  ).size,
  chunks: chunks.filter((c) => c.document_id === d.id).length,
}));
const samples = await Promise.all(
  ["returns.md", "shipping.md", "billing.txt"].map(async (name) => ({
    name,
    sha256: createHash("sha256")
      .update(await readFile("samples/" + name))
      .digest("hex"),
  })),
);
if (
  documents.length !== 3 ||
  samples.some(
    (s) =>
      !documents.some(
        (d) => d.content_hash === s.sha256 && d.status === "ready",
      ),
  )
)
  throw new Error(
    "Use exactly the three ready sample policies for this reproducible evaluation. No answers requested.",
  );
const cases = JSON.parse(await readFile("tests/rag-evaluation.json", "utf8"));
const results = [];
const startTime = new Date().toISOString();
await mkdir("metrics", { recursive: true });
for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
  const start = performance.now();
  try {
    const response = await fetch(base.replace(/\/$/, "") + "/api/chat", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "x-resolvedesk-evaluation": "1",
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        conversation_id: crypto.randomUUID(),
        question: c.question,
      }),
      signal: AbortSignal.timeout(65000),
    });
    const data = await response.json();
    const elapsedMs = performance.now() - start;
    if (!response.ok) {
      results.push({
        case: i + 1,
        question: c.question,
        kind: c.kind,
        status: response.status,
        elapsedMs,
        result: "request-failed",
        publicError: typeof data.error === "string" ? data.error : null,
      });
      if ([401, 403, 429, 503].includes(response.status)) break;
      continue;
    }
    if (
      !Array.isArray(data.evaluation?.retrieved) ||
      !data.evaluation?.timingsMs
    ) {
      results.push({
        case: i + 1,
        question: c.question,
        kind: c.kind,
        status: response.status,
        elapsedMs,
        result: "diagnostic-instrumentation-missing; retrieval not measured",
      });
      break;
    }
    const retrieved = data.evaluation.retrieved.map((p) => ({
      title: p.title,
      page: p.page,
      similarity: p.similarity,
      excerpt: p.content,
    }));
    const expectedSourceRetrieved = c.source
      ? retrieved.some((p) => p.title === c.source)
      : null;
    const abstained =
      Array.isArray(data.citations) && data.citations.length === 0;
    results.push({
      case: i + 1,
      question: c.question,
      kind: c.kind,
      expected: c.expected,
      expectedSource: c.source || null,
      status: response.status,
      elapsedMs,
      answer: data.content,
      citations: data.citations,
      retrieved,
      stages: data.evaluation?.timingsMs || null,
      models: data.evaluation
        ? {
            answer: data.evaluation.answerModel,
            embedding: data.evaluation.embeddingModel,
          }
        : null,
      automaticChecks: { expectedSourceRetrieved, abstained },
      humanGroundingVerdict:
        "pending review; automatic source match is not answer correctness",
    });
  } catch {
    results.push({
      case: i + 1,
      question: c.question,
      kind: c.kind,
      result: "request-timeout-or-network-error",
      elapsedMs: performance.now() - start,
    });
    break;
  }
  await delay(Number(process.env.EVAL_SPACING_MS || 2000));
}
function summary(values) {
  const sorted = values.sort((a, b) => a - b);
  const n = sorted.length;
  return {
    n,
    medianMs: n
      ? n % 2
        ? sorted[Math.floor(n / 2)]
        : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : null,
    p95Ms: n ? sorted[Math.ceil(n * 0.95) - 1] : null,
  };
}
const output = {
  measuredAt: startTime,
  scope: "LIVE Supabase/Gemini through Next HTTP chat route",
  conditions: {
    target:
      target.hostname === "localhost" || target.hostname === "127.0.0.1"
        ? "localhost (record whether npm start or npm run dev in review)"
        : "approved Vercel deployment",
    sampleSizePlanned: cases.length,
    concurrency: 1,
    spacingMs: Number(process.env.EVAL_SPACING_MS || 2000),
    warmup: "none; first request included",
    conversationContext: "fresh conversation per case",
    cache: "unique request IDs; no saved answer reuse",
    statistics: "median and nearest-rank p95; small sample descriptive only",
    freeTier: "must be confirmed in provider dashboards; no paid fallback used",
  },
  corpus: {
    documents: corpus.length,
    pages: corpus.reduce((n, d) => n + d.pages, 0),
    chunks: chunks.length,
    manifest: corpus,
  },
  timings: {
    successful: summary(
      results.filter((r) => r.status === 200).map((r) => r.elapsedMs),
    ),
    failed: summary(
      results.filter((r) => r.status !== 200).map((r) => r.elapsedMs),
    ),
  },
  results,
};
await writeFile("metrics/live.json", JSON.stringify(output, null, 2) + "\n");
console.log(
  "Saved metrics/live.json. Successful requests: " +
    output.timings.successful.n +
    " / " +
    cases.length +
    ". Human grounding review remains required. No credentials written.",
);
await db.auth.signOut({ scope: "local" });
