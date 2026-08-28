-- ==========================================================================
-- Migration 004: add the student's school / institution name.
-- Run in the Supabase SQL editor. Safe to re-run.
-- ==========================================================================
alter table public.student_profiles add column if not exists school text;
