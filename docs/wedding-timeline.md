# Wedding planning timeline (Indian multi-event wedding)

Draft for P4-05 (checklist and timeline with owners). Proposal, 18 Nov 2026.

## How it works in the product

- Each task stores `offset_days` relative to the **main wedding day** (negative is before, positive is after). Due date is computed on read, so changing the wedding date moves every task.
- Fields: `title`, `offset_days`, `group`, `owner_side` (`bride` / `groom` / `both`), `owner` (family member, nullable), `done`, `note`.
- The family can edit, delete or add tasks. Events not held (for example no Haldi) drop their tasks with one switch.
- This list is a starter, not advice. Dates, rituals and vendors vary by family and community.

## Starter list

Offsets are approximate months before the wedding. `D` is wedding day.

### 10 to 12 months before

| Task | Offset (days) | Group |
| --- | --- | --- |
| Fix budget range and who pays for what (each side) | -330 | Budget |
| Check muhurat and shortlist dates with the priest | -330 | Rituals |
| Draft guest list per side (rough headcount) | -320 | Guests |
| Shortlist cities and venues | -315 | Venue |
| Book venue for the main event, and lodging if guests travel | -300 | Venue |

### 8 to 10 months before

| Task | Offset (days) | Group |
| --- | --- | --- |
| Book photographer and videographer | -270 | Vendors |
| Book caterer and confirm per-plate rate | -265 | Vendors |
| Book decorator and mandap or stage | -260 | Vendors |
| Book travel for out-of-town family if group bookings are needed | -255 | Travel |
| Choose invitation template and write wording | -240 | Invitation |
| **Send Save the Date** (optional) | -240 | Invitation |

### 5 to 7 months before

| Task | Offset (days) | Group |
| --- | --- | --- |
| Choose outfits for bride and groom and start fittings | -180 | Outfits |
| Book makeup, mehendi artist and music or DJ | -170 | Vendors |
| Finalise events list and timings (mehendi, haldi, sangeet, pheras, reception) | -165 | Events |
| Add venues, dress codes and notes to the invitation | -150 | Invitation |
| Book honeymoon, if any | -150 | Other |

### 3 to 4 months before

| Task | Offset (days) | Group |
| --- | --- | --- |
| **Publish invitation and send on WhatsApp**, household by household | -100 | Invitation |
| Order return gifts and guest welcome items | -95 | Vendors |
| Book guest rooms and transport plan | -90 | Travel |
| Plan sangeet performances and rehearsals | -85 | Events |
| Confirm menu with caterer, including veg and Jain counts | -75 | Catering |

### 1 to 2 months before

| Task | Offset (days) | Group |
| --- | --- | --- |
| **RSVP deadline** | -45 | Invitation |
| Send reminders to those who have not replied | -50 | Invitation |
| Final headcount to caterer and venue | -40 | Catering |
| Final fitting for all outfits | -35 | Outfits |
| Pay vendor advances and note balances due | -35 | Budget |
| Make seating plan if needed | -30 | Guests |
| Share the day-by-day schedule with family | -25 | Events |

### Last month

| Task | Offset (days) | Group |
| --- | --- | --- |
| Confirm every vendor: time, place, contact person | -14 | Vendors |
| Prepare envelopes and cash handling plan for Shagun | -10 | Shagun |
| Print the QR standee for the venue (P2-03) | -10 | Shagun |
| Assign one helper per event for the ledger and photo uploads | -7 | Shagun |
| Pack wedding-day kit (documents, emergency items, chargers) | -5 | Other |
| Settle vendor balances due before the day | -3 | Budget |

### After the wedding

| Task | Offset (days) | Group |
| --- | --- | --- |
| Mark every blessing Received or Not received in the ledger | +2 | Shagun |
| Send thank-you notes (P3-01) | +7 | Shagun |
| Collect and approve guest photos, open the album | +7 | Photos |
| Get final photos and videos from the photographer | +30 | Vendors |
| Settle remaining vendor payments, close the budget | +30 | Budget |

## Product notes

- **Tasks that link to features**: bold rows can deep-link into the app (publish, RSVP summary, ledger, album) once those exist.
- **Reminders**: P4-04 payment due reminders can reuse `offset_days` for vendor balances.
- **Multi-day events**: events other than the main one get their own optional tasks (for example Haldi: turmeric, outfits, music). Add as event-kind packs after the first real wedding shows which are used.
