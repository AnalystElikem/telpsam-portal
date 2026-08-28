-- ==========================================================================
-- Migration 014: performance indexes on hot foreign-key / filter columns.
-- Postgres does NOT auto-index foreign keys, so queries that filter by these
-- (loading a conversation, scanning for dormancy, listing per member) would
-- table-scan as data grows. Run in the SQL editor. Safe to re-run.
-- ==========================================================================

-- Conversations / messaging
create index if not exists messages_mentorship_created_idx on public.messages (mentorship_id, created_at);
create index if not exists messages_sender_idx            on public.messages (sender_id);

-- Mentorships
create index if not exists mentorships_mentor_idx  on public.mentorships (mentor_id);
create index if not exists mentorships_mentee_idx  on public.mentorships (mentee_id);
create index if not exists mentorships_status_idx  on public.mentorships (status);
create index if not exists mentorships_expires_idx on public.mentorships (expires_at);

-- Requests / reports / calls / extensions / checkins
create index if not exists requests_student_idx   on public.mentorship_requests (student_id);
create index if not exists requests_status_idx     on public.mentorship_requests (status);
create index if not exists reports_mentorship_idx  on public.reports (mentorship_id);
create index if not exists reports_status_idx       on public.reports (status);
create index if not exists calls_mentorship_idx    on public.call_requests (mentorship_id);
create index if not exists calls_status_idx         on public.call_requests (status);
create index if not exists ext_mentorship_idx      on public.extension_requests (mentorship_id);
create index if not exists ext_status_idx           on public.extension_requests (status);
create index if not exists checkins_mentorship_idx on public.checkins (mentorship_id);

-- Support inbox
create index if not exists support_member_created_idx on public.support_messages (member_id, created_at);

-- Approval queues / directory filters
create index if not exists alumni_pub_idx     on public.alumni_profiles (is_approved, is_published);
create index if not exists students_appr_idx  on public.student_profiles (is_approved);

-- Audit
create index if not exists audit_actor_idx  on public.audit_log (actor_id);
create index if not exists audit_target_idx on public.audit_log (target_id);
