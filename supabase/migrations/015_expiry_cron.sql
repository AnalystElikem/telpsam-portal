-- ==========================================================================
-- Migration 015: nightly job that ends mentorships past their 3-month period.
-- The app already treats expired mentorships as ended when read, so this is for
-- tidiness and correct analytics (status reflects reality).
--
-- pg_cron must be enabled first: Supabase dashboard → Database → Extensions →
-- enable "pg_cron" (or the create extension below if your plan allows it).
-- Run in the SQL editor. Safe to re-run.
-- ==========================================================================
create extension if not exists pg_cron;

create or replace function public.end_expired_mentorships()
returns void
language sql
security definer
set search_path = public
as $$
  update public.mentorships
     set status = 'ended', ended_at = coalesce(ended_at, now())
   where status <> 'ended'
     and expires_at is not null
     and expires_at < now();
$$;

-- Schedule daily at 01:00 UTC. Re-running replaces the same-named job.
do $$
begin
  perform cron.unschedule('end-expired-mentorships');
exception when others then
  null; -- job didn't exist yet
end $$;

select cron.schedule('end-expired-mentorships', '0 1 * * *', $$select public.end_expired_mentorships();$$);
