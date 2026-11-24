-- Guests can answer Coming, Maybe or Not coming, so a yes/no flag is not enough. `response` holds the answer and
-- `attending` stays as a computed column so counts like "attending = true" keep working.
-- No real replies exist yet, so the old column can be replaced without a copy.
alter table public.rsvps drop column attending;
alter table public.rsvps add column response text not null default 'yes' check (response in ('yes', 'no', 'maybe'));
alter table public.rsvps alter column response drop default;
alter table public.rsvps add column attending boolean generated always as (response = 'yes') stored;
alter table public.rsvps add constraint rsvps_allergies_length check (allergies is null or char_length(allergies) <= 300);
alter table public.rsvps add constraint rsvps_party_matches_response check (response <> 'no' or party_size = 0);

-- A guest who replied without logging in can change that reply later from the same browser, using this code.
-- It is random and never shown to anyone but the browser that received it (and the family, who can read the guest row).
alter table public.guests add column edit_code text unique check (edit_code is null or char_length(edit_code) >= 24);
