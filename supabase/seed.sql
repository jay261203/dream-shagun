-- Local development data, applied by `supabase db reset`. Never runs against a hosted project.
-- The couple is the Phase 0 test wedding (test data, not a real family).

insert into public.weddings (
  id, slug, status, bride_name, groom_name, wedding_date, story, template_id, color_preset, font_pair,
  sections_enabled, languages, rsvp_deadline
) values (
  '11111111-1111-1111-1111-111111111111', 'sample-marigold', 'published', 'Diya', 'Aarav', '2027-02-14',
  E'We met at a friend''s wedding in Surat and have not stopped talking since.\nOur families are delighted. We hope you will join us.',
  'marigold', 'marigold', 'classic',
  '{cover,couple,journey,events,rsvp,blessing}', '{en}', '2027-01-31'
);

insert into public.events (wedding_id, name, starts_at, venue_name, venue_address, map_url, sort_order, kind, dress_code, note) values
  ('11111111-1111-1111-1111-111111111111', 'Mehendi',   '2027-02-12T11:30:00Z', 'Home, Navrangpura',  'Navrangpura, Ahmedabad', 'https://maps.example/home',   1, 'mehendi',   'Pastel, comfortable', 'Lunch will be served.'),
  ('11111111-1111-1111-1111-111111111111', 'Sangeet',   '2027-02-13T13:30:00Z', 'Vasant Lawns',       'Satellite, Ahmedabad',   'https://maps.example/lawns',  2, 'sangeet',   'Colourful, Indian wear', 'Dinner will be served.'),
  ('11111111-1111-1111-1111-111111111111', 'Pheras',    '2027-02-14T05:00:00Z', 'Vasant Lawns',       'Satellite, Ahmedabad',   'https://maps.example/lawns',  3, 'pheras',    null, null),
  ('11111111-1111-1111-1111-111111111111', 'Reception', '2027-02-14T14:00:00Z', 'Vasant Lawns',       'Satellite, Ahmedabad',   'https://maps.example/lawns',  4, 'reception', 'Formal, Indian wear', null);

insert into public.moments (wedding_id, title, happened_on, caption, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'We met',      '2023-03-01', 'At a friend''s wedding in Surat.', 1),
  ('11111111-1111-1111-1111-111111111111', 'He asked',    '2025-12-01', 'On the terrace, with both families waiting inside.', 2);
