# Current deployed state — 2026-10-05

App: https://resolvedesk-mocha.vercel.app
Demo: https://resolvedesk-mocha.vercel.app/?demo=1
GitHub: https://github.com/Singhroshni-2001/ResolveDesk

This section supersedes the historical setup/blocker notes below. Owner explicitly authorized upload and deployment. Vercel account/team singhroshni-2001 was verified as Hobby through billing.plan before deploying. Five production app variables configured privately; no upgrade, billing change, paid integration or AI Gateway.

Verified results:
- Anonymous production page HTTP 200. Production cloud build/TypeScript PASS.
- Local sequential verification: 18/18 unit tests, embedded SQL permission tests, TypeScript and production build PASS. GitHub CI PASS for deployed source b1bfc5c.
- Both-direction production customer isolation: 14 recorded checks PASS. A/B sign-in and customer role, own rows, cross-ticket RLS read denial, API reply denial, own status denial and fresh-fetch ticket persistence. Original A/B tickets retained.
- Six production customer/agent workflow groups PASS: ticket/reply idempotence, role/status denials, agent reply/resolution timestamp, private conversations, and private storage download/upload boundaries.
- Ten live ingestion checks PASS: agent role plus upload/deduplication, original-byte equality, processing and ready-state retry for each of three sample policies. Actual ready corpus: 3 documents / 3 logical text pages / 3 chunks / 0 uploaded PDF pages, 768-dimensional gemini-embedding-2 vectors.
- Main 9-case RAG run: 8 successful HTTP 200 requests, 1 upstream generation HTTP 503 failure despite one bounded retry. Successful n=8 latency median 9.82 s, nearest-rank p95 13.46 s; serial 15-second spacing, no warmup. Failed measurement retained. Case 9 passed separately (n=1, 11.13 s); timings not pooled. Expected policy ranked first in 4/4 answerable cases; both unanswerable cases abstained. Misleading/action scenarios passed assistant source/app-constraint review across the two runs. No independent human evaluation, production SLA, accuracy percentage or business-impact claim.
- Public credential-free evidence in metrics/production-*.json and metrics/grounding-review.json; methodology/results docs/METRICS_REPORT.md. Resume bullets, description and interview explanation docs/RESUME.md.

Supabase: migrations 001_resolvedesk.sql and 002_explicit_access.sql owner-confirmed applied. Eight public tables RLS enabled, 15 policies (12 public + 3 storage), inspected explicit grants and private knowledge bucket. Current hosted behavior passes the production access checks. Future-table automatic-RLS behavior remains untested; enabled trigger/default privilege configuration was inspected previously. Never blindly rerun 001. Agent provisioned by owner SQL; customers unchanged.

Privacy: credential files, .vercel state, raw hosted account/ticket fixtures and customer screenshots stay ignored. Placeholder-only environment examples included. Public evidence excludes account/ticket/document IDs and tokens. Gemini key remains server-only; queries use caller JWT/public Supabase key, no service-role browser key.

Pending owner step: Supabase Authentication URL Configuration Site URL https://resolvedesk-mocha.vercel.app; preserve existing redirects and add https://resolvedesk-mocha.vercel.app/** and http://localhost:3000/** if absent. Owner confirmation pending; new production email-confirmation redirect flow is not independently tested. Browser automation timed out, so production visual/mobile checks remain untested. Earlier local narrow-screen Sign out test passed.

Next steps: confirm the auth URL save; verify a production confirmation link when needed; perform a production visual/mobile smoke test when browser automation is available. Intermittent provider 503 failures remain a free-service availability limitation; demo/saved-answer fallback and tickets remain available. Do not enable paid fallback.

Commands: npm ci; npm run dev; npm run test; npm run test:db; npm run typecheck; npm run build; npm run verify (sequential); npm run test:customers; npm run test:live; npm run test:ingestion; npm run verify:gemini; npm run metrics:local; npm run metrics:live; npm run metrics:report; npm run verify:release. For production tests set EVAL_APP_URL=https://resolvedesk-mocha.vercel.app in the current terminal. EVAL_SPACING_MS=15000 for conservative serial RAG tests; EVAL_CASE_FILTER=9 writes a separate follow-up report. Credentials only in ignored local files. Keep existing VS Code dev server running; no concurrent heavy builds/tests.

