# ResolveDesk conventions
- Keep demo independent of credentials and external requests. Label fictional data and saved answers.
- Use Next App Router, TypeScript, Tailwind, Supabase RLS and server routes. No service-role key is needed or permitted in the browser.
- Never derive privileges from user-editable metadata. Roles are provisioned by the project owner in SQL only.
- Validate inputs on the server and enforce ownership in SQL. Keep mutations idempotent.
- Do not publish without explicit owner approval. No paid services or billing activation.
- Run npm run test, npm run typecheck, npm run build after meaningful changes. Record actual results and pending external checks in PROJECT_STATUS.md.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
