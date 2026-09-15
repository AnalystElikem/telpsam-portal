-- ==========================================================================
-- Migration 024: one-time questions are separate from mentorships.
-- A "question" is a short, capacity-FREE connection: a coordinator connects a
-- member's one-off question to an alumnus straight away (no consent step), and
-- the conversation auto-closes after two weeks. Because questions do NOT count
-- toward a mentor's 3-mentee limit, quick questions can never block a real
-- mentorship opportunity.
-- Idempotent; safe to re-run. Run in the Supabase SQL editor.
-- ==========================================================================

-- (1) Tag every mentorship row as a real mentorship or a one-time question.
alter table public.mentorships
  add column if not exists kind text not null default 'mentorship';
do $$ begin
  alter table public.mentorships drop constraint if exists mentorships_kind_check;
exception when undefined_object then null; end $$;
alter table public.mentorships
  add constraint mentorships_kind_check check (kind in ('mentorship', 'question'));

create index if not exists mentorships_kind_idx on public.mentorships (kind);

-- (2) Capacity counts REAL mentorships only. A mentor at "3 mentees" is 3 real
--     mentorships; any number of question threads never fills their slots.
create or replace function public.accept_proposal(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentor uuid; v_mentee uuid; v_req uuid; v_mid uuid; v_active int;
begin
  select mentor_id, mentee_id, request_id
    into v_mentor, v_mentee, v_req
    from public.mentorship_proposals
   where id = p_id and status = 'pending';
  if v_mentor is null then raise exception 'This proposal is no longer available.'; end if;
  if v_mentor <> auth.uid() then raise exception 'This proposal is not yours to accept.'; end if;

  select count(*) into v_active from public.mentorships
   where mentor_id = v_mentor and status = 'active' and kind = 'mentorship';
  if v_active >= 3 then raise exception 'You already have the maximum number of active mentees.'; end if;

  insert into public.mentorships (mentor_id, mentee_id, request_id, created_by, expires_at, kind)
    values (v_mentor, v_mentee, v_req, v_mentor, now() + interval '3 months', 'mentorship')
    returning id into v_mid;

  update public.mentorship_proposals set status = 'accepted', responded_at = now() where id = p_id;
  if v_req is not null then
    update public.mentorship_requests set status = 'assigned' where id = v_req;
  end if;
  return v_mid;
end;
$$;
grant execute on function public.accept_proposal(uuid) to authenticated;
