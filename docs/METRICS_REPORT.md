# ResolveDesk measurement report

Generated: 2026-10-06T19:43:17.369Z

## What these results establish

Demo, local and live evidence are separate. Saved-answer lookup speed is not AI latency. Embedded PostgreSQL uses real RLS/grants/pgvector but mocks Supabase-owned auth/storage schemas. No business-impact, accuracy percentage or uptime claims are inferred.

## Reproduction

1. npm ci
2. npm run verify (test → database → TypeScript → build, sequential)
3. npm run metrics:local
4. npm run metrics:report

Production checks use existing confirmed dedicated accounts in ignored .env.metrics.local and application settings in ignored .env.local. In PowerShell set $env:EVAL_APP_URL='https://resolvedesk-mocha.vercel.app'. Run npm run test:customers, npm run test:live, npm run verify:gemini and npm run test:ingestion separately. Set $env:EVAL_SPACING_MS='15000' before npm run metrics:live. Use exactly the three sample policies. Preserve all previous ignored metrics/live*.json files under new dated filenames before rerunning, including failures. EVAL_CASE_FILTER=9 writes a separate follow-up report. Review/sanitize new snapshots before publication; this renderer reads public production-*.json rather than raw account fixtures. Regenerating the report does not rerun tests or change measurement dates. Free-tier dashboards must be checked separately.

## Local corpus and extraction

Measured 2026-10-05T06:02:35.241Z. 3 documents, 3 logical text pages, 0 physical PDF pages, 3 extracted chunks. This is a local sample corpus, not an uploaded live corpus.

| File | Bytes | Characters | Logical pages | Chunks | SHA-256 |
|---|---:|---:|---:|---:|---|
| returns.md | 258 | 254 | 1 | 1 | c62beedaeda5cf298f8fd9c2a437a4d2a664c27feae42003881fa141576d57b9 |
| shipping.md | 233 | 227 | 1 | 1 | a2d57b273c56f738ede62685c81e7815b4f66393f24bcf4c57ed8cac263f3678 |
| billing.txt | 261 | 257 | 1 | 1 | c69cf6ecf47878070758b950d97d5c3c659d3c3a483d1755174368508083fc77 |

Environment: {"node":"v22.12.0","platform":"win32","architecture":"x64","cpu":"11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz"}.

Extraction: n=30, median 0.031900 ms, p95 0.146600 ms. One warm-up extraction per file, 10 measured serial extractions per file; in-memory UTF-8 TXT/MD only. No PDF, upload, embedding or database cost included.

## Demo measurements

12/12 defined behavior checks passed. Three exact example questions return saved answers; the separate live evaluation questions intentionally abstain in demo mode. This is not semantic retrieval accuracy.

Saved-answer lookup: n=120, median 0.000700 ms, p95 0.000800 ms. One warm-up per question, then 10 serial rounds. Pure savedAnswer() lookup only; excludes rendering/network/model inference. These are NOT AI response latencies.

## Local permission and workflow checks

Source fingerprint: 193fd6b6c91535296669455521de7ab18270626077d615f59ce05de27a594bed. Run: 2026-10-06T19:30:04.835Z.

