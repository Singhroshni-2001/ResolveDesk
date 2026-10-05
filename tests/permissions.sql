-- Run AFTER migration in Supabase SQL editor. Transaction rolls back all fixtures.
-- This tests actual RLS/grants using authenticated roles, not UI visibility.
begin;
insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000000001','test-a@example.invalid'),('00000000-0000-4000-8000-000000000002','test-b@example.invalid'),('00000000-0000-4000-8000-000000000003','test-agent@example.invalid');
update public.profiles set role='agent' where id='00000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
insert into public.tickets(id,subject,description,category) values('10000000-0000-4000-8000-000000000001','Permission test','A sufficiently long ticket description','Other');
insert into public.conversations(id) values('20000000-0000-4000-8000-000000000001');
insert into public.turns(id,conversation_id,question,answer) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Question?','Answer');
do $$ begin
 if (select count(*) from tickets)<>1 then raise exception 'Own ticket not visible'; end if;
 begin update profiles set role='admin' where id=auth.uid(); raise exception 'ROLE ESCALATION ALLOWED'; exception when insufficient_privilege then null; end;
 begin insert into tickets(id,subject,description,category,customer_id) values(gen_random_uuid(),'Spoofed','A sufficiently long description','Other','00000000-0000-4000-8000-000000000002'); raise exception 'OWNER SPOOF ALLOWED'; exception when insufficient_privilege then null; end;
 update tickets set status='Resolved';
 if exists(select 1 from tickets where status='Resolved') then raise exception 'CUSTOMER STATUS UPDATE ALLOWED'; end if;
 begin insert into documents(id,name,storage_path,content_hash,embedding_model) values(gen_random_uuid(),'Bad','bad','bad','bad'); raise exception 'CUSTOMER DOCUMENT WRITE ALLOWED'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from tickets) or exists(select 1 from conversations) or exists(select 1 from turns) then raise exception 'CROSS CUSTOMER DATA LEAK'; end if;
 begin insert into replies(id,ticket_id,body) values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','Unauthorized reply'); raise exception 'CROSS CUSTOMER REPLY ALLOWED'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
update tickets set status='Resolved' where id='10000000-0000-4000-8000-000000000001';
insert into replies(id,ticket_id,body) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Agent reply');
do $$ begin
 if not exists(select 1 from tickets where status='Resolved' and resolved_at is not null) then raise exception 'AGENT UPDATE FAILED'; end if;
 if exists(select 1 from turns) then raise exception 'AGENT PRIVATE CHAT LEAK'; end if;
 begin insert into replies(id,ticket_id,body) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Duplicate'); raise exception 'DUPLICATE REPLY ALLOWED'; exception when unique_violation then null; end;
end $$;
rollback;
