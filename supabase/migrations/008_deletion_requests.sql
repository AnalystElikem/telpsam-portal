-- ==========================================================================
-- Migration 008: two-coordinator data deletion (right to be forgotten).
-- One coordinator requests a member's deletion; a DIFFERENT coordinator must
-- approve before anything is erased. Run in the SQL editor. Safe to re-run.
-- ==========================================================================
create table if not exists public.deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid references public.profiles(id) on delete set null,
  subject_name  text,
  subject_email text,
  reason        text,
  status        text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected', 'completed')),
  requested_by  uuid references public.profiles(id) on delete set null,
  resolved_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

alter table public.deletion_requests enable row level security;

drop policy if exists "admin deletion all" on public.deletion_requests;
create policy "admin deletion all" on public.deletion_requests for all using (public.is_admin());
