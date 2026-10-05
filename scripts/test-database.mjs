import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
// Test only: mock Supabase-owned schemas, while running real Postgres RLS/grants/vector.
const db = new PGlite({ extensions: { vector } });
try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
 grant usage on schema auth,public,storage,extensions to authenticated,anon;
 grant select,insert,delete on storage.objects to authenticated;
 `);
  await db.exec(
    await readFile("supabase/migrations/001_resolvedesk.sql", "utf8"),
  );
  await db.exec(await readFile('supabase/migrations/002_explicit_access.sql','utf8'));
  console.log(
    "PASS: complete migration applies to embedded PostgreSQL with pgvector.",
  );
  await db.exec(await readFile("tests/permissions.sql", "utf8"));
  await db.exec(await readFile('tests/storage-permissions.sql','utf8'));
  console.log(
    "PASS: actual SQL customer isolation, role escalation prevention, agent status/replies, timestamps, private conversations, duplicate reply constraints, anonymous denial and private storage policies.",
  );
  await db.exec(
    `insert into auth.users values('00000000-0000-4000-8000-000000000001','agent@example.invalid'); update profiles set role='agent'; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);`,
  );
  const id = "10000000-0000-4000-8000-000000000002";
  await db.query(
    `select register_document($1,'Test policy','path','hash','gemini-embedding-2',$2::jsonb)`,
    [
      id,
      JSON.stringify([
        {
          content: "Returns are accepted for thirty days after delivery.",
          page: 1,
        },
      ]),
    ],
  );
  const v = JSON.stringify([1, ...Array(767).fill(0)]);
  await db.query("update chunks set embedding=$1::extensions.vector", [v]);
  const pending = await db.query(
    "select * from match_chunks($1::extensions.vector,$2)",
    [v, "gemini-embedding-2"],
  );
  assert.equal(pending.rows.length, 0);
  await db.query("update documents set status='ready'");
  const ready = await db.query(
    "select * from match_chunks($1::extensions.vector,$2)",
    [v, "gemini-embedding-2"],
  );
  assert.equal(ready.rows.length, 1);
  assert.equal(ready.rows[0].page, 1);
  assert.equal(
    (
      await db.query("select * from match_chunks($1::extensions.vector,$2)", [
        v,
        "wrong-model",
      ])
    ).rows.length,
    0,
  );
  for (let i = 0; i < 20; i++)
    assert.equal(
      (await db.query("select take_request('chat') as allowed")).rows[0]
        .allowed,
      true,
    );
  assert.equal(
    (await db.query("select take_request('chat') as allowed")).rows[0].allowed,
    false,
  );
  console.log(
    "PASS: transactional ingestion, ready-only retrieval, model isolation and durable request limits.",
  );
  console.log(
    "This is a local PostgreSQL test with mocked auth/storage schemas, not a deployed Supabase integration test.",
  );
} finally {
  await db.close();
}
