-- ==========================================================================
-- Migration 023: batch routine coordinator emails into a periodic digest.
-- Routine notifications (a signup to approve, a mentorship request, a declined
-- invitation, a support message, a call/extension request, an ended mentorship)
-- are queued here and rolled up into one email every few hours by the
-- /api/cron/admin-digest job — instead of one email per event.
-- Safeguarding flags and reported concerns still email coordinators immediately.
-- Idempotent; safe to re-run.
-- ==========================================================================
create table if not exists public.admin_notifications (
  id         uuid primary key default gen_random_uuid(),
  subject    text not null,
  body       text not null default '',
  cta_text   text,
  cta_path   text,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists admin_notifications_unsent_idx
  on public.admin_notifications (sent_at, created_at);

-- Only the service-role key (used by notifyAdmins and the digest cron) reads or
-- writes this queue. RLS is on with no policies, so no anon/user access at all.
alter table public.admin_notifications enable row level security;
