-- ==========================================================================
-- Migration 006: coordinator audit trail.
-- Records sensitive coordinator actions (reading a flagged chat, approvals,
-- assigning/ending mentorships, resolving reports, handling call requests) so
-- the accountable people are themselves accountable. Run in the SQL editor.
-- ==========================================================================
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   uuid,
  detail      text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "admin read audit"   on public.audit_log;
drop policy if exists "admin insert audit"  on public.audit_log;

-- Only coordinators can read or write the log (writes happen as the acting
-- coordinator, who is always an admin).
create policy "admin read audit"   on public.audit_log for select using (public.is_admin());
create policy "admin insert audit"  on public.audit_log for insert with check (public.is_admin());
