-- Local harness or Supabase SQL editor. Fictional fixtures roll back.
begin;
insert into auth.users(id,email) values
('00000000-0000-4000-8000-000000000004','storage-agent@example.invalid'),
('00000000-0000-4000-8000-000000000005','storage-customer@example.invalid');
update public.profiles set role='agent' where id='00000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
insert into storage.objects(id,bucket_id,name) values
('50000000-0000-4000-8000-000000000001','knowledge','00000000-0000-4000-8000-000000000004/test-policy.txt');
do $$ begin
 if not exists(select 1 from storage.objects where id='50000000-0000-4000-8000-000000000001') then raise exception 'AGENT STORAGE READ FAILED'; end if;
 begin
  insert into storage.objects(bucket_id,name) values('knowledge','other-user/test.txt');
  raise exception 'STORAGE PREFIX SPOOF ALLOWED';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
do $$ begin
 if exists(select 1 from storage.objects where id='50000000-0000-4000-8000-000000000001') then raise exception 'CUSTOMER ORIGINAL FILE LEAK'; end if;
 begin insert into storage.objects(bucket_id,name) values('knowledge','00000000-0000-4000-8000-000000000005/test.txt'); raise exception 'CUSTOMER UPLOAD ALLOWED'; exception when insufficient_privilege then null; end;
 delete from storage.objects where id='50000000-0000-4000-8000-000000000001';
 begin select count(*) from request_limits; raise exception 'RATE COUNTERS EXPOSED'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$ begin
 if not exists(select 1 from storage.objects where id='50000000-0000-4000-8000-000000000001') then raise exception 'CUSTOMER DELETED AGENT FILE'; end if;
end $$;
delete from storage.objects where id='50000000-0000-4000-8000-000000000001';
do $$ begin if exists(select 1 from storage.objects where id='50000000-0000-4000-8000-000000000001') then raise exception 'AGENT DELETE FAILED'; end if; end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform 1 from public.tickets; raise exception 'ANONYMOUS TICKETS EXPOSED'; exception when insufficient_privilege then null; end;
 begin perform public.is_agent(); raise exception 'ANONYMOUS RPC EXPOSED'; exception when insufficient_privilege then null; end;
end $$;
rollback;
