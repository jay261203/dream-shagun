-- Each side of the family writes one short wish that guests see before they send a blessing. Guests may read the
-- wish (it is public text); the UPI ID and payee name next to it stay in the weddings table, which guests cannot read.
alter table public.wishes add column side text check (side in ('bride', 'groom'));
create unique index wishes_one_per_side on public.wishes (wedding_id, side) where side is not null;