## Historical progress notes (superseded where contradicted above)

# ResolveDesk project status

## Mobile sign-out repair — 2026-10-05
Browser inspection found Sign out in the mobile navigation, but it was below the visible viewport and clicking failed. Added a visible text button, sidebar vertical scrolling, fixed top offset and hidden mobile promotional card; sign-out explicitly returns to sign-in and closes the menu. Browser reconnection repeatedly timed out after hot reload, so successful sign-out and updated mobile visual verification are NOT confirmed. npm run verify was started; final results pending. Customer A test ticket was not mutated/deleted; owner VS Code server was not stopped. Resume by verifying the mobile Sign out control, signing out A, leaving the sign-in form for B, and recording final test results.

## Latest live verification — 2026-10-05
- Owner created and confirmed Customer A; browser navigation identifies the live session as Customer, with no agent knowledge/analytics navigation.
- Created fictional ticket `[TEST] Customer A persistence — 2026-10-05`, ID `[private test ticket ID retained locally]`, category Other, status Open. Customer detail shows a reply form and no status-edit control.
- Initial ticket submission timed out at the browser's request limit. Reload initially showed no ticket; a subsequent submission succeeded. Do not count the failed attempt as passed.
- Final reload/persistence check in progress; cross-customer isolation, server-denied customer mutations, agent reply/status and storage behavioral tests remain pending.
- Hosted configuration evidence: both migrations applied (owner reports), eight tables have RLS enabled, all 15 policy names present, visible grants match restricted columns, private knowledge bucket has 1 MB limit and expected MIME types, six RPC/trigger execute permissions match migration 002.
- Owner confirms Data API ON and SQL Editor role postgres. Export shows enabled ensure_rls function enabling RLS on public table creation (logs failures). Postgres defaults omit SELECT/INSERT/UPDATE/DELETE for anon/authenticated but retain Dxtm; supabase_admin defaults remain broad. Future-table behavior was not tested.
- VS Code development server is owner-managed and was left running. No deployment or credential changes.
Updated: 2026-10-05 (Asia/Calcutta). Existing workspace preserved.

## Completed
- Next.js 16 App Router/React 19/TypeScript/Tailwind responsive support workspace: overview, chat, tickets, knowledge and analytics.
- Credential-free fictional demo with three labelled saved answers, exact expandable citations, honest abstention, customer/agent views, ticket creation/replies/status, browser persistence and reset.
- Live email/password auth; server routes verify bearer tokens and use caller JWT with Supabase public key. No service-role key. Owner SQL alone provisions roles.
- Ticket/reply/status persistence routes, private conversation history and source-grounded chat routes.
- Bounded UTF-8 TXT/MD and text-PDF ingestion, page metadata, hash deduplication, resumable missing embeddings, ready-only pgvector retrieval, citation validation and durable request limits.
- Fixed PDF pooled-buffer parsing and swallowed page-error handling; actual PDF regression fixtures now pass.
- Explicit permissions migration 002 saved and tested locally. Read-only settings inspection and rollback-only automatic-default probes saved.
- Safe configuration validation rejects elevated public keys even with missing URL; HTTP timeout and demo/live state handling improved.
- Local/live metrics scripts, agent-only retrieval diagnostic instrumentation and hosted workflow test scripts saved.
- HANDOFF.md saved. Prior status preserved at docs/PROJECT_STATUS_2026-10-04.md. README migration order corrected.

