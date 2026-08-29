-- ==========================================================================
-- Migration 018: coordinators can READ a flagged conversation but no longer
-- POST into it (that felt intrusive). They reach a member via the support
-- channel instead. Also: let participants see each other's "last seen" time so
-- we can show read receipts. Run in the SQL editor. Safe to re-run.
-- ==========================================================================

-- Remove coordinators' ability to send into a two-person private chat.
drop policy if exists "admin send in flagged" on public.messages;

-- Coordinators may now read ONLY the specific message(s) a report/flag points
-- at — not the whole private conversation. Manual reports without a message
-- expose no messages at all (the report reason speaks for itself).
drop policy if exists "admin read flagged messages" on public.messages;
create policy "admin read flagged messages" on public.messages for select
  using (
    public.is_admin()
    and exists (select 1 from public.reports r where r.message_id = messages.id)
  );

-- Read receipts: a participant may read the other participant's last-seen row
-- for a mentorship they share (only the seen_at timestamp is exposed).
drop policy if exists "participant read mentorship reads" on public.reads;
create policy "participant read mentorship reads" on public.reads for select
  using (scope = 'mentorship' and public.in_mentorship(ref_id));
