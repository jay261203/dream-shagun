-- How the invitation treats gifts. 'link' shows a small "Gifts" link under the replies and messages, 'private' keeps the
-- gift page working for anyone you send its address to but shows no link, 'off' turns the page off. Every invitation that
-- exists today is a wedding, so 'link' is the default; once occasions exist, only weddings will start with it on.
alter table public.weddings add column gift_mode text not null default 'link' check (gift_mode in ('off', 'link', 'private'));

grant select (gift_mode) on public.weddings to anon;
