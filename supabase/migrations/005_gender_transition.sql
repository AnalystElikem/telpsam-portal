-- ==========================================================================
-- Migration 005: gender for alumni + students, and the tertiary -> alumni
-- transition snooze. Run in the Supabase SQL editor. Safe to re-run.
-- ==========================================================================

alter table public.alumni_profiles
  add column if not exists gender text check (gender in ('Male', 'Female'));

alter table public.student_profiles
  add column if not exists gender text check (gender in ('Male', 'Female'));

-- When a tertiary student dismisses the "transition to alumni" prompt, snooze it.
alter table public.student_profiles
  add column if not exists transition_snoozed_until timestamptz;
