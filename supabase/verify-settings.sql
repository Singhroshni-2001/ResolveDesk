-- READ ONLY. Run after the migrations. Results contain no API keys or user data.
-- This checks database facts, not the dashboard Data API toggle.
select c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
 ('profiles','tickets','replies','documents','chunks','conversations','turns','request_limits')
order by c.relname;

select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' or (schemaname='storage' and policyname like 'knowledge_%')
order by schemaname,tablename,policyname;

select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')
order by table_name,grantee,privilege_type;
select grantee,table_name,column_name,privilege_type from information_schema.column_privileges
where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')
and privilege_type in ('INSERT','UPDATE') order by table_name,grantee,column_name;

-- Automatic exposure: inspect owner-specific defaults. Empty rows alone are NOT
-- proof: confirm with the rollback-only future-table probe in verify-defaults.sql.
select pg_get_userbyid(d.defaclrole) as owner,n.nspname as schema_name,
 d.defaclobjtype as object_type,d.defaclacl::text as default_acl
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
where n.nspname='public' or d.defaclnamespace=0;

-- Automatic RLS: enabled event triggers and definitions. Confirm that the enabled
-- trigger actually enables RLS, using the rollback-only probe below.
select e.evtname,e.evtenabled,pg_get_functiondef(e.evtfoid) as definition
from pg_event_trigger e where e.evtname ilike '%rls%';

select id,public,file_size_limit,allowed_mime_types
from storage.buckets where id='knowledge';