## Exact final verification
Latest npm run verify completed successfully; metrics/verification.json records timestamp, source fingerprint and exit codes. Raw logs are in ignored test-results/.
- npm run test: 18 tests, 18 passed, 0 failed.
- npm run test:db: PASS. Both migrations apply to embedded PostgreSQL with pgvector. Customer isolation, role escalation prevention, agent replies/status, timestamps, private conversations, duplicate IDs, anonymous denial, storage policies, transactional ingestion, ready-only/model-specific retrieval and request limits pass. Supabase auth/storage platform schemas are mocked; this is local evidence.
- npm run typecheck: PASS (exit 0).
- npm run build: PASS (exit 0).
- Local development app started at http://localhost:3000; GET /?demo=1 returned HTTP 200. Restart with npm run dev if the session ends.
- Earlier browser checks passed demo answer/citations, create/reply/resolve/reload persistence, customer visibility and unknown-question abstention. Final 390px visual check remains pending.

## Configuration and hosted checks
No credential values recorded. Existing .env.local was preserved.
- NEXT_PUBLIC_SUPABASE_URL: configured; user identified API Project URL.
- NEXT_PUBLIC_SUPABASE_ANON_KEY: configured.
- GEMINI_API_KEY: missing (placeholder).
- GEMINI_ANSWER_MODEL and GEMINI_EMBEDDING_MODEL: configured defaults; account access unverified.
- .gitignore contains .env* with exceptions only for example files; .env.local and .env.metrics.local are ignored. This folder currently has no Git repository, so no tracked-file Git verification is available.
- User created organisation “Roshni Projects” and a Supabase project.
- Read-only hosted probe: Auth HTTP 200; Data API root HTTP 401; profiles HTTP 404. Neither schema installation nor Data API permissions/settings are confirmed.
- Initial sandbox network probe failed; approved retry reached Auth. No hosted writes were performed.
- 001_resolvedesk.sql: owner reports successful hosted application and eight public tables. 002_explicit_access.sql: owner reports successful hosted application. Owner confirms all eight tables have RLS enabled. Do not rerun 001.
- Intended dashboard settings: Data API enabled, automatic table exposure disabled, automatic RLS enabled. All three remain unverified.
- Gemini key, free-tier/billing state, model access, actual ingestion/answers, hosted auth/RLS/storage and ticket persistence remain pending.
- Earlier PDF failures and test-runner sandbox failure were fixed; no final local check failed.

## Reproducible metrics
docs/METRICS_REPORT.md and metrics/local.json contain actual methodology/raw evidence.
- Local sample corpus: 3 documents, 3 logical text pages, 0 physical PDF pages, 3 chunks; per-file bytes/characters/hashes recorded.
- Demo: 12/12 defined behavior checks; 120 measured saved-answer lookups after per-question warmups.
- Local extraction: 30 measured serial in-memory TXT/MD extractions after per-file warmups.
- Median and nearest-rank p95 recorded with conditions/environment. These timings exclude Gemini, network and rendering.
- Live corpus counts, semantic retrieval results against the 9-question evaluation, human grounding review, live median/p95 and hosted workflows NOT measured. No fabricated percentages or business impact.

## Commands
Node 22.12+; from this workspace:
~~~sh
npm ci
npm run dev
npm run test
npm run test:db
npm run typecheck
npm run build
npm start
npm run verify
npm run verify:connection
npm run verify:models
npm run metrics:local
npm run metrics:report
npm run test:live
npm run metrics:live
~~~
Use dev OR start on port 3000; stop dev before npm start. Live test/measurement commands require dedicated confirmed test accounts entered only in ignored .env.metrics.local using .env.metrics.example, configured Gemini, applied migrations and ready sample documents.

## Next steps in order
1. CURRENT ACCOUNT STEP: run supabase/migrations/002_explicit_access.sql after confirmed 001, then inspect supabase/verify-settings.sql results for all eight tables with RLS, policies and explicit grants. Hosted grants/policies remain unverified until results are returned.
2. Inspect actual dashboard Data API and automatic table exposure/RLS settings. Run supabase/verify-defaults.sql rollback probe. If schema absent apply 001 once, then 002; if base schema exists inspect and apply only pending 002. Re-run settings SQL and connection check.
3. Set local Auth URL, create/confirm one agent and two customer test accounts; owner promotes agent through README SQL. Verify hosted grants/RLS/private storage and workflow tests.
4. Configure server-only GEMINI_API_KEY locally on free tier with billing disabled; verify current free models and run verify:models. Do not ask for secrets in chat.
5. Upload the three sample policies; verify ingestion/resume/deduplication, ready-only citations and known/unknown questions. Run live workflows/evaluation and review grounding; regenerate metrics report.
6. Finish final mobile/browser live checks and rerun required verification after changes.
7. Review deployment payload locally; target Vercel Hobby, ₹0. Obtain explicit publishing approval before any deployment. Nothing has been published.

