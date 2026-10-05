# ResolveDesk deployment review

Prepared locally on 2026-10-05. Nothing published. Target: a new owner-controlled GitHub repository and new Vercel Hobby project; ₹0, no billing activation, paid fallback or purchased domain.

## Reviewable payload

Next.js app/API routes, local fictional demo data, policy samples, SQL migrations, tests, scripts, package-lock.json and documentation. Live metrics are evidence of specific recorded checks only. Local environment files, node_modules, build output, .git and ignored logs are excluded from Vercel. The demo works with no credentials; live features require configured Supabase and usable free-tier Gemini.

Local Git branch: codex/portfolio-ready. Owner's Git identity and authentication must be used before committing/pushing. No remote or cloud repository has been created. Confirm `.env.local` and `.env.metrics.local` remain ignored before every initial publish. Do not add a secret to source, GitHub Actions or a report.

## Required gates

1. Review the local demo, test results and PROJECT_STATUS.md. Live AI is currently blocked: embedding smoke HTTP 402, answer smoke HTTP 404. Model metadata access alone is not proof of working inference. Keep these failures visible until resolved without paid services.
2. Finish two-customer and agent behavioral checks. Customer A ticket preservation was tested; Customer B reload/API isolation and agent workflows are pending their recorded results.
3. `npm run verify` must pass for final code; use `npm run metrics:report` to refresh actual evidence. `.github/workflows/ci.yml` runs credential-free checks only. This workflow has not yet run on GitHub.
4. Show the owner this payload and latest evidence. Obtain explicit publishing approval before pushing source publicly, creating/importing the Vercel project, or publishing any preview. Vercel Git import/push can trigger deployment automatically.

## After approval only

Use the owner's GitHub account and chosen repository visibility. Use the Next.js preset in Vercel, Node 22.x, `npm run build`, default output directory, Hobby plan and included vercel.app domain. Vercel Hobby commits must be authored by the owner. Enter the five application variables directly in Vercel environment settings; the Gemini key stays server-only. SQL migrations are already owner-reported applied to Supabase and are not run by Vercel. Confirm Auth Site URL/redirects for the deployed URL and repeat auth/isolation/ticket/RAG smoke tests. Never enable paid capacity to get past a quota.

Official references: [Vercel Git integration](https://vercel.com/docs/git), [Vercel Hobby collaboration requirements](https://vercel.com/docs/deployments/troubleshoot-project-collaboration), [GitHub checkout action](https://github.com/actions/checkout).
