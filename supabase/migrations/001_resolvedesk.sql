-- Run once in a NEW Supabase project's SQL editor. No service role key required.
create extension if not exists vector with schema extensions;
create table public.profiles(id uuid primary key references auth.users on delete cascade, role text not null default 'customer' check(role in ('customer','agent','admin')));
create function public.is_agent() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and role in ('agent','admin')); $$;
create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id) values(new.id); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_agent());
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;

create table public.tickets(id uuid primary key,customer_id uuid not null default auth.uid() references auth.users,subject text not null check(length(btrim(subject)) between 4 and 140),description text not null check(length(btrim(description)) between 10 and 4000),category text not null check(category in ('Orders','Returns','Billing','Account','Other')),status text not null default 'Open' check(status in ('Open','In progress','Resolved')),created_at timestamptz not null default now(),resolved_at timestamptz);
create index tickets_customer on public.tickets(customer_id,created_at desc);
alter table public.tickets enable row level security;
create policy ticket_read on public.tickets for select to authenticated using(customer_id=auth.uid() or public.is_agent());
create policy ticket_create on public.tickets for insert to authenticated with check(customer_id=auth.uid() and status='Open' and resolved_at is null);
create policy ticket_update on public.tickets for update to authenticated using(public.is_agent()) with check(public.is_agent());
revoke all on public.tickets from anon,authenticated;
grant select on public.tickets to authenticated;
grant insert(id,subject,description,category) on public.tickets to authenticated;
grant update(status) on public.tickets to authenticated;
create function public.stamp_resolution() returns trigger language plpgsql set search_path=public as $$ begin if new.status is distinct from old.status then new.resolved_at=case when new.status='Resolved' then now() else null end; end if; return new; end; $$;
create trigger ticket_resolution before update on public.tickets for each row execute function public.stamp_resolution();

create table public.replies(id uuid primary key,ticket_id uuid not null references public.tickets on delete cascade,author_id uuid not null default auth.uid() references auth.users,body text not null check(length(btrim(body)) between 1 and 4000),created_at timestamptz not null default now());
create index replies_ticket on public.replies(ticket_id,created_at);
alter table public.replies enable row level security;
create policy reply_read on public.replies for select to authenticated using(exists(select 1 from public.tickets t where t.id=ticket_id));
create policy reply_create on public.replies for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.tickets t where t.id=ticket_id));
revoke all on public.replies from anon,authenticated;
grant select on public.replies to authenticated;
grant insert(id,ticket_id,body) on public.replies to authenticated;

create table public.documents(id uuid primary key,owner_id uuid not null default auth.uid() references auth.users,name text not null check(length(name) between 1 and 150),storage_path text not null unique,content_hash text not null unique,status text not null default 'processing' check(status in ('processing','ready','failed')),error text,embedding_model text not null,created_at timestamptz not null default now());
create table public.chunks(id bigint generated always as identity primary key,document_id uuid not null references public.documents on delete cascade,ordinal integer not null,content text not null check(length(content) between 30 and 1100),page integer not null check(page between 1 and 20),embedding extensions.vector(768),unique(document_id,ordinal));
create index chunks_document on public.chunks(document_id);
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
create policy documents_agent on public.documents for all to authenticated using(public.is_agent()) with check(public.is_agent());
create policy chunks_agent on public.chunks for all to authenticated using(public.is_agent()) with check(public.is_agent());
revoke all on public.documents,public.chunks from anon,authenticated;
grant select,insert,update,delete on public.documents,public.chunks to authenticated;
grant usage,select on sequence public.chunks_id_seq to authenticated;
-- A single transaction creates metadata and all pending passages. Retries use the hash.
create function public.register_document(doc_id uuid,doc_name text,path text,hash text,model text,passages jsonb) returns uuid language plpgsql security invoker set search_path=public as $$
begin
 if not public.is_agent() then raise exception 'Forbidden'; end if;
 if jsonb_array_length(passages) not between 1 and 40 then raise exception 'Invalid passage count'; end if;
 insert into documents(id,name,storage_path,content_hash,embedding_model) values(doc_id,doc_name,path,hash,model);
 insert into chunks(document_id,ordinal,content,page) select doc_id,(ord-1)::int,p->>'content',(p->>'page')::int from jsonb_array_elements(passages) with ordinality as x(p,ord);
 return doc_id;
