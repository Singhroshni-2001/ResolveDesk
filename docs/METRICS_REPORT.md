# ResolveDesk measurement report

Generated: 2026-10-05T13:17:49.010Z

## What these results establish

Demo, local and live evidence are separate. Saved-answer lookup speed is not AI latency. Embedded PostgreSQL uses real RLS/grants/pgvector but mocks Supabase-owned auth/storage schemas. No business-impact, accuracy percentage or uptime claims are inferred.

## Reproduction

1. npm ci
2. npm run verify
3. npm run metrics:local
4. npm run metrics:report

Live steps, only after account setup: npm run verify:connection; npm run verify:models; npm run test:live; npm run metrics:live; npm run metrics:report. Use dedicated confirmed test accounts in ignored .env.metrics.local, exactly the three sample policies, and a running production build (npm start). Free-tier dashboards must be checked separately.

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

Source fingerprint: bd52f3201e858158f7ab1093f0bcc7f82a0e9915007f188451b01814eda03b35. Run: 2026-10-05T12:55:49.020Z.

- npm run test: PASS (# tests 18, # pass 18, # fail 0). Evidence: test-results/verify-test.log.
- npm run test:db: PASS. Evidence: test-results/verify-test-db.log.
- npm run typecheck: PASS. Evidence: test-results/verify-typecheck.log.
- npm run build: PASS. Evidence: test-results/verify-build.log.

The database harness applies both migrations and exercises owner isolation, forbidden role escalation, agent replies/status, resolution timestamps, private conversations, duplicate reply IDs, private storage, anonymous denial, ready-only retrieval, model isolation and rate limits. Synthetic vectors test SQL behavior, not Gemini retrieval quality.

## Live measurements

Live sample ingestion: {"documents":0,"logicalPages":0,"chunks":0,"manifest":[]}. Checks: [{"name":"agent configuration","status":"PENDING","reason":"Confirmed owner-provisioned agent credentials required locally; nothing uploaded"}]. Pending processing is not ready semantic retrieval. See metrics/live-ingestion.json.

Customer A browser evidence (not AI latency): [{"name":"loaded role Customer","passed":true},{"name":"fictional ticket creation","passed":true},{"name":"same ticket after full reload and fresh fetch","passed":true},{"name":"no customer status control","passed":true}]. Initial timed-out attempt: [{"name":"initial ticket request","result":"browser timeout; no ticket visible on initial reload; retry succeeded"}]. See metrics/live-customer-a.json and its screenshot.

Two-customer API/RLS evidence: [{"name":"customer A sign-in","status":"PASS"},{"name":"customer A hosted role","status":"PASS"},{"name":"customer A role and own API rows","status":"PASS"},{"name":"customer B sign-in","status":"PASS"},{"name":"customer B hosted role","status":"PASS"},{"name":"customer B role and own API rows","status":"PASS"},{"name":"A cannot read B ticket through Supabase REST/RLS","status":"PASS"},{"name":"A cannot reply to B ticket through Next API","status":"PASS"},{"name":"A cannot change own ticket status through Next API","status":"PASS"},{"name":"A existing ticket survives fresh API fetch","status":"PASS"},{"name":"B cannot read A ticket through Supabase REST/RLS","status":"PASS"},{"name":"B cannot reply to A ticket through Next API","status":"PASS"},{"name":"B cannot change own ticket status through Next API","status":"PASS"},{"name":"B existing ticket survives fresh API fetch","status":"PASS"}]. See metrics/live-customers.json. PENDING is not PASS; fresh API fetching is distinct from full browser reload.

Gemini synthetic smoke: [{"name":"actual 768-dimensional embedding","status":"PASS","httpStatus":200,"elapsedMs":1052.5515,"dimensions":768},{"name":"actual bounded answer and supplied citation","status":"PASS","httpStatus":200,"finishReason":"STOP","diagnostic":{"hasAnswer":true,"hasWindow":true,"citations":[1]},"elapsedMs":3457.0815000000002}]. Each operation has n=1 and uses a fictional supplied policy; this is not uploaded-document retrieval or application RAG. No median/p95 AI claim is derived. See metrics/gemini-smoke.json.

**Not measured.** Hosted corpus counts, Gemini retrieval results, grounded-answer quality, and live median/p95 latency remain pending credentials, migration application, sample ingestion and test accounts. Do not use local timings as resume claims about live AI.

Live authentication/customer/agent/storage/ticket workflow verification: pending.

Connection probe: {"checkedAt":"2026-10-05T05:59:41.139Z","configuration":"present","authReachable":true,"dataApiReachable":false,"anonymousProfileAccessDenied":false,"automaticExposure":"requires dashboard/SQL verification","automaticRls":"requires dashboard/SQL verification","authReachableStatus":200,"dataApiReachableStatus":401,"profileProbeStatus":404}. A reachable Data API does not prove automatic-exposure or automatic-RLS settings.

## Statistical method and limits

Median is the middle observation (average of the middle pair for even n). p95 is nearest-rank: sorted[ceil(0.95*n)-1]. Timings use performance.now(). Report failures separately, include the first request, and never silently drop slow successes. Raw local samples are in metrics/local.json. Live evaluation is nine serial cases with 2-second spacing and fresh conversations; its small-sample p95 is descriptive, not a production SLA. End-to-end live timings include HTTP, auth, embedding, retrieval, generation and persistence. Optional agent-only diagnostics expose internal stages, not frontend render timing.

## Evaluation rubric

Use tests/rag-evaluation.json. For answerable cases check the expected source is retrieved AND manually verify all answer claims against citations. For unanswerable cases require explicit insufficiency with no invented order facts. Misleading questions must not override policies. Action-boundary cases must not claim a ticket/refund was created. Retrieval of a related source alone is not answer correctness. Record manual verdicts in metrics/live.json only after reviewing actual outputs.
