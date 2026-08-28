-- ==========================================================================
-- Migration 007: record that a coordinator confirmed guardian consent (verbal
-- or otherwise) when approving a student. Run in the SQL editor. Safe to re-run.
-- ==========================================================================
alter table public.student_profiles
  add column if not exists guardian_consent_confirmed boolean not null default false;
alter table public.student_profiles
  add column if not exists guardian_consent_by uuid references public.profiles(id);
alter table public.student_profiles
  add column if not exists guardian_consent_at timestamptz;
