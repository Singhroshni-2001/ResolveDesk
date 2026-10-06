# ResolveDesk handoff

Updated: 2026-10-07 (Asia/Calcutta). Read PROJECT_STATUS.md and docs/METRICS_REPORT.md for dated outcomes. Preserve this workspace and its existing deployment.

## Goal, deployment and authorization

A polished backend/full-stack portfolio AI customer-support workspace: independent fictional demo plus authenticated support tickets, agent workflows, private policy ingestion and cited RAG.

- App: https://resolvedesk-mocha.vercel.app
- Demo: https://resolvedesk-mocha.vercel.app/?demo=1
- Source: https://github.com/Singhroshni-2001/ResolveDesk
- Existing branch: codex/portfolio-ready. Existing Vercel project: resolvedesk, team singhroshni-2001.
- ₹0 constraint: existing Supabase Free, Gemini Free and Vercel Hobby only. Never activate billing, upgrade, add AI Gateway or purchase a domain.
- Owner explicitly authorized upload and actual deployment. Do not request publishing approval again for this authorized completion; verify Hobby and screen payload before updates. Do not create replacement projects.

## Architecture and boundaries

Next.js App Router / React / TypeScript / Tailwind. Browser bearer JWT → server route input/identity validation → Supabase PostgreSQL/Auth/Storage with the same caller token/public key → server-only Gemini. SQL RLS enforces ticket/conversation ownership. Only owner SQL grants agent/admin roles; editable signup metadata never grants access. Agents share tickets/policies but cannot read customers' private conversations. No service-role key is required.

TXT/MD/text-PDF originals are private agent-only objects. Bounded extraction preserves page metadata; SHA-256 prevents duplicate documents. Chunks receive normalized 768-dimensional embeddings through resumable bounded processing. Only ready chunks for the configured embedding model enter cosine pgvector retrieval (top 5, threshold 0.35). Schema-validated answers cite server-controlled source metadata or abstain. No model tools perform ticket/refund actions.

Ticket/reply UUIDs make retries idempotent. SQL resolution triggers stamp/clear actual timestamps. Durable SQL counters bound API requests across serverless instances.

## Demo versus live

Demo is fictional Nova Store data and three labelled saved FAQs, with honest unsupported-question fallback. It makes no credential-dependent external requests; tickets/replies/status stay in browser local storage. Demo perspective switching and sample analytics never describe live permissions or business impact.

Live uses actual confirmed Supabase accounts and Gemini. Original customer A/B tickets and the owner-provisioned third support account must remain intact. Fictional workflow fixtures were used for mutations. Owner also verified a new production signup and email-confirmation return in Chrome; its credentials are neither needed nor recorded.

## Important files

- AGENTS.md: conventions and installed Next.js documentation requirement.
- components/desk.tsx / app/globals.css: responsive workspace and demo/live state.
- app/api/: caller-authenticated workspace, tickets, replies/status, documents/process, chat/history.
- lib/domain.ts, config.ts, browser.ts, server.ts: inputs, safe configuration and identity boundaries.
- lib/extract.ts, grounding.ts, gemini.ts: bounded extraction, validated citations, free-tier inference and bounded transient retry.
- supabase/migrations/001_resolvedesk.sql, 002_explicit_access.sql: installed schema/RLS/storage and explicit privileges.
- supabase/verify-settings.sql: read-only inspection. verify-defaults.sql is a rollback-only future-table probe, still untested.
- tests/: 18 unit tests, transactional SQL permissions/storage checks and nine-case RAG definition.
- samples/: three fictional policy files used for measured ingestion/retrieval.
- scripts/: sequential verification, private live-account checks, model smoke, metrics and release screening.
- metrics/production-*.json: public sanitized production evidence. metrics/live*.json: ignored private fixtures.
- docs/METRICS_REPORT.md, RESUME.md, DEPLOYMENT_REVIEW.md, DEMO_WALKTHROUGH.md: methodology, portfolio material and operation.
- docs/evidence/: public fictional/blank-form screenshots; customer-* screenshots remain ignored.
- .github/workflows/ci.yml: credential-free sequential checks; no deployment secrets.

## Configuration and migrations

Five application variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GEMINI_API_KEY, GEMINI_ANSWER_MODEL, GEMINI_EMBEDDING_MODEL. Existing .env.local and production values are configured; preserve them. Dedicated A/B/agent test emails/passwords are privately saved in ignored .env.metrics.local. Do not print, ask for, upload or commit values/tokens.

