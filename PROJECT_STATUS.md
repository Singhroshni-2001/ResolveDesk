# ResolveDesk project status

Updated: 2026-10-07 (Asia/Calcutta). Existing workspace, accounts, original A/B tickets and cloud projects preserved.

- Production: https://resolvedesk-mocha.vercel.app
- Credential-free demo: https://resolvedesk-mocha.vercel.app/?demo=1
- GitHub: https://github.com/Singhroshni-2001/ResolveDesk

## Completed and verified

- Next.js App Router / React / TypeScript / Tailwind workspace: overview, chat, tickets, knowledge and analytics. Fictional demo uses three explicitly labelled saved answers and browser-local workflows independently of credentials.
- Live Supabase email/password auth; server validates caller JWT and inputs. Owner SQL provisions roles. No service-role key, paid service, billing activation or AI Gateway.
- Production API evidence: 14 customer sign-in/role/ownership/isolation/denied-mutation/persistence checks and six customer/agent workflow groups PASS. Ticket/reply retries are idempotent; agent replies/status/resolution timestamps and private conversations/storage boundaries pass.
- Ingestion: ten hosted checks PASS. Three ready fictional policy documents, three logical text pages, three chunks, zero uploaded PDF pages; normalized 768-dimensional gemini-embedding-2 vectors. SHA-256 deduplication, bounded resumable processing and ready/model-filtered pgvector retrieval.
- Browser: 25 recorded checks PASS (19 before the update, six follow-up checks on deployed source ee9f951). A and B original tickets survive full browser reload; agent reply and In progress → Resolved survive reload on a fictional fixture. Mobile Sign out is visible and usable; the updated logout remains signed out after full reload. Same-hash policy upload retains three ready sources. Live answers open matching returns.md page-1 excerpts; an unanswerable Iceland question abstains with no citation.
- Visual checks: one built-in Chromium browser, desktop 1440×900 and mobile 390×844. Desktop overview and mobile auth/chat/citations/knowledge/analytics/ticket form inspected; no horizontal overflow in checked views. Screenshots contain only fictional policies/demo data or blank signup fields.
- Supabase production Site URL and production/local redirect entries saved/verified by owner. Owner completed new production signup, email confirmation returning to the production origin, and login as Customer in Chrome. This inbox/settings evidence is owner-observed, not agent dashboard automation. See metrics/production-auth.json.
- Current sequential local verification: npm run test (18/18), npm run test:db, npm run typecheck and npm run build PASS. Exact run time/source fingerprint/exit codes are in metrics/verification.json. Embedded SQL tests use real RLS/pgvector and mocked Supabase platform schemas.
- Public metrics now consume sanitized production snapshots. Credential files and raw hosted fixtures remain ignored. Release screening compares token patterns/current private values against candidate source and reachable Git patches; no matched values are printed.

## Measured RAG results and failures

October 5 main run: nine attempted scenarios, eight HTTP 200 and one HTTP 503 despite one bounded transient retry. Successful n=8: median 9.82 s, nearest-rank p95 13.46 s. Serial, 15-second spacing, fresh conversations, unique IDs, no warmup; first request included. Failed n=1: 7.13 s. Separate case-9 follow-up n=1: HTTP 200, 11.13 s; never pooled into n=8.

Expected source ranked first in 4/4 answerable cases on the three-document corpus. Two unanswerable cases abstained. Misleading/action cases were compared against sources/app constraints by the assistant, not an independent human evaluator. Earlier incomplete runs (1/0+1, 5/4+1, 3/2+1 attempted/success+failure) remain retained. Historical old-key embedding 402 and old answer-model 404 are not relabelled passes. October 7 browser RAG smoke (two pre-update cases plus one post-update cited answer) is separate from latency measurement.

Methodology, sample sizes, hashes, local/demo timings, exact results and failures: docs/METRICS_REPORT.md, metrics/production-*.json, metrics/grounding-review.json. Raw metrics/live*.json and customer screenshots remain local. Browser locator/reload/screenshot timeouts are retained in production-browser-checks.json; successful subsequent observations do not erase those attempts.

## Supabase and Gemini state

Owner applied migrations in this order:
1. supabase/migrations/001_resolvedesk.sql
2. supabase/migrations/002_explicit_access.sql