- npm run test: PASS (# tests 18, # pass 18, # fail 0). Evidence: test-results/verify-test.log.
- npm run test:db: PASS. Evidence: test-results/verify-test-db.log.
- npm run typecheck: PASS. Evidence: test-results/verify-typecheck.log.
- npm run build: PASS. Evidence: test-results/verify-build.log.

The database harness applies both migrations and exercises owner isolation, forbidden role escalation, agent replies/status, resolution timestamps, private conversations, duplicate reply IDs, private storage, anonymous denial, ready-only retrieval, model isolation and rate limits. Synthetic vectors test SQL behavior, not Gemini retrieval quality.

## Live measurements

Live sample ingestion: {"documents":3,"logicalPages":3,"chunks":3,"manifest":[{"name":"returns.md","sha256":"c62beedaeda5cf298f8fd9c2a437a4d2a664c27feae42003881fa141576d57b9","status":"ready","embeddingModel":"gemini-embedding-2","logicalPages":1,"chunks":1,"embeddedChunks":1},{"name":"shipping.md","sha256":"a2d57b273c56f738ede62685c81e7815b4f66393f24bcf4c57ed8cac263f3678","status":"ready","embeddingModel":"gemini-embedding-2","logicalPages":1,"chunks":1,"embeddedChunks":1},{"name":"billing.txt","sha256":"c69cf6ecf47878070758b950d97d5c3c659d3c3a483d1755174368508083fc77","status":"ready","embeddingModel":"gemini-embedding-2","logicalPages":1,"chunks":1,"embeddedChunks":1}],"physicalPdfPages":0}. Checks: [{"name":"owner-provisioned agent role","status":"PASS"},{"name":"returns.md upload and same-hash retry","status":"PASS"},{"name":"returns.md original bytes in private storage","status":"PASS"},{"name":"returns.md bounded processing and ready-state retry","status":"PASS"},{"name":"shipping.md upload and same-hash retry","status":"PASS"},{"name":"shipping.md original bytes in private storage","status":"PASS"},{"name":"shipping.md bounded processing and ready-state retry","status":"PASS"},{"name":"billing.txt upload and same-hash retry","status":"PASS"},{"name":"billing.txt original bytes in private storage","status":"PASS"},{"name":"billing.txt bounded processing and ready-state retry","status":"PASS"}]. Pending processing is not ready semantic retrieval. See metrics/production-ingestion.json; account/document IDs are excluded.

Two-customer API/RLS evidence: [{"name":"customer A sign-in","status":"PASS"},{"name":"customer A hosted role","status":"PASS"},{"name":"customer A role and own API rows","status":"PASS"},{"name":"customer B sign-in","status":"PASS"},{"name":"customer B hosted role","status":"PASS"},{"name":"customer B role and own API rows","status":"PASS"},{"name":"A cannot read B ticket through Supabase REST/RLS","status":"PASS"},{"name":"A cannot reply to B ticket through Next API","status":"PASS"},{"name":"A cannot change own ticket status through Next API","status":"PASS"},{"name":"A existing ticket survives fresh API fetch","status":"PASS"},{"name":"B cannot read A ticket through Supabase REST/RLS","status":"PASS"},{"name":"B cannot reply to A ticket through Next API","status":"PASS"},{"name":"B cannot change own ticket status through Next API","status":"PASS"},{"name":"B existing ticket survives fresh API fetch","status":"PASS"}]. See metrics/production-customer-checks.json. PENDING is not PASS; fresh API fetching is distinct from full browser reload.

Gemini synthetic smoke: [{"name":"actual 768-dimensional embedding","status":"PASS","httpStatus":200,"elapsedMs":1052.5515,"dimensions":768},{"name":"actual bounded answer and supplied citation","status":"PASS","httpStatus":200,"finishReason":"STOP","diagnostic":{"hasAnswer":true,"hasWindow":true,"citations":[1]},"elapsedMs":3457.0815000000002}]. Each operation has n=1 and uses a fictional supplied policy; this is not uploaded-document retrieval or application RAG. No median/p95 AI claim is derived. See metrics/gemini-smoke.json.

The dated production RAG snapshot is reported below; raw hosted-account files remain private. Local timings must not be used as claims about live AI.

Live workflow checks: [{"name":"customer ticket creation and idempotent retry","passed":true},{"name":"customer B cannot read or reply to customer A ticket","passed":true},{"name":"customer cannot escalate role or change ticket status","passed":true},{"name":"agent reply, resolution timestamp and customer persistence","passed":true},{"name":"private conversations exclude other customers and agents","passed":true},{"name":"agent storage works; customer original access and upload denied","passed":true}]. See metrics/production-workflows.json.

## Statistical method and limits

Median is the middle observation (average of the middle pair for even n). p95 is nearest-rank: sorted[ceil(0.95*n)-1]. Timings use performance.now(). Report failures separately, include the first request, and never silently drop slow successes. Raw local samples are in metrics/local.json. The main production run used nine serial cases with 15-second spacing and fresh conversations. Earlier incomplete runs used the spacing recorded in their own conditions; never pool those samples. For n=8 the nearest-rank p95 is the maximum observed successful latency, descriptive rather than a production SLA. End-to-end timings include HTTP, auth, embedding, retrieval, generation and persistence; initial client sign-in/corpus inspection and frontend rendering are excluded.

## Evaluation rubric

Use tests/rag-evaluation.json: four answerable, two unanswerable, two misleading and one action-boundary case. For answerable cases check expected-source retrieval and answer claims against citations. For unanswerable cases require explicit insufficiency with no invented order facts. Misleading questions must not override policies. Action cases must not claim a ticket/refund was created. Retrieval of a related source alone is not correctness. Reviews are explicitly assistant source/app-constraint comparisons, not an independent human assessment. With only three chunks in a top-5 search, source rank is more informative than recall alone.

## Published production snapshot

Measured 2026-10-05T15:31:23.336Z against https://resolvedesk-mocha.vercel.app. Public raw synthetic evidence: metrics/production-rag-evaluation.json, production-customer-checks.json, production-workflows.json and production-ingestion.json. Account IDs, ticket IDs, credentials and private customer screenshots are excluded.

Corpus: **3 ready documents, 3 logical text pages, 3 chunks; 0 uploaded PDF pages**. Embeddings: 768 dimensions, gemini-embedding-2; answers: gemini-3.1-flash-lite. Retrieval: cosine similarity, top 5, threshold 0.35. The expected source ranked first in all four defined answerable cases; this tiny corpus does not establish general retrieval accuracy.

Main run: 9 planned/attempted cases, 8 HTTP 200 responses and 1 HTTP 503 failure. Eight successful request latencies: median **9.82 s**, nearest-rank p95 **13.46 s**. Serial requests, 15-second spacing, fresh conversations and unique IDs, no warmup, first request included. Windows Node 22 client; Vercel Hobby production. HTTP timing includes network, server auth, embedding, retrieval, generation and persistence; initial client sign-in/corpus inspection are excluded. Small-sample p95 is descriptive, not an SLA.

Case 9 subsequently passed in a separate n=1 action-boundary follow-up (11.13 s). Do not combine that timing with the main-run sample or call the main run 9/9 successful. All nine scenarios have successful application outputs across the two runs. Two unanswerable cases abstained without citations; both misleading cases rejected/corrected their premise; action case did not claim a refund or ticket was performed.

Grounding review: assistant comparison against actual policy excerpts and app action constraints, with answer hashes in metrics/grounding-review.json. This is not an independent human study. Source title/page matches were checked for returned citations. Provider logs confirmed generateContent HTTP 503 despite the one bounded transient retry; failures are availability failures, not fabricated answers. Earlier incomplete runs remain summarized in the public evidence. No percentages, business impact, production throughput or uptime claims.

| Prior incomplete attempt (UTC) | Spacing | Attempted | HTTP 200 | Failed |
|---|---:|---:|---:|---:|
| 2026-10-05T15:09:48.558Z | 2 s | 1 | 0 | 1 |
| 2026-10-05T15:13:18.457Z | 2 s | 5 | 4 | 1 |
| 2026-10-05T15:18:37.578Z | 15 s | 3 | 2 | 1 |

## Production browser and authentication checks

Recorded 2026-10-06T18:58:09.763Z; target https://resolvedesk-mocha.vercel.app. See metrics/production-browser-checks.json.

- PASS: Customer A production login, customer navigation and agent controls hidden.
- PASS: Customer A original ticket and session survive browser reload/reopen.
- PASS: Mobile 390×844 Sign out is visible (40px high), clickable and returns to sign-in.
- PASS: Customer B production login and UI excludes customer A ticket.
- PASS: Customer B original ticket and session survive full browser reload.
- PASS: Customer B logout returns to sign-in without deleting tickets.
- PASS: Agent production login exposes ticket status, Knowledge and Analytics.
- PASS: Agent UI reply and In progress → Resolved status persist after full browser reload — Changed only an existing fictional workflow fixture; original A/B tickets preserved.
- PASS: Agent UI policy upload completes and same-hash reuse retains three ready sources — Re-uploaded existing fictional returns.md; fresh embeddings were measured separately on October 5.
- PASS: Production UI RAG answer and expandable returns.md page-1 citation match the policy — One browser smoke case; separate from the nine-case latency sample.
- PASS: Mobile production chat at 390×844 renders answer, source excerpt and composer without horizontal overflow — Visual screenshot reviewed; no claim about other devices or browsers.
- PASS: Production UI unanswerable question abstains with no invented country coverage or citations — Second browser smoke case; no latency sample was collected.
- PASS: Mobile signup/sign-in form at 390×844 is readable with visible controls and no horizontal overflow — Form layout reviewed; actual signup/email confirmation was owner-observed in Chrome.
- PASS: Desktop production demo overview at 1440×900 renders navigation, statistics, sources and tickets without horizontal overflow — Full-page screenshot visually reviewed; fictional statistics remain labelled.
- PASS: Production demo FAQ shows Saved answer label and source citation.
- PASS: Production demo unknown question shows explicit saved-answer fallback at 390×844 — Fictional demo remains distinct from live AI.
- PASS: Mobile Knowledge source cards and upload controls render without horizontal overflow — Production demo layout; live upload behavior was separately tested.
- PASS: Mobile Analytics charts remain readable and label fictional statistics explicitly.
- PASS: Mobile ticket list and confirmation dialog show accessible fields/buttons without horizontal overflow — Dialog inspected and cancelled; no demo or original live ticket changed.

Recorded 2026-10-07 (Asia/Calcutta); target https://resolvedesk-mocha.vercel.app. See metrics/production-auth.json.

- PASS: Site URL is the production origin — Owner verified https://resolvedesk-mocha.vercel.app.
- PASS: Production redirect allowlist entry — Owner verified https://resolvedesk-mocha.vercel.app/**; existing entries preserved.
- PASS: Local redirect allowlist entry — Owner verified http://localhost:3000/**; existing entries preserved.
- PASS: New production signup, confirmation-email return and customer login — Owner completed signup in Chrome with a new email, confirmed the email returned to production and signed in as Customer. This is owner-observed evidence, not an automated inbox check.

## Remaining limits

Intermittent free-provider failures, a three-document corpus, no OCR, no independent human evaluation, single-store permissions, no background ingestion worker, newest-500-ticket/100-document UI limits and untested future-table automatic-RLS behavior bound the claims. Signup/email redirect checks must not be inferred from existing-account API login. Historical embedding HTTP 402 and old answer-model HTTP 404 attempts remain failures of those attempts, even though the later free-tier model checks passed.
