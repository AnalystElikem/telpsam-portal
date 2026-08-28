-- ==========================================================================
-- Migration 011: lock down who can change a profile's role / super-admin flag.
-- RLS is row-level, so column-level protection is enforced with a trigger.
--
-- Allowed role changes:
--   * the service role (server code with the service key, e.g. /office signup) —
--     detected by auth.uid() being null (it always bypasses RLS),
--   * a super admin (promote/demote coordinators),
--   * a member transitioning their OWN account from student -> alumnus.
-- The is_superadmin flag can ONLY be changed by the service role (i.e. directly
-- in SQL), never through the app.
-- Run in the SQL editor. Safe to re-run.
-- ==========================================================================
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted server context (service role) bypasses RLS and has no auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    if public.is_superadmin() then
      null; -- super admin may change roles
    elsif new.id = auth.uid() and old.role = 'student' and new.role = 'alumnus' then
      null; -- a member completing their own transition to alumnus
    else
      raise exception 'Only a super admin can change a member''s role';
    end if;
  end if;

  if new.is_superadmin is distinct from old.is_superadmin then
    raise exception 'The super-admin flag can only be changed directly by a database administrator';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();