Hosted evidence: eight public tables with RLS; 15 policies (12 public + three storage), not 17; restricted table/column/RPC permissions; private knowledge bucket (1 MB, TXT/MD/PDF MIME allowlist). Data API works. postgres defaults omit automatic CRUD for anon/authenticated; enabled ensure_rls trigger was inspected. Future-table automatic-RLS behavior remains untested. Do not rerun 001 on the installed schema.

Gemini is configured server-side and working: gemini-3.1-flash-lite answers and gemini-embedding-2 (768 dimensions). Actual inference and ingestion, rather than model metadata alone, establish these checks. Keep the existing free-tier project; provider failures/quotas remain possible.

## Final deployment and follow-up

Application source ee9f951aa7261762b97884dd193eb46b0ffbaeef is deployed to the existing Vercel project; deployment dpl_5UY2n3X2CUNPKo1JDvNH3jBzBnK8 is READY with the same public URL. Cloud compilation/TypeScript and [GitHub CI](https://github.com/Singhroshni-2001/ResolveDesk/actions/runs/37521546770) PASS. Fresh read-only verification confirmed the linked team's Hobby plan; no billing changes. Anonymous demo HTTP 200 and unauthenticated workspace HTTP 401 PASS.

Two deployed UI fixes pass: customer overview gives accurate policy guidance while RLS hides document metadata; logout clears auth/workspace state, handles errors and uses local-session scope. Six follow-up browser checks pass, including agent/customer login, mobile logout, signed-out reload, original-ticket isolation and a newly generated answer with an expanded matching citation. All 14 customer API checks passed again at 2026-10-06T20:02:56.104Z. The previous October 5 customer snapshot remains preserved. Eight unsuccessful/inconclusive browser automation observations remain recorded with resolutions rather than erased.

Implementation and required production verification are complete. No manual account action or Gemini setup remains pending. Final reports and screenshots accompany the source on the existing GitHub branch; later documentation/report commits do not require rebuilding the unchanged application. Exact deployment/CI and follow-up evidence: metrics/production-deployment.json, production-browser-checks.json and production-customer-checks.json.

Next steps for a future maintainer, in order: inspect these dated reports; preserve environment files/data; make any intended change; run sequential verification and release screening; verify Hobby before an authorized app update; deploy to the existing project; record fresh production checks. Larger independent RAG evaluation, physical-device/cross-browser coverage and a future-table RLS probe are optional extensions, not passed checks.

## Commands

Node 22.12+; run from the project directory. Keep the owner's VS Code dev server running.

~~~sh
npm ci
npm run dev
npm run test
npm run test:db
npm run typecheck
npm run build
npm run verify
npm run verify:release
npm run verify:gemini
npm run test:customers
npm run test:live
npm run test:ingestion
npm run metrics:local
npm run metrics:live
npm run metrics:report
~~~

npm run verify runs tests, database, TypeScript and build sequentially. npm start serves a completed production build; use a different port or stop only a server you own if port 3000 is occupied.

~~~powershell
$env:EVAL_APP_URL = 'https://resolvedesk-mocha.vercel.app'
$env:EVAL_SPACING_MS = '15000'
npm run test:customers
npm run test:live
npm run test:ingestion
npm run metrics:live
~~~

Run each live command separately; preserve previous raw measurements before repeating. Dedicated account values go only in ignored .env.metrics.local. All five app settings already exist privately in .env.local and Vercel production; never overwrite or print them. EVAL_CASE_FILTER=9 produces a separate follow-up file.

## Limitations

Single-store portfolio, not multi-tenant SaaS; no OCR or background ingestion worker; newest 500 tickets / 100 documents in UI; small corpus/evaluation; no independent human review, SLA or business-impact claim. Intermittent free-provider 503/quota failures remain visible. Tickets and the credential-free demo remain available during AI failures. Desktop/mobile checks cover one browser and two viewport sizes, not physical devices or every browser.

Older notes were preserved in docs/history/PROJECT_STATUS_2026-10-05.md, docs/history/HANDOFF_2026-10-05.md and docs/PROJECT_STATUS_2026-10-04.md. They are historical; this file is authoritative.
