-- P1-01 (DS-10): core tables and row-level security.
-- Columns follow PROJECT.md section 6. Money is integer paise, never floats.
--
-- Access model:
--   * anon (guests) can only READ published weddings and their events, wishes, moments,
--     and only the columns that are safe to show (UPI IDs are excluded from the table grant).
--   * family members (authenticated) can read everything for their own wedding.
--   * ALL writes go through the FastAPI service (service role), which validates input and
--     rate-limits. Clients get no insert/update/delete policies. This is stricter than
--     "public can insert rsvps and blessings" in the task text: a guest could otherwise insert
--     a blessing with status 'received' or an RSVP for someone else's guest_id.

create schema if not exists private;

-- ---------------------------------------------------------------- helpers

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- weddings

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  status text not null default 'draft' check (status in ('draft', 'published')),
  bride_name text not null check (char_length(bride_name) between 1 and 80),
  groom_name text not null check (char_length(groom_name) between 1 and 80),
  story text,
  cover_photo_url text,
  template_id text,
  color_preset text,
  font_pair text,
  music_url text,
  sections_enabled text[] not null default '{cover,couple,journey,events,countdown,rsvp,blessing,contact}',
  languages text[] not null default '{en}',
  bride_side_upi text,
  groom_side_upi text,
  bride_side_payee_name text,
  groom_side_payee_name text,
  blessings_enabled boolean not null default true,
  rsvp_deadline date
);

create trigger weddings_set_updated_at
  before update on public.weddings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------- family_members

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  phone text,
  side text not null check (side in ('bride', 'groom')),
  role text not null default 'helper' check (role in ('owner', 'helper')),
  unique (wedding_id, user_id)
);

-- user_id is used by every RLS check; wedding_id is covered by the unique index above.
create index family_members_user_id_idx on public.family_members (user_id);

-- Membership check used by policies. security definer so it can read family_members
-- without recursing into that table's own policy. It only ever answers for the caller.
create or replace function private.is_family_member(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.wedding_id = p_wedding_id
      and fm.user_id = (select auth.uid())
  );
$$;

-- anon must be able to run it too: public policies on weddings, events etc. call it, and it
-- simply returns false when there is no logged-in user.
revoke execute on function private.is_family_member(uuid) from public;
grant execute on function private.is_family_member(uuid) to anon, authenticated;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------- events

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  starts_at timestamptz not null,
  venue_name text,
  venue_address text,
  map_url text,
  sort_order int not null default 0,
  kind text not null default 'other'
    check (kind in ('mehendi', 'haldi', 'sangeet', 'pheras', 'reception', 'other')),
  dress_code text,
  note text
);

create index events_wedding_id_idx on public.events (wedding_id, sort_order);

-- ---------------------------------------------------------------- guests

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  phone text,
  side text check (side in ('bride', 'groom')),
  -- Unguessable token for personal links. Unique where set.
  link_code text unique check (link_code is null or char_length(link_code) >= 16),
  source text not null default 'open' check (source in ('open', 'personal', 'family_added'))
);

create index guests_wedding_id_idx on public.guests (wedding_id);

-- ---------------------------------------------------------------- rsvps

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  attending boolean not null,
  party_size int not null default 1 check (party_size between 0 and 20),
  food_choice text check (food_choice in ('veg', 'jain', 'other')),
  allergies text,
  unique (guest_id, event_id)
);

create index rsvps_event_id_idx on public.rsvps (event_id);

create trigger rsvps_set_updated_at
  before update on public.rsvps
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------- wishes

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  image_url text,
  sort_order int not null default 0
  -- No target amount column, ever (PROJECT.md rule 2).
);

create index wishes_wedding_id_idx on public.wishes (wedding_id, sort_order);

-- ---------------------------------------------------------------- blessings

