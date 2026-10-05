-- SETTING PROBE: creates a temporary test table then rolls everything back.
-- Use the same SQL-editor role as migrations (normally postgres).
-- Expected: automatic_rls_enabled=true, anon/authenticated grants=false.
begin;
create table public.resolvedesk_setup_probe_20261004(id integer);
select relrowsecurity as automatic_rls_enabled
from pg_class where oid='public.resolvedesk_setup_probe_20261004'::regclass;
select role_name,has_table_privilege(role_name,'public.resolvedesk_setup_probe_20261004','SELECT') as select_granted,
has_table_privilege(role_name,'public.resolvedesk_setup_probe_20261004','INSERT') as insert_granted,
has_table_privilege(role_name,'public.resolvedesk_setup_probe_20261004','UPDATE') as update_granted,
has_table_privilege(role_name,'public.resolvedesk_setup_probe_20261004','DELETE') as delete_granted
from (values ('anon'),('authenticated')) r(role_name);
rollback;
