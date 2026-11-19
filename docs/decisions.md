# Decisions

One line per decision, newest last.

| Date | Decision | Why |
| --- | --- | --- |
| 15 Nov 2026 | Side project, India only, weddings first | Small scope; a real wedding is the test |
| 15 Nov 2026 | Web app opened from WhatsApp; no native app | Guests and older relatives will not install an app |
| 15 Nov 2026 | Direct UPI to the family; no gateway, no money held | No payment licence needed; less risk |
| 15 Nov 2026 | No targets or progress bars on blessings | Avoids "asking for money" embarrassment |
| 17 Nov 2026 | Invitations are HTML templates with placeholders and slots | New looks without changing product code |
| 17 Nov 2026 | Sprint 0 started early: 17 to 22 Nov; Sprint 1 moved to 23 to 29 Nov | Started a week ahead of plan |
| 18 Nov 2026 | Pay screen: blessing is optional and UPI is a convenience, not a requirement. Phones show "Pay with UPI" first, then the QR and "Copy UPI ID" as fallbacks. Desktop shows the QR first. After paying, ask "Did the payment go through?" | Default from the plan. Per-app test results were not recorded, so revisit if guests report a link that fails |
| 18 Nov 2026 | Supabase free tier: 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly users, paused after 1 week idle, 2 active projects | Photo album (phase 2) will outgrow 1 GB; revisit before P2-07 |
| 18 Nov 2026 | Borrow feature ideas from The Digital Yes (RSVP details, WhatsApp send queue, date-relative checklist), never their designs or copy | Matches the template rule in PROJECT.md 1b; specs in `docs/invitation-spec.md` and `docs/wedding-timeline.md` |
| 18 Nov 2026 | Clients get no insert/update/delete on any table; all writes go through the API with the service role. Guests read published weddings without UPI columns | A guest could otherwise insert a blessing already marked received; API validates and rate-limits (PROJECT.md section 8) |
| 18 Nov 2026 | Dockerize web and api with a `dev` and `prod` target each; docker-compose for local; Supabase stays on the Supabase CLI | Same runtime locally and in production, any service can run alone; Supabase CLI already matches the hosted service |
| 19 Nov 2026 | Family login is Google sign-in first; phone OTP moves to the parking lot | No SMS provider needed to start; the API only checks a Supabase token either way |
| 17 Nov 2026 | Employment contract check: side project is legal and allowed by the company | Confirmed by Jay; no written approval needed |
