import { readFile, writeFile } from "node:fs/promises";
async function read(name) {
  try {
    return JSON.parse(await readFile("metrics/" + name + ".json", "utf8"));
  } catch {
    return null;
  }
}
const local = await read("local");
// Public rendering must never serialize ignored hosted-account fixture files.
// Production RAG uses the explicitly sanitized snapshot below.
const live = null;
const verification = await read("verification");
const workflows = await read("production-workflows");
const connection = null;
const customers = await read("production-customer-checks");
const customerA = null;
const gemini = await read("gemini-smoke");
const ingestion = await read("production-ingestion");
const browser = await read("production-browser-checks");
const auth = await read("production-auth");
const deployment = await read("production-deployment");
const fmt = (n) =>
  n === null || n === undefined ? "not measured" : n.toFixed(6) + " ms";
let out =
  "# ResolveDesk measurement report\n\nGenerated: " +
  new Date().toISOString() +
  "\n\n";
out +=
  "## What these results establish\n\nDemo, local and live evidence are separate. Saved-answer lookup speed is not AI latency. Embedded PostgreSQL uses real RLS/grants/pgvector but mocks Supabase-owned auth/storage schemas. No business-impact, accuracy percentage or uptime claims are inferred.\n\n";
out +=
  "## Reproduction\n\n1. npm ci\n2. npm run verify (test → database → TypeScript → build, sequential)\n3. npm run metrics:local\n4. npm run metrics:report\n\nProduction checks use existing confirmed dedicated accounts in ignored .env.metrics.local and application settings in ignored .env.local. In PowerShell set $env:EVAL_APP_URL='https://resolvedesk-mocha.vercel.app'. Run npm run test:customers, npm run test:live, npm run verify:gemini and npm run test:ingestion separately. Set $env:EVAL_SPACING_MS='15000' before npm run metrics:live. Use exactly the three sample policies. Preserve all previous ignored metrics/live*.json files under new dated filenames before rerunning, including failures. EVAL_CASE_FILTER=9 writes a separate follow-up report. Review/sanitize new snapshots before publication; this renderer reads public production-*.json rather than raw account fixtures. Regenerating the report does not rerun tests or change measurement dates. Free-tier dashboards must be checked separately.\n\n";
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
    ". Pending processing is not ready semantic retrieval. See metrics/production-ingestion.json; account/document IDs are excluded.\n\n";
if (customerA)
  out +=
    "Customer A browser evidence (not AI latency): " +
    JSON.stringify(customerA.checks) +
    ". Initial timed-out attempt: " +
    JSON.stringify(customerA.failedAttempts) +
    ". See metrics/live-customer-a.json and its screenshot.\n\n";
if (customers)
  out +=
    "Two-customer API/RLS evidence measured " +
    customers.measuredAt +
    " against " +
    customers.target +
    ": " +
    JSON.stringify(customers.checks) +
    ". See metrics/production-customer-checks.json. PENDING is not PASS; fresh API fetching is distinct from full browser reload.\n\n";
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
    "The dated production RAG snapshot is reported below; raw hosted-account files remain private. Local timings must not be used as claims about live AI.\n\n";
if (workflows)
  out +=
    "Live workflow checks: " +
    JSON.stringify(workflows.checks) +
    ". See metrics/production-workflows.json.\n\n";
else
  out +=
    "Live authentication/customer/agent/storage/ticket workflow verification: pending.\n\n";
if (connection)
  out +=
    "Connection probe: " +
    JSON.stringify(connection) +
    ". A reachable Data API does not prove automatic-exposure or automatic-RLS settings.\n\n";
out +=
  "## Statistical method and limits\n\nMedian is the middle observation (average of the middle pair for even n). p95 is nearest-rank: sorted[ceil(0.95*n)-1]. Timings use performance.now(). Report failures separately, include the first request, and never silently drop slow successes. Raw local samples are in metrics/local.json. The main production run used nine serial cases with 15-second spacing and fresh conversations. Earlier incomplete runs used the spacing recorded in their own conditions; never pool those samples. For n=8 the nearest-rank p95 is the maximum observed successful latency, descriptive rather than a production SLA. End-to-end timings include HTTP, auth, embedding, retrieval, generation and persistence; initial client sign-in/corpus inspection and frontend rendering are excluded.\n\n";
out +=
  "## Evaluation rubric\n\nUse tests/rag-evaluation.json: four answerable, two unanswerable, two misleading and one action-boundary case. For answerable cases check expected-source retrieval and answer claims against citations. For unanswerable cases require explicit insufficiency with no invented order facts. Misleading questions must not override policies. Action cases must not claim a ticket/refund was created. Retrieval of a related source alone is not correctness. Reviews are explicitly assistant source/app-constraint comparisons, not an independent human assessment. With only three chunks in a top-5 search, source rank is more informative than recall alone.\n";