end; $$;
create function public.match_chunks(query_embedding extensions.vector(768),model text) returns table(content text,page integer,title text,similarity double precision) language sql stable security definer set search_path=public,extensions as $$
 select c.content,c.page,d.name,1-(c.embedding <=> query_embedding) from chunks c join documents d on d.id=c.document_id where auth.uid() is not null and d.status='ready' and d.embedding_model=model and c.embedding is not null and 1-(c.embedding <=> query_embedding)>0.35 order by c.embedding <=> query_embedding limit 5;
$$;

create table public.conversations(id uuid primary key,customer_id uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now());
create table public.turns(id uuid primary key,conversation_id uuid not null references public.conversations on delete cascade,question text not null check(length(question) between 2 and 1500),answer text not null check(length(answer)<=8000),citations jsonb not null default '[]',created_at timestamptz not null default now());
create index turns_conversation on public.turns(conversation_id,created_at);
alter table public.conversations enable row level security;
alter table public.turns enable row level security;
create policy conversation_own on public.conversations for select to authenticated using(customer_id=auth.uid());
create policy conversation_create on public.conversations for insert to authenticated with check(customer_id=auth.uid());
create policy turn_read on public.turns for select to authenticated using(exists(select 1 from conversations c where c.id=conversation_id));
create policy turn_create on public.turns for insert to authenticated with check(exists(select 1 from conversations c where c.id=conversation_id));
revoke all on public.conversations,public.turns from anon,authenticated;
grant select on public.conversations,public.turns to authenticated;
grant insert(id) on public.conversations to authenticated;
grant insert(id,conversation_id,question,answer,citations) on public.turns to authenticated;

-- Shared durable limits: no reliance on a single Vercel process. Rows roll over in place.
create table public.request_limits(scope text not null,action text not null,window_start timestamptz not null,hits int not null,primary key(scope,action));
alter table public.request_limits enable row level security;
revoke all on public.request_limits from anon,authenticated;
create function public.take_request(action_name text) returns boolean language plpgsql security definer set search_path=public as $$
declare user_limit int; global_limit int; user_hits int; global_hits int; window_time timestamptz=date_trunc('hour',now());
begin
 if auth.uid() is null then return false; end if;
 if action_name='chat' then user_limit=20; global_limit=100;
 elsif action_name='upload' then user_limit=10; global_limit=40;
 elsif action_name='embed' then user_limit=100; global_limit=200;
 elsif action_name='ticket' then user_limit=30; global_limit=300;
 elsif action_name='reply' then user_limit=60; global_limit=600;
 else return false; end if;
 if action_name in ('upload','embed') and not public.is_agent() then return false; end if;
 insert into request_limits values('global',action_name,window_time,1) on conflict(scope,action) do update set hits=case when request_limits.window_start=window_time then request_limits.hits+1 else 1 end,window_start=window_time returning hits into global_hits;
 insert into request_limits values(auth.uid()::text,action_name,window_time,1) on conflict(scope,action) do update set hits=case when request_limits.window_start=window_time then request_limits.hits+1 else 1 end,window_start=window_time returning hits into user_hits;
 return user_hits<=user_limit and global_hits<=global_limit;
end; $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('knowledge','knowledge',false,1048576,array['text/plain','text/markdown','application/pdf']);
create policy knowledge_agent_read on storage.objects for select to authenticated using(bucket_id='knowledge' and public.is_agent());
create policy knowledge_agent_insert on storage.objects for insert to authenticated with check(bucket_id='knowledge' and public.is_agent() and (storage.foldername(name))[1]=auth.uid()::text);
create policy knowledge_agent_delete on storage.objects for delete to authenticated using(bucket_id='knowledge' and public.is_agent());

revoke all on function public.is_agent(),public.new_profile(),public.stamp_resolution(),public.register_document(uuid,text,text,text,text,jsonb),public.match_chunks(extensions.vector,text),public.take_request(text) from public,anon;
grant execute on function public.is_agent(),public.register_document(uuid,text,text,text,text,jsonb),public.match_chunks(extensions.vector,text),public.take_request(text) to authenticated;
