-- P1-03 (DS-12): create_wedding makes the wedding and its owner together, and only the API can call it.
begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.test');

-- ---- as the API (service role)
set local role service_role;

select lives_ok(
  $$select public.create_wedding(
      '00000000-0000-0000-0000-0000000000c1', 'owner@example.test', 'bride',
      'Diya', 'Aarav', 'diya-and-aarav', '2027-02-14', 'Our story', null, null)$$,
  'service role can create a wedding');

select is((select status from public.weddings where slug = 'diya-and-aarav'), 'draft',
  'new wedding starts as a draft');
select is((select wedding_date from public.weddings where slug = 'diya-and-aarav'), '2027-02-14'::date,
  'wedding date is saved');

select lives_ok(
  $$select public.create_wedding(
      '00000000-0000-0000-0000-0000000000c1', 'owner@example.test', 'groom',
      'Riya', 'Karan', 'colour-test-wedding', null, null, null, 'marigold', 'rose')$$,
  'a template and colour can be chosen at creation');
select is((select template_id || '/' || color_preset from public.weddings where slug = 'colour-test-wedding'), 'marigold/rose',
  'the chosen template and colour are saved');
select is(
  (select role || '/' || side || '/' || email from public.family_members fm
     join public.weddings w on w.id = fm.wedding_id where w.slug = 'diya-and-aarav'),
  'owner/bride/owner@example.test',
  'creator is the owner on the chosen side with their email');

select throws_ok(
  $$select public.create_wedding(
      '00000000-0000-0000-0000-0000000000c1', 'owner@example.test', 'bride',
      'Other', 'Couple', 'diya-and-aarav')$$,
  '23505', null, 'a taken slug is rejected as a unique violation');

select is((select count(*) from public.weddings where slug = 'diya-and-aarav')::int, 1,
  'the failed attempt left no extra wedding');

select throws_ok(
  $$select public.create_wedding(
      '00000000-0000-0000-0000-0000000000c1', 'owner@example.test', 'sideways',
      'A', 'B', 'bad-side-wedding')$$,
  '23514', null, 'an invalid side is rejected');

select is((select count(*) from public.weddings where slug = 'bad-side-wedding')::int, 0,
  'a failed owner insert rolls the wedding back too');

-- ---- clients cannot call it
reset role;
set local role authenticated;
select throws_ok(
  $$select public.create_wedding(
      '00000000-0000-0000-0000-0000000000c1', 'x@example.test', 'bride', 'A', 'B', 'sneaky-wedding')$$,
  '42501', null, 'logged-in clients cannot call create_wedding directly');

reset role;
select * from finish();
rollback;
