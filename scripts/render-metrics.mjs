import { readFile, writeFile } from "node:fs/promises";
async function read(name) {
  try {
    return JSON.parse(await readFile("metrics/" + name + ".json", "utf8"));
  } catch {
    return null;
  }
}
const local = await read("local");
const live = await read("live");
const verification = await read("verification");
const workflows = await read("live-workflows");
const connection = await read("connection");
const customers = await read("live-customers");
const customerA = await read("live-customer-a");
const gemini = await read("gemini-smoke");
const ingestion = await read("live-ingestion");
const fmt = (n) =>
  n === null || n === undefined ? "not measured" : n.toFixed(6) + " ms";
let out =
  "# ResolveDesk measurement report\n\nGenerated: " +
  new Date().toISOString() +
  "\n\n";
out +=
  "## What these results establish\n\nDemo, local and live evidence are separate. Saved-answer lookup speed is not AI latency. Embedded PostgreSQL uses real RLS/grants/pgvector but mocks Supabase-owned auth/storage schemas. No business-impact, accuracy percentage or uptime claims are inferred.\n\n";
out +=
  "## Reproduction\n\n1. npm ci\n2. npm run verify\n3. npm run metrics:local\n4. npm run metrics:report\n\nLive steps, only after account setup: npm run verify:connection; npm run verify:models; npm run test:live; npm run metrics:live; npm run metrics:report. Use dedicated confirmed test accounts in ignored .env.metrics.local, exactly the three sample policies, and a running production build (npm start). Free-tier dashboards must be checked separately.\n\n";
out += "## Local corpus and extraction\n\n";
if (local) {
  out +=
    "Measured " +
    local.measuredAt +
    ". " +
    local.corpus.documents +
    " documents, " +
    local.corpus.logicalPages +
    " logical text pages, " +
    local.corpus.physicalPdfPages +
    " physical PDF pages, " +
    local.corpus.chunks +
    " extracted chunks. This is a local sample corpus, not an uploaded live corpus.\n\n";
  out +=
    "| File | Bytes | Characters | Logical pages | Chunks | SHA-256 |\n|---|---:|---:|---:|---:|---|\n";
  for (const d of local.corpus.manifest)
    out +=
      "| " +
      d.name +
      " | " +
      d.bytes +
      " | " +
      d.extractedCharacters +
      " | " +
      d.logicalPages +
      " | " +
      d.chunks +
      " | " +
      d.sha256 +
      " |\n";
  out += "\nEnvironment: " + JSON.stringify(local.environment) + ".\n\n";
  const e = local.localExtraction;
  out +=
    "Extraction: n=" +
    e.summary.n +
    ", median " +
    fmt(e.summary.medianMs) +
    ", p95 " +
    fmt(e.summary.p95Ms) +
    ". " +
    e.conditions +
    "\n\n";
  out += "## Demo measurements\n\n";
  out +=
    local.demo.results.filter((r) => r.pass).length +
    "/" +
    local.demo.results.length +
    " defined behavior checks passed. Three exact example questions return saved answers; the separate live evaluation questions intentionally abstain in demo mode. This is not semantic retrieval accuracy.\n\n";
  out +=
    "Saved-answer lookup: n=" +
    local.demo.lookupTimings.n +
    ", median " +
    fmt(local.demo.lookupTimings.medianMs) +
    ", p95 " +
    fmt(local.demo.lookupTimings.p95Ms) +
    ". " +
    local.demo.conditions +
    "\n\n";
} else out += "Not measured. Run npm run metrics:local.\n\n";
out += "## Local permission and workflow checks\n\n";
if (verification) {
  out +=
    "Source fingerprint: " +
    verification.sourceSha256 +
    ". Run: " +
    verification.measuredAt +
    ".\n\n";
  for (const c of verification.checks)
    out +=
      "- " +
      c.command +
      ": " +
      (c.passed ? "PASS" : "FAIL") +
      (c.summary ? " (" + c.summary.join(", ") + ")" : "") +
      ". Evidence: " +
      c.log +
      ".\n";
} else out += "No current full verification run recorded.\n";
out +=
  "\nThe database harness applies both migrations and exercises owner isolation, forbidden role escalation, agent replies/status, resolution timestamps, private conversations, duplicate reply IDs, private storage, anonymous denial, ready-only retrieval, model isolation and rate limits. Synthetic vectors test SQL behavior, not Gemini retrieval quality.\n\n";
