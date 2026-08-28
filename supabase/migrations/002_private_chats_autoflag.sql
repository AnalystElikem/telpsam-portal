-- ==========================================================================
-- Migration: private conversations + automatic flagging
-- Run this in the Supabase SQL editor on the existing database.
-- Safe to run more than once.
-- ==========================================================================

-- 1. Distinguish automatic flags from manual reports.
alter table public.reports
  add column if not exists source text not null default 'manual';
-- Ensure the allowed-values check exists (ignore error if it already does).
do $$
begin
  alter table public.reports
    add constraint reports_source_check check (source in ('manual', 'auto'));
exception when duplicate_object then null;
end $$;

-- 2. Helper: does a mentorship have any flag/report on it?
--    SECURITY DEFINER so it can read reports past their own RLS.
create or replace function public.has_flag(m_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reports where mentorship_id = m_id
  );
$$;

-- 3. Make conversations private. Coordinators lose blanket access and can only
--    read / reply once a conversation has been flagged.
drop policy if exists "admin messages all" on public.messages;

create policy "admin read flagged messages" on public.messages for select
  using (public.is_admin() and public.has_flag(mentorship_id));

create policy "admin send in flagged" on public.messages for insert
  with check (
    public.is_admin() and sender_id = auth.uid() and public.has_flag(mentorship_id)
  );