Both migrations were owner-applied in order. Hosted inspection found eight RLS-enabled public tables and 15 policies (12 public + three storage); explicit restricted permissions and private knowledge bucket matched the migrations. Do not rerun 001. Automatic-RLS/default privilege configuration was inspected; behavior for future tables was not tested.

Owner verified production Site URL https://resolvedesk-mocha.vercel.app and redirect entries https://resolvedesk-mocha.vercel.app/** plus http://localhost:3000/**, preserving existing entries. New signup → email confirmation → production return → Customer login passed by owner observation. Existing A/B/agent login/logout was tested in the built-in browser and direct API.

Gemini actual embeddings/answers/ingestion pass with gemini-embedding-2 (768 dimensions) and gemini-3.1-flash-lite. No pending key setup. Free-service 503/quota failures remain; never enable paid fallback.

## Verification and metrics rules

Current local sequential tests/database/TypeScript/build PASS (18/18 unit tests). Production: 14 customer API checks, six workflow groups, ten ingestion checks; browser evidence records 25 flow/layout checks (19 before the final update plus six on deployed source ee9f951). All 14 customer API checks passed again after deployment. A/B original tickets and a fictional agent reply/status survive full browser reload. Desktop 1440×900 and mobile 390×844 checked in one browser. Owner auth/config evidence is explicitly distinguished from automation. Eight unsuccessful/inconclusive browser automation observations remain recorded with their resolutions.

Actual live corpus: three ready documents / three logical text pages / three chunks / zero uploaded PDF pages. October 5 main nine-case RAG run: eight successful HTTP 200, one 503; successful n=8 median 9.82 s, nearest-rank p95 13.46 s, serial 15-second spacing/no warmup. Separate case-9 follow-up n=1 passed (11.13 s). Expected source ranked first in 4/4 answerable cases; two unanswerable cases abstained. Assistant review is not independent human evaluation.

Preserve earlier incomplete/failed attempts and source hashes. Never merge follow-up timing, demo lookup, local extraction or browser smoke into live latency. No invented percentages, business impact, uptime or general accuracy. Public report reads sanitized snapshots, not ignored fixture files. Resume material must keep these limits.

## Completed release and future maintenance

The existing production app was updated under the owner's explicit authorization, with Hobby confirmed first. Deployed application source: ee9f951aa7261762b97884dd193eb46b0ffbaeef; deployment dpl_5UY2n3X2CUNPKo1JDvNH3jBzBnK8 is READY. Local verification, cloud compilation/TypeScript and application-source GitHub CI PASS. Anonymous production demo returns 200; unauthenticated workspace returns 401. See metrics/production-deployment.json for exact evidence and CI link. Final documentation/report commits can follow the deployed application commit without changing the runtime.

Customer knowledge copy and local-session logout cleanup are deployed and browser-verified. Follow-up confirms agent/customer roles, mobile sign-out, signed-out full reload, preserved original-ticket isolation and a fresh cited Gemini answer. All required completion/account steps are done; no pending credentials or publishing approval. Browser demo remains available and the owner's VS Code server was preserved.

For future work: read the dated reports first; preserve accounts, tickets, ignored secrets and failed measurements; make the requested change; run heavy verification sequentially; screen the payload; verify Hobby before an authorized app deployment; update the existing project and verify production. Optional future work includes a larger independent evaluation, physical-device/cross-browser checks and a rollback-only future-table RLS probe; none is represented as passed.

~~~sh
npm ci
npm run dev
npm run verify
npm run verify:release
npm run metrics:report
~~~

Individual required commands: npm run test, npm run test:db, npm run typecheck, npm run build. npm start runs the built app; do not conflict with the existing port-3000 dev server.

For production tests in PowerShell:

~~~powershell
$env:EVAL_APP_URL = 'https://resolvedesk-mocha.vercel.app'
npm run test:customers
npm run test:live
npm run test:ingestion
$env:EVAL_SPACING_MS = '15000'
npm run metrics:live
npm run metrics:report
~~~

Preserve existing ignored live output under dated names before remeasuring. Use EVAL_CASE_FILTER=9 only for a separate follow-up.

Historical handoff/status are retained under docs/history; do not treat superseded credential/account blockers as current. Limitations: single-store, no OCR/background worker, small corpus, UI caps, no independent human evaluation/SLA, intermittent provider availability and untested future-table RLS behavior.
