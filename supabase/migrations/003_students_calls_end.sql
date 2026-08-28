-- ==========================================================================
-- Migration 003: student profiles + approval, private phone + church branch,
-- ending a mentorship, and phone-call requests.
-- Run in the Supabase SQL editor on the existing database. Safe to re-run.
-- ==========================================================================

-- 1. Alumni: church branch (fine to be visible) on the profile; private phone
--    in a SEPARATE coordinator-only table, because alumni_profiles is readable
--    by students for the directory and must never expose a phone number.
alter table public.alumni_profiles add column if not exists church_branch text;

create table if not exists public.alumni_contact (
  id         uuid primary key references public.profiles(id) on delete cascade,
  phone      text,
  updated_at timestamptz not null default now()
);
alter table public.alumni_contact enable row level security;

drop policy if exists "own alumni contact read"   on public.alumni_contact;
drop policy if exists "own alumni contact upsert"  on public.alumni_contact;
drop policy if exists "own alumni contact update"  on public.alumni_contact;
drop policy if exists "admin alumni contact all"   on public.alumni_contact;

create policy "own alumni contact read"   on public.alumni_contact for select using (id = auth.uid());
create policy "own alumni contact upsert"  on public.alumni_contact for insert with check (id = auth.uid());
create policy "own alumni contact update"  on public.alumni_contact for update using (id = auth.uid());
create policy "admin alumni contact all"   on public.alumni_contact for all    using (public.is_admin());

-- 2. Student profiles. Students must complete this and be approved by a
--    coordinator before they can use the portal. Phone / parent contact are
--    private (coordinators only), never shown to other members.
create table if not exists public.student_profiles (
  id             uuid primary key references public.profiles(id) on delete cascade,
  phone          text,
  parent_name    text,
  parent_contact text,
  church_branch  text,
  education_level text check (education_level in ('SHS 3', 'Completed SHS', 'Tertiary')),
  class_level    text,
  is_approved    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

drop policy if exists "own student read"   on public.student_profiles;
drop policy if exists "own student upsert"  on public.student_profiles;
drop policy if exists "own student update"  on public.student_profiles;
drop policy if exists "admin student all"   on public.student_profiles;

create policy "own student read"   on public.student_profiles for select using (id = auth.uid());
create policy "own student upsert"  on public.student_profiles for insert with check (id = auth.uid());
create policy "own student update"  on public.student_profiles for update using (id = auth.uid());
create policy "admin student all"   on public.student_profiles for all    using (public.is_admin());

-- 3. Ending a mentorship. Either participant may end it; the other is NOT
--    told. Only coordinators are notified.
alter table public.mentorships add column if not exists ended_at timestamptz;
alter table public.mentorships add column if not exists ended_by uuid references public.profiles(id);

create or replace function public.end_mentorship(m_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mentorships
     set status = 'ended', ended_at = now(), ended_by = auth.uid()
   where id = m_id
     and (mentor_id = auth.uid() or mentee_id = auth.uid())
     and status <> 'ended';
end;
$$;

-- 4. Phone-call requests. A participant asks for a call; the other is NOT told.
--    A coordinator reviews it and facilitates the number manually.
create table if not exists public.call_requests (
  id            uuid primary key default gen_random_uuid(),
  mentorship_id uuid not null references public.mentorships(id) on delete cascade,
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'open' check (status in ('open', 'handled')),
  created_at    timestamptz not null default now()
);

alter table public.call_requests enable row level security;

drop policy if exists "requester create call"   on public.call_requests;
drop policy if exists "requester read own call"  on public.call_requests;
drop policy if exists "admin call all"           on public.call_requests;

create policy "requester create call" on public.call_requests for insert
  with check (requester_id = auth.uid() and public.in_mentorship(mentorship_id));
create policy "requester read own call" on public.call_requests for select
  using (requester_id = auth.uid());
create policy "admin call all" on public.call_requests for all
  using (public.is_admin());
