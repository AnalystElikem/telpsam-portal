-- ==========================================================================
-- Migration 016: ensure the "avatars" storage bucket exists and accepts uploads.
-- The bucket lived only in schema.sql, so databases built purely from the
-- numbered migrations were missing it (photo uploads failed with "bucket not
-- found"). Run in the SQL editor. Safe to re-run.
-- ==========================================================================

-- Public bucket, up to 5 MB per file, ANY file type (allowed_mime_types = null).
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 5242880)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = null;

-- Policies: anyone can read (photos are public), owners can upload/update their
-- own folder (path is "<user-id>/<file>").
drop policy if exists "avatar public read"  on storage.objects;
drop policy if exists "avatar owner upload"  on storage.objects;
drop policy if exists "avatar owner update"  on storage.objects;

create policy "avatar public read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatar owner upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatar owner update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