out += "## Live measurements\n\n";
if (ingestion)
  out +=
    "Live sample ingestion: " +
    JSON.stringify(ingestion.corpus) +
    ". Checks: " +
    JSON.stringify(ingestion.checks) +
    ". Pending processing is not ready semantic retrieval. See metrics/live-ingestion.json.\n\n";
if (customerA)
  out +=
    "Customer A browser evidence (not AI latency): " +
    JSON.stringify(customerA.checks) +
    ". Initial timed-out attempt: " +
    JSON.stringify(customerA.failedAttempts) +
    ". See metrics/live-customer-a.json and its screenshot.\n\n";
if (customers)
  out +=
    "Two-customer API/RLS evidence: " +
    JSON.stringify(customers.checks) +
    ". See metrics/live-customers.json. PENDING is not PASS; fresh API fetching is distinct from full browser reload.\n\n";
if (gemini)
  out +=
    "Gemini synthetic smoke: " +
    JSON.stringify(gemini.results) +
    ". Each operation has n=1 and uses a fictional supplied policy; this is not uploaded-document retrieval or application RAG. No median/p95 AI claim is derived. See metrics/gemini-smoke.json.\n\n";
if (live) {
  out +=
    "Measured " +
    live.measuredAt +
    ". Corpus: " +
    live.corpus.documents +
    " documents, " +
    live.corpus.pages +
    " pages, " +
    live.corpus.chunks +
    " chunks.\n\nConditions: " +
    JSON.stringify(live.conditions) +
    ".\n\n";
  out +=
    "Successful HTTP responses: n=" +
    live.timings.successful.n +
    ", median " +
    fmt(live.timings.successful.medianMs) +
    ", p95 " +
    fmt(live.timings.successful.p95Ms) +
    ". Failed requests: n=" +
    live.timings.failed.n +
    ".\n\n";
  out +=
    "| Case | Kind | HTTP | Expected source retrieved | Abstained |\n|---|---|---:|---|---|\n";
  for (const r of live.results)
    out +=
      "| " +
      r.case +
      " | " +
      r.kind +
      " | " +
      (r.status || "failed") +
      " | " +
      (r.automaticChecks?.expectedSourceRetrieved ?? "N/A") +
      " | " +
      (r.automaticChecks?.abstained ?? "N/A") +
      " |\n";
  out +=
    "\nRaw answers, retrieved passages, similarities, stage timings and pending human grounding verdicts are in metrics/live.json. No semantic accuracy percentage is calculated without reviewing answers against the rubric.\n\n";
} else
  out +=
    "**Not measured.** Hosted corpus counts, Gemini retrieval results, grounded-answer quality, and live median/p95 latency remain pending credentials, migration application, sample ingestion and test accounts. Do not use local timings as resume claims about live AI.\n\n";
if (workflows)
  out +=
    "Live workflow checks: " +
    JSON.stringify(workflows.checks) +
    ". See metrics/live-workflows.json.\n\n";
else
  out +=
    "Live authentication/customer/agent/storage/ticket workflow verification: pending.\n\n";
if (connection)
  out +=
    "Connection probe: " +
    JSON.stringify(connection) +
    ". A reachable Data API does not prove automatic-exposure or automatic-RLS settings.\n\n";
out +=
  "## Statistical method and limits\n\nMedian is the middle observation (average of the middle pair for even n). p95 is nearest-rank: sorted[ceil(0.95*n)-1]. Timings use performance.now(). Report failures separately, include the first request, and never silently drop slow successes. Raw local samples are in metrics/local.json. Live evaluation is nine serial cases with 2-second spacing and fresh conversations; its small-sample p95 is descriptive, not a production SLA. End-to-end live timings include HTTP, auth, embedding, retrieval, generation and persistence. Optional agent-only diagnostics expose internal stages, not frontend render timing.\n\n";
out +=
  "## Evaluation rubric\n\nUse tests/rag-evaluation.json. For answerable cases check the expected source is retrieved AND manually verify all answer claims against citations. For unanswerable cases require explicit insufficiency with no invented order facts. Misleading questions must not override policies. Action-boundary cases must not claim a ticket/refund was created. Retrieval of a related source alone is not answer correctness. Record manual verdicts in metrics/live.json only after reviewing actual outputs.\n";
await writeFile("docs/METRICS_REPORT.md", out);
console.log("Updated docs/METRICS_REPORT.md from measured evidence only.");
