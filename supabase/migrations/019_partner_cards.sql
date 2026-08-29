-- ==========================================================================
-- Migration 019: let matched partners view each other's profile.
--   * mentee_cards  — a student's NON-private fields (no phone/parent), visible
--     to their assigned mentor.
--   * alumnus_cards — an alumnus's profile, visible to their assigned mentee
--     (as well as anyone, if approved + published for the directory).
-- Run in the SQL editor. Safe to re-run.
-- ==========================================================================
create or replace view public.mentee_cards as
select sp.id, sp.gender, sp.school, sp.education_level, sp.class_level, sp.church_branch
from public.student_profiles sp
where sp.id = auth.uid()
   or public.is_admin()
   or exists (
     select 1 from public.mentorships m
     where m.mentee_id = sp.id and (m.mentor_id = auth.uid() or m.mentee_id = auth.uid())
   );
grant select on public.mentee_cards to authenticated;

create or replace view public.alumnus_cards as
select ap.id, ap.title, ap.gender, ap.grad_year, ap.qualifications, ap.job_title,
       ap.organization, ap.industry, ap.interests, ap.bio, ap.church_branch
from public.alumni_profiles ap
where (ap.is_approved and ap.is_published)
   or ap.id = auth.uid()
   or public.is_admin()
   or exists (
     select 1 from public.mentorships m
     where m.mentor_id = ap.id and (m.mentor_id = auth.uid() or m.mentee_id = auth.uid())
   );
grant select on public.alumnus_cards to authenticated;