## Deliberate limits
Single organisation/project; latest 500 tickets and 100 documents; history 30 conversations/50 turns, prompt last 3 turns. No OCR. Upload processing pauses with closed tab; concurrent retries can consume duplicate upstream calls. Interrupted uploads can leave private orphan originals. Free services have quotas; no paid fallback or uptime promise. Citation checks do not prove semantic grounding.

## Policy-count correction
The migrations define 15 policies: 12 on public tables and 3 on storage.objects. Migration 002 creates no policies. The earlier expected count of 17 was incorrect. Owner reports 15 hosted rows; exact names, roles and expressions still await comparison. request_limits intentionally has zero policies and no direct authenticated grants. No corrective hosted changes requested.

## Hosted policy-name verification
Owner confirms the comparison query returned all 15 expected policy names as PRESENT. Screenshot shows matching authenticated roles and visible USING expressions; not all rows/WITH CHECK expressions are visible. Hosted grants and complete policy-expression/behavior verification remain pending. Next account step: read-only table/column grant inventory.

## Hosted grant and INSERT-policy inspection
Owner reports all 57 grant-inventory rows are authenticated. Eight-row summary screenshot matches visible migration 002 table/column permissions: profiles SELECT only, tickets status-only UPDATE, restricted INSERTs, request_limits no grants, agent-governed document/chunk CRUD. Seven INSERT/ALL policy rows target authenticated and visible expressions match migration 001; screenshot clips tails of reply/ticket/turn/storage expressions, so full expressions and hosted behavioral isolation remain unverified. Next read-only inspection: ticket_update and knowledge_agent_read/delete.

## Confirmed Customer A live browser test — 2026-10-05
- PASS: live navigation identified Customer A as Customer; agent-only knowledge/analytics navigation absent. This checks loaded role/UI, not all denied API mutations.
- PASS: fictional Open/Other ticket created: [private test ticket ID retained locally], [TEST] Customer A persistence — 2026-10-05. Initial attempt timed out; after reload showed no ticket, retry succeeded.
- PASS: full tab reload, Go to your workspace, fresh workspace fetch showed exactly one ticket; reopening detail confirmed identical UUID, subject, category, description and status. Sign-in survived reload.
- Evidence screenshot: docs/evidence/customer-a-ticket-persistence.png (ticket detail, no credentials).
- PENDING: customer B isolation, customer denied status/role mutations, agent reply/status and private-storage behavioral checks. No live RAG/latency claim.
- Next required manual step: create/confirm a distinct Customer B using credentials kept local; then return signed in as B for isolation test. Keep existing VS Code server running. No deployment or credential changes.

## Mobile sign-out repair verified — 2026-10-05
Supersedes the pending repair note above. Added labelled Sign out button and scrollable sidebar; mobile sidebar starts below 64px topbar and hides promotional card. Actual Sign out click succeeded in the narrow built-in browser, showing Welcome back with empty Email/Password fields and Sign in action. Customer A ticket remained visible immediately before sign-out and was not mutated/deleted. Browser left at sign-in for customer B; owner VS Code server left running.
Final npm run verify: unit tests 18/18 PASS, embedded DB tests PASS, TypeScript PASS, production build PASS (exit 0). metrics/verification.json contains final source fingerprint; ignored test-results/ contains logs. Evidence: docs/evidence/customer-b-sign-in-ready.png. Cross-customer/agent workflow checks remain pending.

