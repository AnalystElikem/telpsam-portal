-- ==========================================================================
-- Migration 009: periodic mentorship check-ins (engagement + safeguarding).
-- Each participant is asked how it's going; "I have a concern" raises a flag.
-- Run in the SQL editor. Safe to re-run.
-- ==========================================================================
create table if not exists public.checkins (
  id            uuid primary key default gen_random_uuid(),
  mentorship_id uuid not null references public.mentorships(id) on delete cascade,
  respondent_id uuid not null references public.profiles(id) on delete cascade,
  rating        text not null check (rating in ('good', 'okay', 'concern')),
  created_at    timestamptz not null default now()
);

alter table public.checkins enable row level security;

drop policy if exists "participant insert checkin" on public.checkins;
drop policy if exists "participant read own checkin" on public.checkins;
drop policy if exists "admin checkins all" on public.checkins;

create policy "participant insert checkin" on public.checkins for insert
  with check (respondent_id = auth.uid() and public.in_mentorship(mentorship_id));
create policy "participant read own checkin" on public.checkins for select
  using (respondent_id = auth.uid());
create policy "admin checkins all" on public.checkins for all using (public.is_admin());
