-- DS-12: keep the colour a visitor picked on "Try with your names" when the wedding is created.
-- Replaces create_wedding with one extra, optional argument. Same rules as before: only the API (service role) may call it.

drop function if exists public.create_wedding(uuid, text, text, text, text, text, date, text, text, text);

create or replace function public.create_wedding(
  p_user_id uuid,
  p_email text,
  p_side text,
  p_bride_name text,
  p_groom_name text,
  p_slug text,
  p_wedding_date date default null,
  p_story text default null,
  p_cover_photo_url text default null,
  p_template_id text default null,
  p_color_preset text default null
)
returns public.weddings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_wedding public.weddings;
begin
  insert into public.weddings (
    slug, bride_name, groom_name, wedding_date, story, cover_photo_url, template_id, color_preset
  )
  values (
    p_slug, p_bride_name, p_groom_name, p_wedding_date, p_story, p_cover_photo_url, p_template_id, p_color_preset
  )
  returning * into new_wedding;

  insert into public.family_members (wedding_id, user_id, email, side, role)
  values (new_wedding.id, p_user_id, p_email, p_side, 'owner');

  return new_wedding;
end;
$$;

revoke execute on function public.create_wedding(uuid, text, text, text, text, text, date, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_wedding(uuid, text, text, text, text, text, date, text, text, text, text)
  to service_role;
