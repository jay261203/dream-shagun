-- A guestbook: guests leave a short message for the hosts, with no money in it. Only the hosts of that invitation can
-- read the messages; guests and other hosts cannot. All writes go through the API (service role), like every other
-- guest-facing write.
create table public.guestbook (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 1 and 80),
  message text not null check (char_length(message) between 1 and 600)
);

create index guestbook_wedding_id_idx on public.guestbook (wedding_id, created_at desc);

alter table public.guestbook enable row level security;

create policy guestbook_select on public.guestbook
  for select to authenticated
  using ((select private.is_family_member(wedding_id)));

revoke all on public.guestbook from anon, authenticated;
grant select on public.guestbook to authenticated;

-- The new section is on for every invitation, existing ones included, and for new ones by default.
update public.weddings set sections_enabled = array_append(sections_enabled, 'guestbook') where not ('guestbook' = any (sections_enabled));
alter table public.weddings alter column sections_enabled set default '{cover,couple,journey,events,countdown,rsvp,guestbook,contact}';
