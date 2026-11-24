# Product ideas (evaluated, not committed)

From a planning conversation on 24 Nov 2026, checked against the repo. Nothing here is a ticket until it is chosen.
Prices and competitor figures in that conversation were its own estimates and are not verified.

## Take, in this order

| Idea | Why | Fits our design | Rough size |
| --- | --- | --- | --- |
| Invitation lifecycle (save the date, invitation, event day, thank-you, memory page) | One link that stays useful; distinctive | Templates already switch sections on and off, so stages are sets of sections | Medium |
| Invitation kit (WhatsApp image, story image, PDF, QR from the same template) | WhatsApp-first users share images, not links | Template renderer plus a screenshot step | Medium |
| Smart guest groups (each guest sees only their functions) | Wedding guests rarely attend every function | Events already exist per invitation; guests and replies are per event | Medium |
| Live announcements (venue change, delay) | Cheap and useful on the day | A text block on the invitation | Low |
| Digital guestbook (messages and photos, with or without a gift) | Works for every occasion | New table, family approval | Low to medium |
| Custom RSVP questions, event duplication, privacy passcode | Common asks | Extends the reply form and the editor | Low to medium |

## Later, only after customers pay

QR check-in, capacity and waitlist, seating chart, analytics, scheduled publishing, AI wording, designer marketplace,
white-label workspaces, ticketing, vendor and budget tools.

## Not in the plan yet, needed for "global"

- **Data protection:** guest names and phone numbers are personal data (GDPR, India's DPDP Act): a privacy notice, a
  deletion path and a retention rule before a public launch.
- **Platform payments:** charging hosts for plans needs a gateway (Razorpay for India, Stripe elsewhere). Guests' gifts
  still go straight to the host; we never hold them.
- **Private photos:** journey and cover photos are public on purpose. A guest album (P2-07) needs a private bucket and
  signed links.

## Housekeeping found in the same review

- `docs/upi-test.md` has an empty results table; the decision to keep the default pay layout was made without the
  results. Run the test on real phones when possible and fill it in.
- The Phase 1 success test (10 guests send a blessing) measures the wedding gift flow only. A general measure is
  published invitations that real guests open and reply to; decide before Phase 1 ends.
- Direct public database inserts for replies and blessings are not described anywhere current; all guest writes go
  through the API (the migration comment explains why).
