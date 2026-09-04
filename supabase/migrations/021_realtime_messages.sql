-- ==========================================================================
-- Migration 021: enable Realtime on the messages table so a new message shows
-- up in the other participant's open chat WITHOUT a refresh. Realtime respects
-- RLS, so a subscriber only ever receives messages they're already allowed to
-- read (participants get their own chat; coordinators do not receive live
-- messages because a fresh message isn't flagged yet). Safe to re-run.
-- ==========================================================================
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;  -- already added
  when undefined_object then null;  -- publication missing (unusual) — ignore
end $$;
