-- P1-01 (DS-10): proves who can read what. Run with `npx supabase test db`.
begin;
select plan(16);

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

insert into public.rsvps (guest_id, event_id, attending, party_size)
  select '30000000-0000-0000-0000-00000000000a', id, true, 4 from public.events
  where wedding_id = '10000000-0000-0000-0000-00000000000a';

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

-- ---- family member of wedding B must not see wedding A's money or guests
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

select is((select count(*) from public.blessings where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 0,
  'family B cannot read wedding A blessings');
select is((select count(*) from public.guests where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 0,
  'family B cannot read wedding A guests');
select is((select count(*) from public.events where wedding_id in ('10000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000b'))::int, 2,
  'family B sees the published wedding A event and its own draft event');

reset role;

-- ---- rule 5: a received blessing must record who received it and when
select throws_ok(
  $$insert into public.blessings (wedding_id, giver_name, method, side, status)
    values ('10000000-0000-0000-0000-00000000000a', 'x', 'cash', 'bride', 'received')$$,
  '23514', null, 'status received without received_by/received_at is rejected');

select * from finish();
rollback;
