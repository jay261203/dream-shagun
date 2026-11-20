# Dream Shagun (working name)

Single source of truth for the build. Keep this file at the root of the repo and update it as work is done. Full plan with reasons: https://claude.ai/artifact/38EvvCHFXcjoLmUdA27Yz9

Last updated: 15 Nov 2026

---

## 1. What we are building

A wedding invitation link, opened from WhatsApp with nothing to install, where:

- **Guests** open a digital invitation, read the couple's journey, see the events, RSVP, and send a blessing with Shagun by UPI and a personal note.
- **Everyone** shares and keeps the wedding photos in one album on the same link, grouped by event.
- **The family** builds the invitation, sees replies, and keeps one ledger of every gift (UPI, cash envelope or physical gift).
- **Later (phase 4)** the family also manages budget, expenses, checklist and vendors, and photographers or planners get a partner workspace.

## 1a. Product flow

**Family (the buyer)**

1. Lands on the home page and browses the template gallery, filtered by tradition, style and language. No login.
2. Opens a template as a full live preview with sample data.
3. Taps "Try with your names", enters both names and the date, and sees the same template with their details. Still no login.
4. Taps "Save and continue" and signs in with Google. The draft is saved.
5. Editor: fills events, journey moments and photos; switches sections on or off; picks a colour preset, font pair and music. A phone-sized live preview sits beside the form.
6. Shares the draft link with family for a check (marked "Draft", not for guests).
7. Publishes: picks a plan, pays if the plan is paid, and gets the live link, a ready WhatsApp message and a QR code.
8. After publishing, the dashboard shows replies, the Shagun ledger and the album.

**Guest**

1. Taps the link in WhatsApp and sees an opening animation (an envelope or doors) with the couple's names.
2. Scrolls: couple, journey, events with map buttons and countdown.
3. Replies per event.
4. Sends a blessing (optional).
5. Sees and adds photos once the album is open.

Two kinds of money, kept apart: guests' Shagun goes straight to the family by UPI and never touches us; the family's payment for a plan comes to us through a payment gateway like any online purchase.

## 1b. Template system

Templates are plain HTML and CSS so new looks can be added without touching product code.

```
templates/<template-id>/
├── manifest.json   # name, tradition, style, languages, preview image, colour presets,
│                   # font pairs, sections supported, default music, licence
├── template.html   # HTML with placeholders and slots
├── styles.css      # uses CSS variables for colours and fonts
├── effects.js      # optional: opening animation, scroll reveals, petals
└── assets/
```

- **Placeholders** use Handlebars: `{{bride_name}}`, `{{groom_name}}`, `{{#each events}}...{{/each}}`, `{{#each moments}}...{{/each}}`. Handlebars escapes values by default, which stops injected HTML.
- **Sections** are marked `<section data-section="journey">` so the editor can switch them on or off.
- **Slots** are empty elements such as `<div data-slot="rsvp"></div>`, `data-slot="blessing"`, `data-slot="album"`, `data-slot="countdown"`. Our own React components mount into them, so RSVP, blessing and album work the same in every template.
- **Themes**: each colour preset and font pair in the manifest sets CSS variables (`--color-primary`, `--font-heading`), so one template gives several looks.
- **Rendering**: the server fills the template for `/w/[slug]` and sends finished HTML, so the WhatsApp preview and first paint are fast.

**Dynamic effects, with limits**

- Opening animation, scroll-reveal, countdown, floating petals or lights, and a music button.
- Music never starts by itself with sound; browsers block that. Show a "Tap to play music" button.
- Honour the phone's reduced-motion setting, and keep the first load light (aim under about 1.5 MB) because guests open it on mobile data.
- `effects.js` may not call any outside server.

**Where templates come from**

- We design our own, or adapt open-licensed HTML templates (MIT, CC0 or similar) and record the licence in the manifest.
- Never copy the designs, images or code of another invitation product. Reference sites such as myinvitations.io are for studying the flow, not for taking templates.
- Images and music need their own licence check too.

## 2. Rules that do not change

