# ResolveDesk deployment record

- Production: https://resolvedesk-mocha.vercel.app
- Demo: https://resolvedesk-mocha.vercel.app/?demo=1
- GitHub: https://github.com/Singhroshni-2001/ResolveDesk

The owner explicitly authorized upload and deployment. The existing Vercel project and Supabase data are preserved. Vercel team `singhroshni-2001` was verified as Hobby through the read-only teams API (`metrics/vercel-plan.json`). Supabase and Gemini use the owner's existing free services. No billing activation, upgrade, AI Gateway, purchased domain or paid fallback.

## Final verified update

Application source `ee9f951aa7261762b97884dd193eb46b0ffbaeef` was deployed to the existing project. Deployment `dpl_5UY2n3X2CUNPKo1JDvNH3jBzBnK8` is READY and the stable alias remains unchanged. Local sequential verification, the Vercel cloud compilation/TypeScript check and [application-source GitHub CI](https://github.com/Singhroshni-2001/ResolveDesk/actions/runs/37521546770) passed.

Post-update evidence: anonymous public demo HTTP 200; anonymous workspace HTTP 401; 14/14 customer API/RLS checks; six browser follow-ups covering roles, mobile logout, signed-out reload, customer copy/isolation and a fresh cited Gemini answer. Overall browser evidence contains 25 passed checks across the original and follow-up sessions, with unsuccessful/inconclusive automation observations retained. Owner-observed new signup/email confirmation and Supabase URL settings are reported separately.

See `metrics/production-deployment.json`, `production-customer-checks.json`, `production-browser-checks.json` and `production-auth.json` for dated results. Final documentation/report commits follow the application commit without changing the deployed runtime. CLI deployment remains separate from GitHub Actions; automatic Git deployment was not configured. There is no outstanding owner account step.

## Payload and credentials

Published source includes the Next.js application/API routes, fictional demo/policies, SQL migrations, tests, lockfile, scripts and sanitized evidence. `.env.local`, `.env.metrics.local`, production verification env files, `.vercel`, raw `metrics/live*.json`, customer screenshots, logs and build artifacts are excluded. Only placeholder configuration examples are public. Gemini runs server-side; Supabase calls use the public key plus the caller's validated JWT, never a service-role key.

`npm run verify:release` checks ignored env files, token patterns, privately configured credential values in candidate source/reachable Git patches, and private hosted fixture IDs in candidate source. Matches are never printed. It does not prove that unknown/encoded credentials are absent; review staged paths and documentation before each upload.

## Repeat an approved update

Keep the existing owner login, repository, branch and linked Vercel project. Run all heavy checks sequentially:

```sh
npm ci
npm run verify
npm run metrics:report
npm run verify:release
```

Review the diff, commit and push the existing `codex/portfolio-ready` branch. GitHub Actions verifies the credential-free build; production updates use the official Vercel CLI against the existing Hobby team/project:

```sh
npm exec --offline --package=vercel -- vercel deploy --prod --yes --scope singhroshni-2001
```

Verify Hobby again before deployment. Do not replace or recreate the project. Configure the five app values privately in the existing Vercel production environment only; changing public variables requires a rebuild. SQL migrations are applied separately and must not be blindly rerun.

After deployment verify the stable alias, login/logout, original-ticket persistence, customer/agent boundaries and a cited policy answer. Preserve old failed metrics runs rather than overwriting or pooling them. The current dated results and outstanding checks are in `PROJECT_STATUS.md`, `HANDOFF.md` and `docs/METRICS_REPORT.md`.
