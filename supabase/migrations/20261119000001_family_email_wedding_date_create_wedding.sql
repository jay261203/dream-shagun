-- P1-03 (DS-12): Google sign-in, wedding date, and creating a wedding with its owner in one step.

-- Family members now sign in with Google, so we keep their email. Phone stays for a later OTP option.
alter table public.family_members add column email text;

-- The date the couple enters in "Try with your names". Events carry their own dates.
alter table public.weddings add column wedding_date date;

-- Anonymous guests may read the wedding date (it is on the invitation).
grant select (wedding_date) on public.weddings to anon;

-- Create a wedding and make the caller its owner atomically. A single function means a failure
-- can never leave a wedding with no owner. Only the API (service role) may call it, after it has
-- checked the login token; clients cannot.
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
  p_template_id text default null
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
    slug, bride_name, groom_name, wedding_date, story, cover_photo_url, template_id
  )
  values (
    p_slug, p_bride_name, p_groom_name, p_wedding_date, p_story, p_cover_photo_url, p_template_id
  )
  returning * into new_wedding;

  insert into public.family_members (wedding_id, user_id, email, side, role)
  values (new_wedding.id, p_user_id, p_email, p_side, 'owner');

  return new_wedding;
end;
$$;

revoke execute on function public.create_wedding(uuid, text, text, text, text, text, date, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_wedding(uuid, text, text, text, text, text, date, text, text, text)
  to service_role;
