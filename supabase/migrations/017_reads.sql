-- ==========================================================================
-- Migration 017: per-user read tracking, for "unread" badges on member menus.
-- Records when a member last opened a conversation (a mentorship, or their
-- coordinator-support thread). Run in the SQL editor. Safe to re-run.
-- ==========================================================================
create table if not exists public.reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope   text not null,          -- 'mentorship' | 'support'
  ref_id  uuid not null,          -- mentorship id, or the member's own id for support
  seen_at timestamptz not null default now(),
  primary key (user_id, scope, ref_id)
);

alter table public.reads enable row level security;

drop policy if exists "own reads all" on public.reads;
create policy "own reads all" on public.reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
