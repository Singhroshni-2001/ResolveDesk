-- Apply after 001. Safe when automatic Data API table exposure is disabled.
-- Never relies on Supabase's default table/function grants.
begin;
grant usage on schema public, extensions to authenticated;
revoke all on public.profiles, public.tickets, public.replies, public.documents,
 public.chunks, public.conversations, public.turns, public.request_limits from public, anon;
revoke all on public.profiles, public.tickets, public.replies,
 public.conversations, public.turns, public.request_limits from authenticated;
grant select on public.profiles, public.tickets, public.replies,
 public.conversations, public.turns to authenticated;
grant insert(id,subject,description,category) on public.tickets to authenticated;
grant update(status) on public.tickets to authenticated;
grant insert(id,ticket_id,body) on public.replies to authenticated;
grant insert(id) on public.conversations to authenticated;
grant insert(id,conversation_id,question,answer,citations) on public.turns to authenticated;
grant select,insert,update,delete on public.documents,public.chunks to authenticated;
grant usage,select on sequence public.chunks_id_seq to authenticated;

alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.replies enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.turns enable row level security;
alter table public.request_limits enable row level security;

revoke all on function public.is_agent(),public.new_profile(),public.stamp_resolution(),
 public.register_document(uuid,text,text,text,text,jsonb),
 public.match_chunks(extensions.vector,text),public.take_request(text)
 from public,anon,authenticated;
grant execute on function public.is_agent(),
 public.register_document(uuid,text,text,text,text,jsonb),
 public.match_chunks(extensions.vector,text),public.take_request(text) to authenticated;
-- Existing row policies from 001 remain in force, including owner-only chats,
-- agent-only knowledge management and agent-only ticket status changes.
notify pgrst, 'reload schema';
commit;
