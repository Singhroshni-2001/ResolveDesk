# Minimal agent setup

Preserve customers A and B and their tickets. Do not promote either customer.

1. Create one separate support account through ResolveDesk and confirm its email. Use another browser session so B can remain signed in in the built-in browser. Account creation/credentials are completed by the owner privately. Keep billing disabled on all providers.
2. In Supabase Authentication → Users, copy only this support account's user UUID. In SQL Editor, owner runs the following statement after replacing the placeholder with that UUID:

```sql
UPDATE public.profiles
SET role = 'agent'
WHERE id = 'REPLACE_WITH_CONFIRMED_SUPPORT_USER_UUID'::uuid
RETURNING id, role;
```

Expected exactly one row with role agent. Zero rows means stop and check UUID/profile creation. This expands knowledge and shared-ticket permissions, so only the project owner provisions it. Never use editable sign-up metadata or put role-management controls in the app.

3. Enter that account's email/password only in EVAL_AGENT_EMAIL and EVAL_AGENT_PASSWORD in ignored .env.metrics.local. Do not send them to chat. The public URL/key and server-only Gemini key stay in .env.local.
4. With the local app running, run `npm run test:live` for real agent replies/status, two-customer isolation and private-storage checks. Run `npm run test:ingestion` to upload the three fictional sample policies and test same-hash retries and stored originals. Processing runs only after actual Gemini smoke passed; it never enables billing and does not delete existing documents.
5. Once all three policies are ready, run `npm run metrics:live` and review answers/citations against tests/rag-evaluation.json. Generate the report using `npm run metrics:report`. Record failed and untested checks; model metadata and successful upload alone are not working RAG.
