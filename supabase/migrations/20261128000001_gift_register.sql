-- DS-25 P1-10: the hosts' private gift register.
--
-- The register reuses public.blessings. Two things it needs that the table did not have:
--   source       who wrote the row: 'guest' (an "I sent a gift" note from the gift page, unverified until a host confirms)
--                or 'host' (a gift a host recorded by hand: cash, a UPI transfer seen in the bank app, a physical gift).
--   description  what a physical gift was ("Silver diya set"), since it has no amount.
--
-- Reading stays as it was: only the invitation's family can select rows (blessings_select), anon sees nothing, and
-- nobody writes through the client. Every write goes through the API, which checks membership first.

alter table public.blessings
  add column source text not null default 'guest' check (source in ('guest', 'host')),
  add column description text check (description is null or char_length(description) between 1 and 200);
