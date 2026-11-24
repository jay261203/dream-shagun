# Invitation page and guest/RSVP spec

Proposal, 18 Nov 2026. Extends PROJECT.md sections 1b and 6. Nothing here changes Phase 1 scope except two small additions marked **P1**. The rest is tagged with its phase and stays unbuilt until that phase starts.

## 1. Guest page sections (`/w/[slug]`)

Order is the default; the family can switch sections on or off (`weddings.sections_enabled`) and, later, reorder them.

| `data-section` | Content | Phase |
| --- | --- | --- |
| `cover` | Opening animation, both names, date, tagline. Always on | P1 |
| `couple` | Short story, photo | P1 |
| `journey` | Dated moments timeline (P1-05a) | P1 |
| `events` | Card per event: name, date and time, venue, map button, **add to calendar**, **dress code**, **note** | P1 |
| `countdown` | Days to the first event | P1 |
| `rsvp` (slot) | Reply per event, see section 3 | P1 |
| `blessing` (slot) | Optional Shagun flow | P1 |
| `travel` | Nearby stay, how to reach, parking. Free text plus links | P2 |
| `faq` | Question and answer list (children, gifts, photography, weather) | P2 |
| `album` (slot) | Photos grouped by event | P2 |
| `contact` | Family contact for questions, phone or WhatsApp button | P1 |

Rules: every section degrades to nothing when empty; the page works with only `cover`, `events` and `rsvp`.

Templates that cannot show a section must declare it in `manifest.json` under `sections_supported`.

## 2. Event fields (P1-04)

Add three columns to `events` so templates can render them from day one:

| Column | Type | Example |
| --- | --- | --- |
| `kind` | text | `mehendi`, `haldi`, `sangeet`, `pheras`, `reception`, `other`. Drives the default icon and a suggested name |
| `dress_code` | text, nullable | `Pastel, Indian wear` |
| `note` | text, nullable | `Lunch will be served` |

Add-to-calendar: generate an `.ics` from `starts_at`, `name`, `venue_name`, `venue_address`. No new table.

## 3. Guests and RSVP

### Two ways a guest replies

1. **Open link** (`/w/[slug]`, the same link sent to a group chat). Guest types their name and replies. A `guests` row is created with `link_code` null and `source = 'open'`.
2. **Personal link** (`/w/[slug]?g=<link_code>`, P2-05). Name and party limit are pre-filled. `link_code` is an unguessable token (16+ random characters), never a sequential id.

Both work with no login (rule 4).

### Changes to `guests` and `rsvps`

| Table | Column | Type | Phase | Why |
| --- | --- | --- | --- | --- |
| `weddings` | `rsvp_deadline` | date, nullable | P1 | Shown on the page; closes new replies after it unless the family reopens |
| `guests` | `household` | text, nullable | P2 | Groups people sent one personal link ("Mehta family"). A plain label first; becomes a table in P4-07 if needed |
| `guests` | `max_party` | int, default 1 | P2 | Plus-one limit the family sets per link; the form cannot exceed it |
| `guests` | `source` | text (`open`/`personal`/`family_added`) | P1 | Tells the family how the row got there |
| `guests` | `invite_sent_at` | timestamptz, nullable | P2 | For the send queue and reminders |
| `rsvps` | `allergies` | text, nullable | P1 | Feeds the caterer summary |
| `rsvps` | `party_size` | already exists | P1 | Capped by `max_party` once that exists |

Keep `food_choice` as `veg`/`jain`/`other`. Add a free-text `food_note` only if the first real wedding asks for it.

### Behaviour

- One reply per guest per event; editing replaces it, with `updated_at` kept.
- A guest who says "not attending" is asked once for an optional blessing, never pushed.
- The guest list and replies are readable only by family members (existing RLS in PROJECT.md section 6).
- Rate-limit the public POST by IP and wedding.

### Family views

- **RSVP summary (P1-11)**: per event, attending count (sum of `party_size`), veg / jain / other split, and an allergies list. This is the caterer summary.
- **Pending list (P2)**: guests with `invite_sent_at` set and no reply, with a "Remind" button.

## 4. Send queue (new task P2-05b)

For a family sending to 100+ households by WhatsApp:

1. Family adds guests (name, phone, household, max party), by hand or CSV import.
2. Screen shows one row per household with a **Send on WhatsApp** button. It opens `https://wa.me/<phone>?text=<message>` with the personal link and a ready message in the chosen language. Marking sent sets `invite_sent_at`.
3. Same screen, filter "Not replied", with a **Remind** button and a different message.

We never send messages ourselves; WhatsApp Business API stays in the parking lot. The message text is editable and stored per wedding.

## 5. Open points

- Should an open-link guest be able to edit their reply later? **Decided in P1-06: yes, with a random edit code (`guests.edit_code`) kept in the guest's own browser.** A name and phone digits would let anyone who knows a guest change their reply. The cost: on another phone or after clearing the browser the guest replies again, so the family may see two rows for one person.
- Do both sides share one RSVP list? Proposal: yes, with `side` shown as a filter. Confirms rule 6 only covers money and UPI.
