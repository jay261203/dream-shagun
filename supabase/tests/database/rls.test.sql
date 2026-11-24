-- P1-01 (DS-10): proves who can read what. Run with `npx supabase test db`.
begin;
select plan(36);

-- Every check below looks only at its own fixture rows (by id), so seed data or rows made by hand in a dev
-- database cannot change the result.

-- ---- fixtures (inserted as the postgres superuser, which bypasses RLS)
insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'family-a@example.test'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'family-b@example.test');

insert into public.weddings (id, slug, status, bride_name, groom_name, bride_side_upi) values
  ('10000000-0000-0000-0000-00000000000a', 'wedding-a', 'published', 'Diya', 'Aarav', 'diya@upi'),
  ('10000000-0000-0000-0000-00000000000b', 'wedding-b', 'draft', 'Bela', 'Chirag', 'bela@upi');

insert into public.family_members (id, wedding_id, user_id, side, role) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'bride', 'owner'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'groom', 'owner');

insert into public.events (wedding_id, name, starts_at, kind) values
  ('10000000-0000-0000-0000-00000000000a', 'Pheras', '2027-02-14 10:00+05:30', 'pheras'),
  ('10000000-0000-0000-0000-00000000000b', 'Reception', '2027-03-01 19:00+05:30', 'reception');

insert into public.guests (id, wedding_id, display_name) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Mehta family');

insert into public.rsvps (guest_id, event_id, response, party_size)
  select '30000000-0000-0000-0000-00000000000a', id, 'yes', 4 from public.events
  where wedding_id = '10000000-0000-0000-0000-00000000000a';


insert into public.guestbook (wedding_id, guest_name, message)
  values ('10000000-0000-0000-0000-00000000000a', 'Rohan', 'Wishing you both a lifetime of happiness.');
insert into public.blessings (wedding_id, giver_name, amount_paise, method, side) values
  ('10000000-0000-0000-0000-00000000000a', 'Mehta family', 110100, 'upi', 'bride');

-- ---- anonymous guest
set local role anon;

select throws_ok('select * from public.blessings', '42501', null,
  'anon cannot read blessings');
select throws_ok('select * from public.guests', '42501', null,
  'anon has no privilege on guests');
select throws_ok('select * from public.rsvps', '42501', null,
  'anon has no privilege on rsvps');
