-- ==========================================================================
-- Migration 022
--  (A) Mentor consent: a coordinator PROPOSES a mentor; the mentorship is only
--      created when that mentor accepts. Declines return the request to the queue.
--  (B) Alumni mentoring alumni: an alumnus can now be a mentee too, so their
--      profile card is visible to a mentorship partner whether they mentor or
--      are mentored.
-- Idempotent; safe to re-run. Run in the Supabase SQL editor.
-- ==========================================================================

-- (A1) Requests gain a 'proposed' state (waiting on a mentor's consent).
do $$ begin
  alter table public.mentorship_requests drop constraint if exists mentorship_requests_status_check;
exception when undefined_object then null; end $$;
alter table public.mentorship_requests
  add constraint mentorship_requests_status_check
  check (status in ('new', 'proposed', 'assigned', 'declined', 'closed'));

-- (A2) Proposals table.
create table if not exists public.mentorship_proposals (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid references public.mentorship_requests(id) on delete set null,
  mentee_id    uuid not null references public.profiles(id) on delete cascade,
  mentor_id    uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  note         text,
  created_by   uuid references public.profiles(id),
  responded_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists proposals_mentor_idx  on public.mentorship_proposals (mentor_id, status);
create index if not exists proposals_request_idx on public.mentorship_proposals (request_id);

alter table public.mentorship_proposals enable row level security;
do $$ begin
  create policy "proposals admin all" on public.mentorship_proposals
    for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "proposals mentor read" on public.mentorship_proposals
    for select using (mentor_id = auth.uid());
exception when duplicate_object then null; end $$;

-- (A3) Accept / decline as SECURITY DEFINER so a mentor's own click can create
--      the (otherwise admin-only) mentorship, with the right guards.
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
   where mentor_id = v_mentor and status = 'active';
  if v_active >= 3 then raise exception 'You already have the maximum number of active mentees.'; end if;

  insert into public.mentorships (mentor_id, mentee_id, request_id, created_by, expires_at)
    values (v_mentor, v_mentee, v_req, v_mentor, now() + interval '3 months')
    returning id into v_mid;

  update public.mentorship_proposals set status = 'accepted', responded_at = now() where id = p_id;
  if v_req is not null then
    update public.mentorship_requests set status = 'assigned' where id = v_req;
  end if;
  return v_mid;
end;
$$;
grant execute on function public.accept_proposal(uuid) to authenticated;

create or replace function public.decline_proposal(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_mentor uuid; v_req uuid;
begin
  select mentor_id, request_id into v_mentor, v_req
    from public.mentorship_proposals
   where id = p_id and status = 'pending';
  if v_mentor is null then raise exception 'This proposal is no longer available.'; end if;
  if v_mentor <> auth.uid() then raise exception 'This proposal is not yours.'; end if;

  update public.mentorship_proposals set status = 'declined', responded_at = now() where id = p_id;
  if v_req is not null then
    update public.mentorship_requests set status = 'new' where id = v_req; -- back to the coordinators
  end if;
end;
$$;
grant execute on function public.decline_proposal(uuid) to authenticated;

-- (A4) A mentor's own pending proposals, with the mentee's name/role and the
--      request message so they can decide. Owner-run view scoped to the mentor.
create or replace view public.my_proposals as
select p.id, p.mentee_id, p.request_id, p.created_at, p.note,
       pr.full_name as mentee_name, pr.role as mentee_role,
       r.kind as request_kind, r.message as request_message
from public.mentorship_proposals p
join public.profiles pr on pr.id = p.mentee_id
left join public.mentorship_requests r on r.id = p.request_id
where p.status = 'pending' and p.mentor_id = auth.uid();
grant select on public.my_proposals to authenticated;

-- (B) Expose an alumnus's card to their mentorship partner on EITHER side, so an
--     alumnus who is being mentored is visible to their mentor.
create or replace view public.alumnus_cards as
select ap.id, ap.title, ap.gender, ap.grad_year, ap.qualifications, ap.job_title,
       ap.organization, ap.industry, ap.interests, ap.bio, ap.church_branch
from public.alumni_profiles ap
where (ap.is_approved and ap.is_published)
   or ap.id = auth.uid()
   or public.is_admin()
   or exists (
     select 1 from public.mentorships m
     where (m.mentor_id = ap.id or m.mentee_id = ap.id)
       and (m.mentor_id = auth.uid() or m.mentee_id = auth.uid())
   );
grant select on public.alumnus_cards to authenticated;
