-- ============================================================================
-- TELPSAM Alumni & Mentorship Portal — database schema
-- Run this in Supabase → SQL Editor (once). It creates the tables, security
-- rules (row-level security), the signup trigger, and the photo storage bucket.
--
-- Safeguards baked in:
--   • Students never see alumni contact details.
--   • Mentorship pairings are created only by the office (admin).
--   • Messages are visible only to the paired mentor, mentee, and the office.
--   • Everyone can file a report; the office reviews them.
-- ============================================================================

-- --------------------------------------------------------------- profiles
-- One row per signed-in user (student, alumnus, or admin).
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  role         text not null default 'student'
                 check (role in ('student', 'alumnus', 'admin')),
  full_name    text not null default '',
  email        text not null default '',
  campus       text,
  program      text,
  avatar_url   text,
  agreed_rules boolean not null default false,
  agreed_at    timestamptz,
  is_superadmin boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------- alumni_profiles
-- Extra details for alumni. Only approved + published rows appear in the
-- student-facing directory. Contact details are NEVER stored here.
create table if not exists public.alumni_profiles (
  id            uuid primary key references public.profiles(id) on delete cascade,
  title         text,          -- honorific: Dr., Rev., Mrs., Apostle…
  gender        text check (gender in ('Male', 'Female')),
  grad_year     int,
  qualifications text,
  job_title  text,
  organization  text,
  industry      text,
  interests     text[] not null default '{}',
  bio           text,
  church_branch text,
  is_approved   boolean not null default false,  -- office approves
  is_published  boolean not null default false,  -- alumnus makes visible
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -------------------------------------------------------- alumni_contact
-- Alumni phone kept OUT of alumni_profiles, because that table is readable by
-- students for the directory. This table is coordinator-only, never public.
create table if not exists public.alumni_contact (
  id         uuid primary key references public.profiles(id) on delete cascade,
  phone      text,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------ student_profiles
-- Students must complete this and be approved by a coordinator before they can
-- use the portal. Phone and parent/guardian contact are private (coordinators
-- only) and never shown to other members.
create table if not exists public.student_profiles (
  id             uuid primary key references public.profiles(id) on delete cascade,
  gender         text check (gender in ('Male', 'Female')),
  phone          text,
  parent_name    text,
  parent_contact text,
  church_branch  text,
  school         text,
  education_level text check (education_level in ('SHS 3', 'Completed SHS', 'Tertiary')),
  class_level    text,
  is_approved    boolean not null default false,
  guardian_consent_confirmed boolean not null default false,
  guardian_consent_by uuid references public.profiles(id),
  guardian_consent_at timestamptz,
  transition_snoozed_until timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- --------------------------------------------------- mentorship_requests
-- A student asks for mentorship or a question. The office triages these.
create table if not exists public.mentorship_requests (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  alumnus_id  uuid references public.profiles(id) on delete set null, -- optional interest
  kind        text not null default 'mentorship'
                check (kind in ('mentorship', 'question')),
  message     text not null default '',
  status      text not null default 'new'
                check (status in ('new', 'assigned', 'declined', 'closed')),
  created_at  timestamptz not null default now()
);

-- --------------------------------------------------------- mentorships
-- An office-assigned pairing. Created ONLY by admins.
create table if not exists public.mentorships (
  id          uuid primary key default gen_random_uuid(),
  mentor_id   uuid not null references public.profiles(id) on delete cascade,
  mentee_id   uuid not null references public.profiles(id) on delete cascade,
  request_id  uuid references public.mentorship_requests(id) on delete set null,
  status      text not null default 'active'
                check (status in ('active', 'paused', 'ended')),
  created_by  uuid references public.profiles(id),
  ended_at    timestamptz,
  ended_by    uuid references public.profiles(id),
  expires_at  timestamptz,   -- mentorships are time-bound (3 months)
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------- call_requests
-- A participant asks for a phone call. The other party is NOT told. A
-- coordinator reviews it and facilitates the number manually.
create table if not exists public.call_requests (
  id            uuid primary key default gen_random_uuid(),
  mentorship_id uuid not null references public.mentorships(id) on delete cascade,
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'open' check (status in ('open', 'handled')),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------- extension_requests
-- A participant asks to extend a time-bound mentorship; a coordinator decides.
create table if not exists public.extension_requests (
  id            uuid primary key default gen_random_uuid(),
  mentorship_id uuid not null references public.mentorships(id) on delete cascade,
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at    timestamptz not null default now(),
  resolved_by   uuid references public.profiles(id),
  resolved_at   timestamptz
);

-- ------------------------------------------------------- support_messages
-- Member <-> coordinators chat. Any coordinator can reply; the member is never
-- told which one. Members write here but read via my_support_thread (below).
create table if not exists public.support_messages (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.profiles(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  from_coordinator boolean not null default false,
  body             text not null,
  created_at       timestamptz not null default now()
);

-- --------------------------------------------------------------- checkins
-- Periodic 'how is it going?' responses from mentorship participants.
create table if not exists public.checkins (
  id            uuid primary key default gen_random_uuid(),
  mentorship_id uuid not null references public.mentorships(id) on delete cascade,
  respondent_id uuid not null references public.profiles(id) on delete cascade,
  rating        text not null check (rating in ('good', 'okay', 'concern')),
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------ deletion_requests
-- Two-coordinator data deletion. A different coordinator must approve.
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

-- ------------------------------------------------------------- audit_log
-- Sensitive coordinator actions, for accountability.
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   uuid,
  detail      text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------- messages
-- In-portal conversation, scoped to a mentorship.
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  mentorship_id  uuid not null references public.mentorships(id) on delete cascade,
  sender_id      uuid not null references public.profiles(id) on delete cascade,
  body           text not null,
  created_at     timestamptz not null default now()
);

-- -------------------------------------------------------------- reports
create table if not exists public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references public.profiles(id) on delete cascade,
  mentorship_id  uuid references public.mentorships(id) on delete set null,
  message_id     uuid references public.messages(id) on delete set null,
  source         text not null default 'manual' check (source in ('manual', 'auto')),
  reason         text not null,
  details        text,
  status         text not null default 'open' check (status in ('open', 'resolved')),
  created_at     timestamptz not null default now()
);

-- =========================================================================
-- Helper functions (defined AFTER the tables they reference).
-- SECURITY DEFINER lets them bypass RLS, so they can be used inside policies
-- without causing infinite recursion.
-- =========================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Is the current user a super admin (can regulate coordinators)?
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_superadmin
  );
$$;

-- Is the current user part of a given mentorship?
create or replace function public.in_mentorship(m_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mentorships
    where id = m_id and (mentor_id = auth.uid() or mentee_id = auth.uid())
  );
$$;

-- Does a mentorship have any flag/report on it? Used to keep conversations
-- private unless something has been flagged, at which point coordinators may
-- review the thread. SECURITY DEFINER so it can read reports past their RLS.
create or replace function public.has_flag(m_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reports where mentorship_id = m_id
  );
$$;

-- Either participant may end a mentorship. The other is not told; coordinators
-- are. SECURITY DEFINER so it can update past the participants' read-only RLS.
create or replace function public.end_mentorship(m_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mentorships
     set status = 'ended', ended_at = now(), ended_by = auth.uid()
   where id = m_id
     and (mentor_id = auth.uid() or mentee_id = auth.uid())
     and status <> 'ended';
end;
$$;

-- =========================================================================
-- Row-level security
-- =========================================================================
alter table public.profiles           enable row level security;
alter table public.alumni_profiles     enable row level security;
alter table public.alumni_contact      enable row level security;
alter table public.student_profiles    enable row level security;
alter table public.mentorship_requests enable row level security;
alter table public.mentorships         enable row level security;
alter table public.messages            enable row level security;
alter table public.reports             enable row level security;
alter table public.call_requests       enable row level security;
alter table public.extension_requests  enable row level security;
alter table public.support_messages    enable row level security;
alter table public.checkins            enable row level security;
alter table public.deletion_requests   enable row level security;
alter table public.audit_log           enable row level security;

-- profiles ---------------------------------------------------------------
create policy "own profile read"    on public.profiles for select using (id = auth.uid());
create policy "own profile update"  on public.profiles for update using (id = auth.uid());
create policy "admin profiles read" on public.profiles for select using (public.is_admin());
create policy "admin profiles all"  on public.profiles for all    using (public.is_admin());
-- NOTE: members do NOT read raw profiles rows of others (that would expose
-- email). Names/avatars are served through the public.member_cards view below,
-- which exposes only safe columns and is scoped to who the viewer may see.

-- alumni_profiles --------------------------------------------------------
create policy "own alumni read"   on public.alumni_profiles for select using (id = auth.uid());
create policy "own alumni upsert" on public.alumni_profiles for insert with check (id = auth.uid());
create policy "own alumni update" on public.alumni_profiles for update using (id = auth.uid());
create policy "admin alumni all"  on public.alumni_profiles for all using (public.is_admin());
create policy "directory alumni read" on public.alumni_profiles for select
  using (is_approved and is_published);

-- mentorship_requests ----------------------------------------------------
create policy "student own requests read"  on public.mentorship_requests for select using (student_id = auth.uid());
create policy "student create request"     on public.mentorship_requests for insert with check (student_id = auth.uid());
create policy "admin requests all"         on public.mentorship_requests for all using (public.is_admin());

-- mentorships ------------------------------------------------------------
create policy "participants read mentorship" on public.mentorships for select
  using (mentor_id = auth.uid() or mentee_id = auth.uid());
create policy "admin mentorships all" on public.mentorships for all using (public.is_admin());
-- (No insert policy for regular users → only admins can create pairings.)

-- messages ---------------------------------------------------------------
create policy "participants read messages" on public.messages for select
  using (public.in_mentorship(mentorship_id));
create policy "participants send messages" on public.messages for insert
  with check (sender_id = auth.uid() and public.in_mentorship(mentorship_id));
-- Conversations are private. Coordinators may read a thread ONLY once it has
-- been flagged (auto-flag or a manual report), and may reply only then.
create policy "admin read flagged messages" on public.messages for select
  using (public.is_admin() and public.has_flag(mentorship_id));
create policy "admin send in flagged" on public.messages for insert
  with check (public.is_admin() and sender_id = auth.uid() and public.has_flag(mentorship_id));

-- member_cards: safe, scoped name/avatar view (no email). Members read this
-- instead of the profiles table for other people's names.
create or replace view public.member_cards as
select p.id, p.full_name, p.avatar_url, p.campus
from public.profiles p
where
  p.id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.alumni_profiles a
    where a.id = p.id and a.is_approved and a.is_published
  )
  or exists (
    select 1 from public.mentorships m
    where (m.mentor_id = p.id or m.mentee_id = p.id)
      and (m.mentor_id = auth.uid() or m.mentee_id = auth.uid())
  );

grant select on public.member_cards to authenticated;

-- my_support_thread: a member's own coordinator chat, without exposing which
-- coordinator replied.
create or replace view public.my_support_thread as
select id, member_id, from_coordinator, body, created_at
from public.support_messages
where member_id = auth.uid();

grant select on public.my_support_thread to authenticated;

-- alumni_contact (private phone) -----------------------------------------
create policy "own alumni contact read"   on public.alumni_contact for select using (id = auth.uid());
create policy "own alumni contact upsert"  on public.alumni_contact for insert with check (id = auth.uid());
create policy "own alumni contact update"  on public.alumni_contact for update using (id = auth.uid());
create policy "admin alumni contact all"   on public.alumni_contact for all    using (public.is_admin());

-- student_profiles -------------------------------------------------------
create policy "own student read"   on public.student_profiles for select using (id = auth.uid());
create policy "own student upsert"  on public.student_profiles for insert with check (id = auth.uid());
create policy "own student update"  on public.student_profiles for update using (id = auth.uid());
create policy "admin student all"   on public.student_profiles for all    using (public.is_admin());

-- reports ----------------------------------------------------------------
create policy "reporter create report" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reporter read own"      on public.reports for select using (reporter_id = auth.uid());
create policy "admin reports all"      on public.reports for all using (public.is_admin());

-- call_requests ----------------------------------------------------------
create policy "requester create call"   on public.call_requests for insert
  with check (requester_id = auth.uid() and public.in_mentorship(mentorship_id));
create policy "requester read own call"  on public.call_requests for select using (requester_id = auth.uid());
create policy "admin call all"           on public.call_requests for all using (public.is_admin());

-- checkins ---------------------------------------------------------------
create policy "participant insert checkin" on public.checkins for insert
  with check (respondent_id = auth.uid() and public.in_mentorship(mentorship_id));
create policy "participant read own checkin" on public.checkins for select using (respondent_id = auth.uid());
create policy "admin checkins all" on public.checkins for all using (public.is_admin());

-- extension_requests -----------------------------------------------------
create policy "participant create extension" on public.extension_requests for insert
  with check (requester_id = auth.uid() and public.in_mentorship(mentorship_id));
create policy "participant read extension" on public.extension_requests for select using (public.in_mentorship(mentorship_id));
create policy "admin extension all" on public.extension_requests for all using (public.is_admin());

-- support_messages -------------------------------------------------------
create policy "member send support" on public.support_messages for insert
  with check (member_id = auth.uid() and sender_id = auth.uid() and from_coordinator = false);
create policy "admin support all" on public.support_messages for all using (public.is_admin());

-- deletion_requests (coordinators only) ----------------------------------
create policy "admin deletion all" on public.deletion_requests for all using (public.is_admin());

-- audit_log (coordinators only) ------------------------------------------
create policy "admin read audit"   on public.audit_log for select using (public.is_admin());
create policy "admin insert audit"  on public.audit_log for insert with check (public.is_admin());

-- =========================================================================
-- New-user trigger: create a profile row when someone signs up.
-- Reads role + full name from the signup metadata.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' in ('student', 'alumnus')
        then new.raw_user_meta_data ->> 'role'
      else 'student'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Guard: only a super admin (or the service role, or a member's own
-- student -> alumnus transition) may change a profile's role. The
-- is_superadmin flag can only be changed directly in SQL.
-- =========================================================================
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- trusted server context (service role)
  end if;

  if new.role is distinct from old.role then
    if public.is_superadmin() then
      null;
    elsif new.id = auth.uid() and old.role = 'student' and new.role = 'alumnus' then
      null;
    else
      raise exception 'Only a super admin can change a member''s role';
    end if;
  end if;

  if new.is_superadmin is distinct from old.is_superadmin then
    raise exception 'The super-admin flag can only be changed directly by a database administrator';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- =========================================================================
-- Storage bucket for profile photos.
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatar owner upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatar owner update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- After running this, make yourself the admin:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- (Sign up first so the row exists.)
-- ============================================================================