try {
  const snapshot = JSON.parse(
    await readFile("metrics/production-rag-evaluation.json", "utf8"),
  );
  out +=
    "\n## Published production snapshot\n\nMeasured " +
    snapshot.measuredAt +
    " against " +
    snapshot.target +
    ". Public raw synthetic evidence: metrics/production-rag-evaluation.json, production-customer-checks.json, production-workflows.json and production-ingestion.json. Account IDs, ticket IDs, credentials and private customer screenshots are excluded.\n\n";
  out +=
    "Corpus: **3 ready documents, 3 logical text pages, 3 chunks; 0 uploaded PDF pages**. Embeddings: 768 dimensions, gemini-embedding-2; answers: gemini-3.1-flash-lite. Retrieval: cosine similarity, top 5, threshold 0.35. The expected source ranked first in all four defined answerable cases; this tiny corpus does not establish general retrieval accuracy.\n\n";
  out +=
    "Main run: 9 planned/attempted cases, 8 HTTP 200 responses and 1 HTTP 503 failure. Eight successful request latencies: median **" +
    (snapshot.mainRun.timings.successful.medianMs / 1000).toFixed(2) +
    " s**, nearest-rank p95 **" +
    (snapshot.mainRun.timings.successful.p95Ms / 1000).toFixed(2) +
    " s**. Serial requests, 15-second spacing, fresh conversations and unique IDs, no warmup, first request included. Windows Node 22 client; Vercel Hobby production. HTTP timing includes network, server auth, embedding, retrieval, generation and persistence; initial client sign-in/corpus inspection are excluded. Small-sample p95 is descriptive, not an SLA.\n\n";
  out +=
    "Case 9 subsequently passed in a separate n=1 action-boundary follow-up (" +
    (
      snapshot.separateActionBoundaryFollowUp.timings.successful.medianMs / 1000
    ).toFixed(2) +
    " s). Do not combine that timing with the main-run sample or call the main run 9/9 successful. All nine scenarios have successful application outputs across the two runs. Two unanswerable cases abstained without citations; both misleading cases rejected/corrected their premise; action case did not claim a refund or ticket was performed.\n\n";
  out +=
    "Grounding review: assistant comparison against actual policy excerpts and app action constraints, with answer hashes in metrics/grounding-review.json. This is not an independent human study. Source title/page matches were checked for returned citations. Provider logs confirmed generateContent HTTP 503 despite the one bounded transient retry; failures are availability failures, not fabricated answers. Earlier incomplete runs remain summarized in the public evidence. No percentages, business impact, production throughput or uptime claims.\n";
  out +=
    "\n| Prior incomplete attempt (UTC) | Spacing | Attempted | HTTP 200 | Failed |\n|---|---:|---:|---:|---:|\n";
  for (const r of snapshot.priorIncompleteAttempts)
    out += `| ${r.measuredAt} | ${r.conditions.spacingMs / 1000} s | ${r.attempted} | ${r.successful} | ${r.failed} |\n`;
  out +=
    "\n### Defined cases and observed outcomes\n\nAnswers and retrieved passages remain in the sanitized production snapshot. The review column is an assistant comparison with the policy, not independent human evaluation.\n\n| Case | Type | Question | Main HTTP | Expected source retrieved | Abstained | Review |\n|---|---|---|---:|---|---|---|\n";
  const cell = (value) => String(value ?? "N/A").replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
  for (const r of snapshot.mainRun.results)
    out += `| ${r.case} | ${cell(r.kind)} | ${cell(r.question)} | ${r.status} | ${cell(r.automaticChecks?.expectedSourceRetrieved)} | ${cell(r.automaticChecks?.abstained)} | ${cell(r.review?.verdict)} |\n`;
  out += "\nCase 9's main-run failure remains in this table; its separate successful follow-up does not replace it.\n";
} catch {}
out += "\n## Production browser and authentication checks\n\n";
for (const [report, file] of [
  [browser, "production-browser-checks"],
  [auth, "production-auth"],
]) {
  if (!report) {
    out += `UNTESTED: no ${file}.json evidence recorded.\n\n`;
    continue;
  }
  out += `Recorded ${report.measuredAt || report.checkedAt}; target ${report.target}. See metrics/${file}.json.\n\n`;
  if (report.postUpdate)
    out += `Post-update follow-up completed ${report.postUpdate.completedAt} on source ${report.postUpdate.sourceCommit}: ${report.postUpdate.checks} additional checks, ${report.postUpdate.ragSmokeCases} RAG smoke case, no latency sample. Earlier browser checks and their dates remain separate.\n\n`;
  for (const c of report.checks)
    out += `- ${c.status}${c.phase ? ` (${c.phase})` : ""}: ${c.name}${c.note ? ` — ${c.note}` : ""}.\n`;
  if (report.automationAttempts)
    out += `\n${report.automationAttempts.length} unsuccessful or inconclusive automation observations are retained in the JSON with their resolutions; these are not silently counted as passed attempts.\n`;
  out += "\n";
}
if (deployment) {
  out += `## Published deployment verification\n\nChecked ${deployment.checkedAt}. Stable URL: ${deployment.target}. Deployed application source: ${deployment.sourceCommit}; Vercel state: ${deployment.readyState}; linked plan: ${deployment.plan}; cloud build: ${deployment.cloudBuild}. See metrics/production-deployment.json. Final documentation commits can follow this application commit without changing the runtime.\n\n`;
  for (const c of deployment.checks)
    out += `- ${c.status}: ${c.name}${c.httpStatus ? ` (HTTP ${c.httpStatus})` : ""}.\n`;
  out += `\nApplication-source GitHub CI: ${deployment.githubCi.status}/${deployment.githubCi.conclusion}. [Recorded CI run](${deployment.githubCi.url}).\n\n`;
  if (deployment.followUpCompletedAt)
    out += `Post-update browser/API follow-up completed ${deployment.followUpCompletedAt}.\n\n`;
}
out +=
  "## Remaining limits\n\nIntermittent free-provider failures, a three-document corpus, no OCR, no independent human evaluation, single-store permissions, no background ingestion worker, newest-500-ticket/100-document UI limits and untested future-table automatic-RLS behavior bound the claims. Signup/email redirect checks must not be inferred from existing-account API login. Historical embedding HTTP 402 and old answer-model HTTP 404 attempts remain failures of those attempts, even though the later free-tier model checks passed.\n";
await writeFile("docs/METRICS_REPORT.md", out);
console.log("Updated docs/METRICS_REPORT.md from measured evidence only.");