1. **We never hold money.** Payment goes from the guest's UPI app straight to the family's account.
2. **A blessing, not a fundraiser.** No target amounts, no progress bars, no totals shown to guests.
3. **Amounts are private.** A guest never sees what another guest gave.
4. **Guests never log in.** Only family members log in (Google sign-in first; phone OTP later).
5. **Only the family's "Received" tap counts** towards ledger totals. A guest's "I paid" is a claim, not proof.
6. **Bride's side and groom's side are separate** for UPI IDs, ledger and (later) expenses.
7. **One phase at a time.** Nothing from a later phase is built until the current phase passes its test.
8. **Photos are the family's.** The album is seen only through the wedding link, guest uploads appear only after a family member approves them, and the family can hide or delete any photo.

## 3. Tech stack

| Part | Choice |
| --- | --- |
| Guest page and family dashboard | Next.js (App Router, TypeScript, Tailwind) |
| API | FastAPI (Python 3.12) |
| Database, auth, file storage | Supabase (Postgres, Google sign-in, storage buckets) |
| Payment | UPI deep link and QR code generated by us; no gateway |
| Containers | Docker: one Dockerfile per service (`dev` and `prod` targets) and `docker-compose.yml` for local; Supabase runs through its CLI |
| Hosting | Vercel (web), Render or Railway (API, `prod` image) |
| Analytics | PostHog (optional, after phase 1) |

## 4. Repo layout

```
dream-shagun/
├── PROJECT.md            # this file
├── README.md             # how to run locally
├── docker-compose.yml    # local web + api with hot reload
├── web/                  # Next.js app (Dockerfile)
│   ├── app/
│   │   ├── w/[slug]/             # guest page (public)
│   │   ├── w/[slug]/bless/       # blessing flow
│   │   ├── dashboard/            # family dashboard (login required)
│   │   └── login/
│   ├── components/
│   └── lib/
├── api/                  # FastAPI app (Dockerfile)
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/              # weddings, events, rsvp, blessings, ledger
│   │   ├── models/               # Pydantic schemas
│   │   ├── services/             # upi.py, qr.py, auth.py
│   │   └── db.py
│   └── tests/
├── templates/            # one folder per invitation template (see section 1b)
├── supabase/
│   └── migrations/       # SQL files, one per change, numbered
└── docs/
    ├── architecture.md   # how the system fits together, Docker, deployment, trade-offs
    ├── decisions.md      # one line per decision, with date
    └── upi-test.md       # results of the phase 0 test
```

## 5. How we manage the work

- **Tasks live in this file** (sections 9 to 11) as checkboxes. Tick them here in the same commit that finishes the work.
- **One branch per task**, named `p1-rsvp`, `p1-ledger` and so on. Merge to `main` only when it works on a real phone.
- **Commit messages** start with the task number: `P1-06 blessing form`.
- **Weekly check (15 minutes, same day each week):** what shipped, what is blocked, is the phase test closer.
- **Decisions** go in `docs/decisions.md` with the date, so we do not re-argue them.
- **Scope rule:** a new idea goes to section 12 (Parking lot), not into the current phase.

### Definition of done for any task

- Works on an Android phone and an iPhone in the browser, opened from a WhatsApp link.
- Works on a slow connection (test with browser throttling).
- No ledger data is readable without a family login for that wedding.
- API route has at least one test.
- This file is updated.

### Working with Claude on this

Open the repo, point Claude at this file and say: "Do the next unchecked task in PROJECT.md." Review, test on a phone, then tick the box.

## 6. Data model (phase 1 to 3)

Every table has `id uuid primary key`, `created_at timestamptz default now()`.