## Current verification — 2026-10-05 (supersedes older setup steps)
- Git initialized locally on codex/portfolio-ready; no remote, commit, push or deployment. Both .env.local and .env.metrics.local confirmed ignored by git check-ignore (.gitignore:3). Customer values mistakenly entered in example were moved into ignored local file without overwriting configured local values; example restored to placeholders.
- Hosted migrations 001 and 002 owner-confirmed applied; eight public tables RLS enabled; 15 policies (12 public + 3 storage), not 17. Visible grants/policies/private 1 MiB knowledge bucket/function privileges match prior inspection. Automatic RLS event trigger enabled; postgres defaults have no automatic CRUD grants. Future-table behavior still untested.
- Customer A prior browser creation/reload persistence PASS; preserved ticket [private test ticket ID retained locally]. B signup/payment ticket owner-reported; latest browser account/reload not verified while browser error page blocked access.
- Automated customer checks FAIL at A sign-in: Supabase HTTP 400 invalid_credentials. No cross-customer mutations were attempted; isolation checks UNTESTED until local account values corrected. Agent placeholders remain; owner provision required.
- New Free-tier Gemini key: embedding PASS HTTP 200 / 768 dimensions. Old 2.5 Flash-Lite generation HTTP 404. Verified free-tier 3.1 Flash-Lite replacement: HTTP 200, synthetic 30-day answer and citation [1] PASS with explicit JSON schema. App answer route now uses schema and 2048-token bound. Single operation samples are not end-to-end RAG latency or accuracy. Raw evidence metrics/gemini-smoke.json; Google pricing https://ai.google.dev/gemini-api/docs/pricing?authuser=2. Billing untouched.
- Live ingestion/RAG evaluation, agent replies/status/storage and B browser persistence remain UNTESTED. Demo remains independent with labelled saved answers.
- Commands: npm run dev (existing VS Code server retained); npm run test; npm run test:db; npm run typecheck; npm run build; npm run verify; npm run test:customers; npm run verify:gemini; npm run test:ingestion; npm run test:live; npm run metrics:local; npm run metrics:live; npm run metrics:report; npm run verify:release.
- Next: correct A credentials privately; rerun customer checks; restore normal localhost browser page for B reload; create/confirm separate support account and owner-provision agent per docs/AGENT_SETUP.md; add agent test credentials locally; run ingestion/workflows/evaluation and review citations; regenerate metrics; review docs/DEPLOYMENT_REVIEW.md and obtain explicit approval before GitHub publication or Vercel import/deploy. All plans remain ₹0.

## Customer isolation rerun — 2026-10-05
Supersedes prior invalid_credentials blocker: corrected A and B sign-ins PASS; hosted customer roles PASS. IPv6 localhost refused the local API; existing server left running and evaluation URL set to IPv4 127.0.0.1:3000. Both directions PASS: Supabase RLS hides the other ticket, Next API rejects cross-ticket replies with 404, own status changes rejected with 403, fresh API fetch retains each original ticket and excludes the other. 14 recorded checks PASS in metrics/live-customers.json. A and B tickets retained, no role changes/deletions. Fresh API persistence is not a browser reload test; latest B browser reload remains untested. Final prior app verification is confirmed in metrics/verification.json: 18/18 unit tests, embedded DB, TypeScript and production build PASS. Current next manual step: create/confirm distinct support account; owner provisioning SQL follows confirmation. Ingestion, agent workflows and live RAG evaluation remain pending that account. No deployment.

Latest local checks: npm run test 18/18 PASS; npm run verify:release PASS (ignored credential files and candidate payload scan). No GitHub publication or Vercel deployment performed.


## Authorized publication and Hobby verification — 2026-10-05
Owner authorized GitHub upload and actual Vercel deployment on free plans. GitHub target https://github.com/Singhroshni-2001/ResolveDesk. Vercel account/team singhroshni-2001 billing.plan confirmed hobby via read-only API. Project resolvedesk linked; all five existing application production variables configured without displaying values. No AI Gateway, upgrade or billing change. All raw hosted-account fixtures and customer screenshots excluded from Git/deployment; credential files ignored. Agent role PASS and earlier agent reply/resolution/customer persistence checks PASS; latest workflow retry and returns.md upload failed; full ingestion/RAG remains unverified. Local unit/DB/TypeScript PASS, production build result pending. No deployment success claimed yet.
