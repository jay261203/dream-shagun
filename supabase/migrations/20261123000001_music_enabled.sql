-- The family can turn the invitation music off. Until now a wedding with no music file of its own always played the
-- template's default track. Guests read this flag with the other public wedding columns.
alter table public.weddings add column music_enabled boolean not null default true;

grant select (music_enabled) on public.weddings to anon;
