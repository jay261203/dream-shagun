# Reference notes: The Digital Yes

Studied 18 Nov 2026 from the public site (home, pricing, how-it-works, planner). This is for **studying the flow and the feature set only**. We do not copy their designs, copy, images, template names or code (PROJECT.md section 1b).

## What they sell

1. **Designer-made digital invitation**: a private mini-site per wedding, opened from one link. RSVP inside it, no login. €175 / €575 / €975 per wedding by customisation level. 36 designs.
2. **Yes Planner** (€39 once): send invitations by WhatsApp per household, RSVP tracking, guest list by family, budget and payments, 12-month task list that moves with the date, table seating, caterer totals and allergies, wedding-day binder, PDF/Excel export, offline, up to 3 editors.

## How it maps to us

| Their feature | Our status | Where it lands |
| --- | --- | --- |
| Single private link, opened from WhatsApp | Already core | P1-05 |
| Sections the couple can switch on or off | Already planned | P1-T1, P1-T4 (`sections_enabled`) |
| Countdown, map buttons, add-to-calendar | Countdown and maps planned; **add-to-calendar is new** | P1-05 (add `.ics` link, small) |
| Dress code, programme, FAQ, travel and stay, gifts | Partly. **New: per-event dress code and notes; "Travel and stay" and "FAQ" sections** | P1-04 (event columns), P1-T2 (sections). See `invitation-spec.md` |
| RSVP with menu, allergies, plus-ones, no login | RSVP and food choice planned. **New: allergies, per-guest plus-one limit, RSVP deadline** | P1-06, P2-05 |
| Language switch for guests | Planned | P2-06 |
| Personal link per household | Planned | P2-05 |
| Send by WhatsApp one household at a time with a pre-written message | **New: "Send queue" for the family** | P2-05b (see below) |
| Guests grouped by family, with tables and catering | Phase 4 | P4-07 |
| RSVP reminders for non-repliers | **New** | P2-05b |
| Budget: planned, booked, paid, to-pay | Phase 4 | P4-01, P4-02 |
| 12-month task list that recalculates with the date | Phase 4 | P4-05. Template in `wedding-timeline.md` |
| Table seating, auto-assign | **New, Phase 4 late** | Parking lot |
| Caterer summary: headcount, veg/jain, allergies | Follows from RSVP data | P1-11 extended |
| Wedding-day binder, weather, wedding-day mode | Not needed now | Parking lot |
| PDF/Excel export | Ledger export planned | P3-02 |
| Save the Date | **New, cheap: same template, fewer sections** | Parking lot, then P2-10 |
| Shared access for 3 people | Planned (`family_members`, owner/helper) | P1-03 |

## Where we are deliberately different

- **Blessing by UPI and the Shagun ledger.** They have nothing like it. It is our reason to exist.
- **Photo album on the same link.** Not in their feature list.
- **Self-serve templates, not a human designer.** Cheaper, faster, and fits "try with your names" before login.
- **Indian multi-event weddings.** One invitation, many events (Mehendi, Haldi, Sangeet, Pheras, Reception), each with its own venue, dress code and RSVP. Also two sides (bride and groom) that stay separate.
- **India-first channel and pricing.** WhatsApp is the default; prices in rupees (their pricing is euro, so it is not a model for ours).

## Cautions from their site

- They gate everything on a paid purchase and a designer's calendar (7 to 14 days). Our "try with your names, no login" is the opposite and is a strength.
- Their planner is a separate paid product. We should keep planning inside the same account in Phase 4, not sell it separately.
