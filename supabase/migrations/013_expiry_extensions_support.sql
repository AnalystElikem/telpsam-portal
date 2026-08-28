-- ==========================================================================
-- Migration 013: time-bound mentorships (3 months), 2-week extensions on
-- request, and a member <-> coordinators chat channel.
-- Run in the SQL editor. Safe to re-run.
-- ==========================================================================

-- 1. Mentorships expire 3 months after they start. Backfill existing rows.
alter table public.mentorships add column if not exists expires_at timestamptz;
update public.mentorships
  set expires_at = created_at + interval '3 months'
  where expires_at is null;

-- 2. Extension requests. Either participant may ask to continue; a coordinator
--    approves (adds 2 weeks) or declines.
create table if not exists public.extension_requests (
  id            uuid primary key default gen_random_uuid(),
  mentorship_id uuid not null references public.mentorships(id) on delete cascade,
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at    timestamptz not null default now(),
  resolved_by   uuid references public.profiles(id),
  resolved_at   timestamptz
);

alter table public.extension_requests enable row level security;
drop policy if exists "participant create extension" on public.extension_requests;
drop policy if exists "participant read own extension" on public.extension_requests;
drop policy if exists "admin extension all" on public.extension_requests;
create policy "participant create extension" on public.extension_requests for insert
  with check (requester_id = auth.uid() and public.in_mentorship(mentorship_id));
-- Either participant can see the extension state of their shared mentorship.
create policy "participant read extension" on public.extension_requests for select
  using (public.in_mentorship(mentorship_id));
create policy "admin extension all" on public.extension_requests for all using (public.is_admin());

-- 3. Member <-> coordinators chat. Any coordinator can reply; the member is
--    never told which one (replies show as "the Program Coordinators").
create table if not exists public.support_messages (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.profiles(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  from_coordinator boolean not null default false,
  body             text not null,
  created_at       timestamptz not null default now()
);

alter table public.support_messages enable row level security;
drop policy if exists "member send support"  on public.support_messages;
drop policy if exists "admin support all"     on public.support_messages;
-- Members may WRITE to their own thread, but not SELECT the raw table (that
-- would expose which coordinator replied). They read via the view below.
create policy "member send support" on public.support_messages for insert
  with check (member_id = auth.uid() and sender_id = auth.uid() and from_coordinator = false);
create policy "admin support all" on public.support_messages for all using (public.is_admin());

-- Member-safe view: their own thread, without the coordinator's identity.
create or replace view public.my_support_thread as
select id, member_id, from_coordinator, body, created_at
from public.support_messages
where member_id = auth.uid();
grant select on public.my_support_thread to authenticated;
