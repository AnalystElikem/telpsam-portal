-- ==========================================================================
-- Migration 010: super admin. A super admin is an admin who can also promote
-- and demote coordinators. Run in the SQL editor. Safe to re-run.
-- ==========================================================================
alter table public.profiles add column if not exists is_superadmin boolean not null default false;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_superadmin
  );
$$;

-- Make yourself the super admin (run once, with your email):
--   update public.profiles set is_superadmin = true, role = 'admin'
--   where email = 'elikemaflakpui@gmail.com';