create table public.blessings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  guest_id uuid references public.guests (id) on delete set null,
  giver_name text not null check (char_length(giver_name) between 1 and 120),
  wish_id uuid references public.wishes (id) on delete set null,
  amount_paise int check (amount_paise is null or amount_paise > 0),
  note text check (note is null or char_length(note) <= 1000),
  media_url text,
  method text not null check (method in ('upi', 'cash', 'gift')),
  status text not null default 'claimed' check (status in ('claimed', 'received', 'rejected')),
  side text not null check (side in ('bride', 'groom')),
  received_by uuid references public.family_members (id) on delete set null,
  received_at timestamptz,
  -- Only the family's "Received" tap counts (rule 5): a received row must say who and when.
  check (status <> 'received' or (received_by is not null and received_at is not null))
);

create index blessings_wedding_id_idx on public.blessings (wedding_id, side, status);
create index blessings_guest_id_idx on public.blessings (guest_id);
create index blessings_wish_id_idx on public.blessings (wish_id);
create index blessings_received_by_idx on public.blessings (received_by);

-- ---------------------------------------------------------------- moments

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  happened_on date,
  caption text,
  photo_url text,
  sort_order int not null default 0
);

create index moments_wedding_id_idx on public.moments (wedding_id, sort_order);

-- ---------------------------------------------------------------- row-level security

alter table public.weddings enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.wishes enable row level security;
alter table public.blessings enable row level security;
alter table public.moments enable row level security;

-- weddings: published ones are public; family sees their own (including drafts).
create policy weddings_select on public.weddings
  for select to anon, authenticated
  using (status = 'published' or (select private.is_family_member(id)));

-- family_members: you see your own row and your wedding's other members.
create policy family_members_select on public.family_members
  for select to authenticated
  using ((select auth.uid()) = user_id or (select private.is_family_member(wedding_id)));

-- events, wishes, moments: public when the wedding is published; family always.
create policy events_select on public.events
  for select to anon, authenticated
  using (
    (select private.is_family_member(wedding_id))
    or exists (select 1 from public.weddings w where w.id = wedding_id and w.status = 'published')
  );

create policy wishes_select on public.wishes
  for select to anon, authenticated
  using (
    (select private.is_family_member(wedding_id))
    or exists (select 1 from public.weddings w where w.id = wedding_id and w.status = 'published')
  );

create policy moments_select on public.moments
  for select to anon, authenticated
  using (
    (select private.is_family_member(wedding_id))
    or exists (select 1 from public.weddings w where w.id = wedding_id and w.status = 'published')
  );

-- guests, rsvps, blessings: family only. No anon policy means anon sees nothing.
create policy guests_select on public.guests
  for select to authenticated
  using ((select private.is_family_member(wedding_id)));

create policy rsvps_select on public.rsvps
  for select to authenticated
  using (
    exists (
      select 1 from public.guests g
      where g.id = guest_id and (select private.is_family_member(g.wedding_id))
    )
  );

create policy blessings_select on public.blessings
  for select to authenticated
  using ((select private.is_family_member(wedding_id)));

-- ---------------------------------------------------------------- privileges

-- Defence in depth on top of RLS: strip default grants, then give back only what is needed.
revoke all on public.weddings, public.family_members, public.events, public.guests,
  public.rsvps, public.wishes, public.blessings, public.moments from anon, authenticated;

grant select on public.family_members, public.guests, public.rsvps, public.blessings to authenticated;
grant select on public.events, public.wishes, public.moments to anon, authenticated;

-- Guests may read these wedding columns only. UPI IDs and payee names are left out:
-- the API builds the pay link on the server (PROJECT.md section 7).
grant select (
  id, created_at, updated_at, slug, status, bride_name, groom_name, story, cover_photo_url,
  template_id, color_preset, font_pair, music_url, sections_enabled, languages,
  blessings_enabled, rsvp_deadline
) on public.weddings to anon;

-- Family members read every column, including UPI IDs.
grant select on public.weddings to authenticated;
