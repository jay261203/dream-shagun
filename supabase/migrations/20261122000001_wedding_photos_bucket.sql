-- Photos the family adds to its invitation (journey moments, later the cover). The bucket is public to READ so the
-- guest page can show them; nobody can write through the Data API. Uploads go through our API, which checks that the
-- person belongs to the wedding, re-encodes the image and writes with the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-photos', 'wedding-photos', true, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
