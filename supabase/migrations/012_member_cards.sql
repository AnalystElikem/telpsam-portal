-- ==========================================================================
-- Migration 012: stop exposing raw profile rows (incl. email) to members.
-- The old "directory profiles read" policy let any signed-in member SELECT a
-- published alumnus's entire profiles row, email included. We drop it and serve
-- names/avatars through a view that exposes only safe columns, scoped to people
-- the viewer is allowed to see. Run in the SQL editor. Safe to re-run.
-- ==========================================================================

drop policy if exists "directory profiles read" on public.profiles;

-- Owner-privileged view (bypasses profiles RLS) exposing only safe columns.
-- Rows are restricted to: yourself, any coordinator (admin), published alumni,
-- and the other participant in a mentorship you're part of. No email, no flags.
create or replace view public.member_cards as
select p.id, p.full_name, p.avatar_url, p.campus
from public.profiles p
where
  p.id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.alumni_profiles a
    where a.id = p.id and a.is_approved and a.is_published
  )
  or exists (
    select 1 from public.mentorships m
    where (m.mentor_id = p.id or m.mentee_id = p.id)
      and (m.mentor_id = auth.uid() or m.mentee_id = auth.uid())
  );

grant select on public.member_cards to authenticated;