select is((select count(*) from public.weddings where id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 1,
  'anon sees only the published wedding');
select is((select count(*) from public.events where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 1,
  'anon sees events of the published wedding only');
select throws_ok('select bride_side_upi from public.weddings', '42501', null,
  'anon cannot read UPI IDs from weddings');
select throws_ok('select * from public.guestbook', '42501', null, 'anon cannot read the guestbook');
select throws_ok(
  $$insert into public.guestbook (wedding_id, guest_name, message) values ('10000000-0000-0000-0000-00000000000a', 'x', 'y')$$,
  '42501', null, 'anon cannot write to the guestbook directly (API only)');
select throws_ok(
  $$insert into public.blessings (wedding_id, giver_name, method, side, status)
    values ('10000000-0000-0000-0000-00000000000a', 'x', 'upi', 'bride', 'claimed')$$,
  '42501', null, 'anon cannot insert blessings directly (API only)');

-- ---- family member of wedding A
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select count(*) from public.blessings where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 1,
  'family A reads its own blessings');
select is((select count(*) from public.guests where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 1,
  'family A reads its own guests');
select is((select count(*) from public.rsvps where guest_id = '30000000-0000-0000-0000-00000000000a')::int, 1,
  'family A reads its own rsvps');
select is((select count(*) from public.weddings where id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 1,
  'family A sees wedding A only (wedding B is a draft of someone else)');
select is((select bride_side_upi from public.weddings where id = '10000000-0000-0000-0000-00000000000a'), 'diya@upi',
  'family A can read its own UPI ID');
select is((select count(*) from public.guestbook where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 1,
  'family A reads its own guestbook');

-- Events are written through the API only (it checks who belongs to the wedding). A family member's own
-- database login must not be able to write them, or the API's membership check could be bypassed.
select throws_ok(
  $$insert into public.events (wedding_id, name, starts_at)
    values ('10000000-0000-0000-0000-00000000000a', 'Sneaky event', now())$$,
  '42501', null, 'a family member cannot add an event straight to the database');
select throws_ok($$update public.events set name = 'Changed' where wedding_id = '10000000-0000-0000-0000-00000000000a'$$,
  '42501', null, 'a family member cannot change an event straight in the database');
select throws_ok($$delete from public.events where wedding_id = '10000000-0000-0000-0000-00000000000a'$$,
  '42501', null, 'a family member cannot delete an event straight from the database');

-- ---- family member of wedding B must not see wedding A's money or guests
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

select is((select count(*) from public.blessings where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 0,
  'family B cannot read wedding A blessings');
select is((select count(*) from public.guests where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 0,
  'family B cannot read wedding A guests');
select is((select count(*) from public.guestbook where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 0,
  'family B cannot read wedding A guestbook');
select is((select count(*) from public.events where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 2,
  'family B sees the published wedding A event and its own draft event');

reset role;

-- ---- rule 5: a received blessing must record who received it and when
select throws_ok(
  $$insert into public.blessings (wedding_id, giver_name, method, side, status)
    values ('10000000-0000-0000-0000-00000000000a', 'x', 'cash', 'bride', 'received')$$,
  '23514', null, 'status received without received_by/received_at is rejected');

-- ---- photos: the bucket is public to read, JPEG only and size-capped; nobody but our API (service role) can write to it
select results_eq(
  $$select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'wedding-photos'$$,
  $$values (true, 2097152::bigint, array['image/jpeg']::text[])$$,
  'the photo bucket is public to read, JPEG only and capped at 2 MB');
set local role authenticated;
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('wedding-photos', '10000000-0000-0000-0000-00000000000a/sneaky.jpg')$$,
  '42501', null, 'a signed-in family member cannot put a photo straight into storage (API only)');
reset role;

-- ---- replies: the database refuses answers that make no sense, whoever writes them
select throws_ok(
  $$insert into public.rsvps (guest_id, event_id, response, party_size)
    select '30000000-0000-0000-0000-00000000000a', id, 'no', 2 from public.events
    where wedding_id = '10000000-0000-0000-0000-00000000000a' limit 1$$,
  '23514', null, 'a "not coming" reply cannot bring a party');
select throws_ok(
  $$insert into public.rsvps (guest_id, event_id, response, party_size)
    select '30000000-0000-0000-0000-00000000000a', id, 'perhaps', 1 from public.events
    where wedding_id = '10000000-0000-0000-0000-00000000000a' limit 1$$,
  '23514', null, 'a reply must be yes, maybe or no');
select throws_ok(
  $$update public.guests set edit_code = 'too-short' where id = '30000000-0000-0000-0000-00000000000a'$$,
  '23514', null, 'a guest edit code must be long enough to be unguessable');

-- ---- wishes and UPI: guests read a wish as text and never any money detail
set local role anon;
select throws_ok('select groom_side_upi from public.weddings', '42501', null, 'anon cannot read the groom side UPI ID');
select throws_ok('select bride_side_payee_name from public.weddings', '42501', null, 'anon cannot read the bride side payee name');
select throws_ok('select groom_side_payee_name from public.weddings', '42501', null, 'anon cannot read the groom side payee name');
reset role;
insert into public.wishes (wedding_id, side, title) values ('10000000-0000-0000-0000-00000000000a', 'bride', 'Bless our home');
select throws_ok(
  $$insert into public.wishes (wedding_id, side, title) values ('10000000-0000-0000-0000-00000000000a', 'bride', 'A second bride wish')$$,
  '23505', null, 'a side can have only one wish');
select throws_ok(
  $$insert into public.wishes (wedding_id, side, title) values ('10000000-0000-0000-0000-00000000000a', 'both', 'x')$$,
  '23514', null, 'a wish belongs to the bride side or the groom side');
set local role anon;
select is((select count(*)::int from public.wishes where wedding_id = '10000000-0000-0000-0000-00000000000a'), 1,
  'a guest can read the wish of a published wedding');
reset role;

-- ---- guestbook: sizes are enforced by the database too
select throws_ok(
  $$insert into public.guestbook (wedding_id, guest_name, message) values ('10000000-0000-0000-0000-00000000000a', 'x', '')$$,
  '23514', null, 'a guestbook message cannot be empty');
select throws_ok(
  format($$insert into public.guestbook (wedding_id, guest_name, message) values ('10000000-0000-0000-0000-00000000000a', 'x', %L)$$, repeat('m', 601)),
  '23514', null, 'a guestbook message cannot pass 600 letters');

select * from finish();
rollback;