| Table | Columns |
| --- | --- |
| `weddings` | `slug` (unique), `status` (`draft`/`published`), `bride_name`, `groom_name`, `story`, `cover_photo_url`, `template_id`, `color_preset`, `font_pair`, `music_url`, `sections_enabled text[]`, `languages text[]`, `bride_side_upi`, `groom_side_upi`, `bride_side_payee_name`, `groom_side_payee_name`, `blessings_enabled bool`, `rsvp_deadline date` (nullable), `wedding_date date` (nullable) |
| `family_members` | `wedding_id`, `user_id` (Supabase auth), `email`, `phone` (nullable), `side` (`bride`/`groom`), `role` (`owner`/`helper`) |
| `events` | `wedding_id`, `name`, `starts_at`, `venue_name`, `venue_address`, `map_url`, `sort_order`, `kind`, `dress_code` (nullable), `note` (nullable) |
| `guests` | `wedding_id`, `display_name`, `phone` (nullable), `side`, `link_code` (unique, nullable), `source` (`open`/`personal`/`family_added`) |
| `rsvps` | `guest_id`, `event_id`, `attending bool`, `party_size int`, `food_choice` (`veg`/`jain`/`other`), `allergies` (nullable) |
| `wishes` | `wedding_id`, `title`, `image_url`, `sort_order` (no target amount, ever) |
| `blessings` | `wedding_id`, `guest_id` (nullable), `giver_name`, `wish_id` (nullable), `amount_paise int`, `note`, `media_url` (nullable), `method` (`upi`/`cash`/`gift`), `status` (`claimed`/`received`/`rejected`), `side`, `received_by` (family_member id), `received_at` |
| `thank_yous` | `blessing_id`, `message`, `photo_url`, `sent_at` |
| `moments` | `wedding_id`, `title`, `happened_on date`, `caption`, `photo_url`, `sort_order` (the "Our journey" timeline) |
| `photos` | `wedding_id`, `event_id` (nullable), `storage_path`, `thumb_path`, `width`, `height`, `bytes`, `uploaded_by` (`family`/`guest`/`partner`), `uploader_name`, `status` (`pending`/`approved`/`hidden`) |

Photos: resize on upload to a web size (about 2,000 px on the long side) plus a thumbnail, and keep a running `bytes` total per wedding with a cap. Free storage tiers are small, so check the current Supabase limit before phase 2 and move to cheaper object storage if needed.

Row-level security: public can read `weddings`, `events`, `wishes` by slug, and insert `rsvps` and `blessings`. Only `family_members` of that wedding can read `guests`, `rsvps`, `blessings`, `thank_yous`.

Store money as integer paise. Never use floats for amounts.

## 7. UPI link and QR

Standard UPI deep link, built on the server in `api/app/services/upi.py`:

```
upi://pay?pa=<payee UPI ID>&pn=<payee name>&am=<amount in rupees, 2 decimals>&cu=INR&tn=<short note>
```

- URL-encode every value.
- `tn` should be short, for example `Shagun from Mehta family`.
- The QR code encodes the same string.
- On a phone show a "Pay with UPI" button (the link), plus the QR and a "Copy UPI ID" button as fallbacks. On desktop show the QR.
- We get no callback. After the guest returns, ask "Did the payment go through?" and save the blessing with status `claimed`.

**Status:** per-app results were not recorded in Phase 0. The pay screen uses the default layout in `docs/decisions.md`, and UPI stays optional for guests. Offer all three methods so one failing leaves the others.

## 8. API routes (phase 1)

