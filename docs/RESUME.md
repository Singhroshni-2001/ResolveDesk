# ResolveDesk portfolio material

Live app: https://resolvedesk-mocha.vercel.app
Source: https://github.com/Singhroshni-2001/ResolveDesk

## ATS-friendly resume bullets

- Built and deployed a Next.js/TypeScript support platform on Vercel Hobby with Supabase authentication, RLS across eight tables, private storage, and idempotent ticket APIs.
- Implemented 768-dimensional Gemini/pgvector RAG with document ingestion, citations and abstention; evaluated nine scenarios over three policy documents.
- Verified customer isolation and agent permissions with 14 production API checks, six workflow groups and 18 unit tests; automated SQL, TypeScript and build checks in CI.

## Project description

ResolveDesk is a single-store AI customer-support portfolio application using Next.js App Router, TypeScript, Supabase Auth/PostgreSQL/Storage, pgvector, and Gemini. It combines an independent fictional demo with authenticated tickets, agent replies and resolution workflows, document ingestion, and policy answers with citations. It runs on free plans and is deployed to Vercel Hobby.

## Interview explanation

The browser sends the signed-in user's JWT to server routes. The server validates identity through Supabase, validates inputs, and queries with that same caller token. SQL row-level security enforces ownership; roles come from owner-provisioned profiles, never editable sign-up metadata. Customers own their tickets and private conversations. Agents share tickets and policy-library access, but cannot read another customer's private conversations.

Document ingestion accepts bounded TXT, Markdown, and text PDFs, hashes content for retry/deduplication, chunks extracted pages, and stores normalized 768-dimensional embeddings. Only ready documents with the configured embedding model enter cosine retrieval. Gemini receives retrieved passages as untrusted evidence and returns a schema-constrained answer. Citation IDs are validated against server-controlled source metadata; insufficient evidence produces an explicit abstention.

Ticket and reply UUIDs make retries idempotent. Private originals remain agent-only; customer RAG exposes policy excerpts rather than storage files. The demo is labelled fictional and uses three saved answers, independently of credentials or external requests. Transient AI 5xx responses receive one bounded retry; quota/authentication failures do not trigger a paid fallback, and tickets remain usable during provider failures.

I measured a three-document, three-page, three-chunk live corpus. The main nine-case run returned eight successful responses and one upstream 503; successful-response median was 9.82 seconds and nearest-rank p95 13.46 seconds (n=8, serial, 15-second spacing, no warmup). The remaining action-boundary case passed separately. I report failures and sample conditions rather than claiming production accuracy or business impact. The limitations are a tiny evaluation corpus, intermittent free-provider availability, no OCR, single-store permissions, and no independent human evaluation.