| Method | Route | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/weddings/{slug}` | public | Invitation data: couple, events, wishes |
| POST | `/weddings` | family | Create a wedding |
| PATCH | `/weddings/{id}` | family | Edit details and UPI IDs |
| POST | `/weddings/{id}/events` | family | Add an event |
| POST | `/weddings/{slug}/rsvp` | public | Save a guest's replies |
| POST | `/weddings/{slug}/blessings/intent` | public | Returns UPI link and QR for chosen side and amount |
| POST | `/weddings/{slug}/blessings` | public | Save a claimed blessing with note |
| GET | `/weddings/{id}/ledger` | family | List blessings with totals of `received` only |
| POST | `/blessings/{id}/receive` | family | Mark received |
| POST | `/blessings/{id}/reject` | family | Mark not received |
| GET | `/weddings/{id}/rsvps` | family | Replies and headcount per event |

Rate-limit the public POST routes by IP and wedding.

## 9. Phase 0: UPI check (week 1)

Test: we know which of button, QR and copy-ID work, and section 7 is updated to match.

- [x] P0-01 Create the GitHub repo with the layout in section 4
- [x] P0-02 Create the Supabase project (India region if available) and save keys in `.env.local`, never in git
- [x] P0-03 Build one static page with a UPI button, a QR and a copy-ID button pointing at your own UPI ID for ₹1
- [x] P0-04 Test on Google Pay, PhonePe and Paytm, on Android and iPhone, opened from a WhatsApp message; record results in `docs/upi-test.md`
- [x] P0-05 Decide the payment screen layout from the results and note it in `docs/decisions.md`
- [x] P0-06 First wedding (TEST DATA, replace with the real family before Phase 1 ends): Aarav Mehta and Diya Shah, 14 Feb 2027, contact +91 90000 00000, Shagun goes to the couple. Not a real family yet.
- [x] P0-07 Check your employment contract for side-project and IP clauses

## 10. Phase 1: invitation and blessing (weeks 2 to 5, four sprints)

Sprint 1: P1-01 to P1-03, P1-T1 to P1-T3. Sprint 2: P1-04, P1-05, P1-05a, P1-T4, P1-T5. Sprint 3: P1-06 to P1-09. Sprint 4: P1-10 to P1-15.

- [x] P1-T1 Template format and server renderer: manifest, Handlebars placeholders, section switches, slots, CSS-variable themes. `GET /w/[slug]` renders published weddings; `GET /t/[id]/...` serves a template's effects.js and assets
- [x] P1-T2 First template of our own, with opening animation, scroll reveals, countdown and music button. Marigold is in `templates/marigold/`; the countdown slot is filled later with the guest components. Still to check on a real Android phone and an iPhone
- [x] P1-T3 Template gallery with full live preview and "Try with your names" before login. Gallery with filters (`/`), `/templates/[id]` with the live phone preview, `/preview/[id]`, the draft saved in the browser and handed to the new wedding by `/create`
- [ ] P1-T4 Editor with phone-sized live preview: sections on or off, colour preset, font pair, music
- [ ] P1-T5 Draft link and Publish step (free plan only for now; paid plans arrive in P3-06)

Test: one real wedding uses it and at least 10 guests send a blessing through it.

- [x] P1-01 Migrations for `weddings`, `family_members`, `events`, `guests`, `rsvps`, `wishes`, `blessings` with row-level security
- [x] P1-02 FastAPI skeleton: health route, Supabase client, auth dependency, test setup
- [x] P1-03 Google login and "create wedding" form (names, slug, cover photo, story). Built: `POST /weddings`, `GET /weddings/slug-check`, `create_wedding()`; `/login` (Google button), `/auth/callback`, `/create` (draft carried over, link-name check, side), `/dashboard`, sign-out; tokens verified with HS256 or the project's JWKS. Checked with a real Google login on a computer. Not yet checked on phones (needs the hosted Supabase, see `docs/google-login.md`)
- [ ] P1-04 Events editor (add, edit, reorder; map link; `kind`, `dress_code`, `note`; see `docs/invitation-spec.md`)
- [ ] P1-05 Guest page `/w/[slug]`: one template, countdown, events with map buttons, WhatsApp preview image and title
- [ ] P1-05a "Our journey" section: dated moments (first met, proposal, engagement) with photo and caption, edited by the family, shown as a timeline on the guest page
- [ ] P1-06 RSVP per event with party size, food choice and allergies; optional RSVP deadline; add-to-calendar link on events
- [ ] P1-07 Wishes editor and UPI IDs for both sides
- [ ] P1-08 Blessing flow: choose side, wish, amount (₹501, ₹1,001, ₹2,100, ₹5,100, custom), name, note
- [ ] P1-09 UPI intent route, QR generation, pay screen, "Did the payment go through?" step
- [ ] P1-10 Ledger page: list, filter by side, Received and Not received buttons, totals of received only
- [ ] P1-11 RSVP summary page: headcount per event, veg/Jain/other split and allergies list (the caterer summary)
- [ ] P1-12 Share button with a ready WhatsApp message
- [ ] P1-13 Privacy pass: confirm no amount or guest list is reachable without family login
- [ ] P1-14 Deploy web (Vercel; the templates/ folder must ship with it, set `TEMPLATES_DIR` or include files outside the web root) and API (`prod` Docker image); use a paid Supabase project and an always-on API before a real wedding; test the whole flow on two phones
- [ ] P1-15 Run it at the first real wedding and write down what went wrong

## 11. Backlog (do not start until the phase before passes)

**Phase 2: the ledger at the venue (weeks 5 to 6).** Test: a relative records every envelope at one wedding without help.

- [ ] P2-01 Add cash and physical gifts to the ledger by hand
- [ ] P2-02 Counter mode: large-button screen for fast name and amount entry, works with poor signal
- [ ] P2-03 Printable QR standee (PDF)
- [ ] P2-04 "Can't attend" link with voice or video blessing upload
- [ ] P2-05 Guest-specific links that fill in the family name, with household label and plus-one limit
- [ ] P2-05b Send queue: one WhatsApp button per household with a ready message, "Not replied" filter and Remind button (`wa.me` links, we send nothing ourselves)
- [ ] P2-05c Optional `travel` and `faq` sections on the guest page
- [ ] P2-06 Gujarati, Hindi and English invitation text
- [ ] P2-07 Wedding album: family uploads photos, grouped by event, shown as a gallery on the wedding link
- [ ] P2-08 Guest uploads from the link or the venue QR, visible only after family approval
- [ ] P2-09 Image resize, thumbnails and a storage cap per wedding
- [ ] P2-10 Two more invitation templates in different styles, with gallery filters by tradition, style and language

**Phase 3: reasons to pay (weeks 7 to 8).** Test: one family or one photographer pays.

- [ ] P3-01 Thank-you notes, one tap per giver, with a photo
- [ ] P3-02 Export ledger to Excel
- [ ] P3-03 Reciprocity reminder
- [ ] P3-04 Other occasions (housewarming, baby shower, birthday)
- [ ] P3-05 Partner accounts for photographers and invitation designers
- [ ] P3-06 Paid plan switch (₹499 Family, ₹1,999 a month Partner; prices are guesses to test). Free plan gets a small photo limit; paid plans get more storage
- [ ] P3-07 Download the whole album as a zip, and keep the page live after the wedding as a memory page

**Phase 4: manage the whole wedding (weeks 9 to 14).** Test: one family runs its full budget here and one partner manages two weddings.

- [ ] P4-01 Budget planner by head, planned against actual
- [ ] P4-02 Expense log: vendor, which side paid, advance, balance due, bill photo
- [ ] P4-03 Calculations: catering from per-plate rate times confirmed guests, balance per vendor, each side's share
- [ ] P4-04 Payment due reminders
- [ ] P4-05 Checklist and timeline with owners; tasks stored as days from the wedding so they move with the date (starter list in `docs/wedding-timeline.md`)
- [ ] P4-06 Vendor list per wedding
- [ ] P4-07 Guest list import and grouping
- [ ] P4-08 Partner workspace for several weddings
- [ ] P4-09 Photo delivery link on the wedding page
- [ ] P4-10 Public partner directory (last, and one city only)

## 12. Parking lot

Ideas that are not in any phase yet. Add here instead of building.

- Payment gateway with automatic confirmation (needs identity checks per family)
- WhatsApp Business API messages sent by the product
- More invitation templates
- Custom domains
- Phone OTP login as a second sign-in option (needs an SMS provider)
- Save the Date page (same template, fewer sections), from `docs/reference-digital-yes.md`
- Table seating with auto-assign (after P4-07)
- Wedding-day mode and printable day binder
- Weather forecast on the wedding-day screen
- Offline use for the family dashboard beyond counter mode

## 13. Open questions

- [ ] Whose wedding is the first test?
- [ ] In your community, does Shagun go to the couple or to the parents? Sets the default side.
- [ ] Final product name and domain
- [ ] Before charging anyone: check payment rules and gift-tax treatment with a CA

## 14. Decisions so far

| Date | Decision |
| --- | --- |
| 15 Nov 2026 | Side project, India only, weddings first |
| 15 Nov 2026 | Web app opened from WhatsApp; no native app |
| 15 Nov 2026 | Direct UPI to the family; no gateway, no money held |
| 15 Nov 2026 | No targets or progress bars |
| 15 Nov 2026 | Core (phases 1 to 3) before wedding management (phase 4) |
| 19 Nov 2026 | Family login is Google sign-in first; phone OTP moves to the parking lot | No SMS provider needed to start; the API only checks a Supabase token either way |
| 18 Nov 2026 | Docker for web and api (dev and prod targets, compose for local); Supabase stays on its CLI, not in compose |
| 18 Nov 2026 | Studied The Digital Yes for features only; notes in `docs/reference-digital-yes.md`. Small additions to existing tasks; the rest in the parking lot |
