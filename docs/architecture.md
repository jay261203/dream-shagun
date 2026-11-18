# Architecture

How Dream Shagun is put together: what each technology does, why we chose it, and how data moves. Rules and tasks live in [PROJECT.md](../PROJECT.md); this file explains the shape of the system.

Status legend: **built** (in the repo and working), **written** (code exists, not yet verified), **planned** (designed, no code yet).

## 1. The big picture

```
                         ┌────────────────────────────┐
  Guest phone            │  Vercel                    │
  (WhatsApp link) ─────► │  Next.js web app           │ ───┐
                         │  /w/[slug]  guest page     │    │ server-side
  Family phone/laptop ─► │  /dashboard family tools   │    │ render + API calls
                         └─────────────┬──────────────┘    │
                                       │ HTTPS             ▼
                         ┌─────────────▼──────────────┐  ┌────────────────────┐
                         │  Render / Railway          │  │  Supabase          │
                         │  FastAPI                   │─►│  Postgres + RLS    │
                         │  validation, UPI link, QR, │  │  Phone OTP auth    │
                         │  rate limits, all writes   │  │  Storage (photos)  │
                         └────────────────────────────┘  └────────────────────┘

  Guest's UPI app ──────────────► Family's bank account     (we are never in this path)
```

Three ideas shape everything:

1. **Guests never log in.** The wedding link is the only thing a guest needs.
2. **We never hold money.** Shagun goes from the guest's UPI app straight to the family. We only build the link and record what the guest says happened.
3. **The database enforces privacy, not just the code.** Row-level security means a bug in a page cannot leak amounts or guest lists.

## 2. Technology choices

| Part | Technology | Why this one | Status |
| --- | --- | --- | --- |
| Web app | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 | Server rendering gives fast first paint and correct WhatsApp link previews; one codebase for guest page and dashboard | scaffolded |
| API | FastAPI on Python 3.12 | Small, typed, easy to test; keeps business rules (UPI, ledger, rate limits) in one place outside the UI | health route + `upi.py` built |
| Database | Supabase Postgres | Real relational data with row-level security; free tier is enough for the first weddings | built and tested (16 row-level security checks) |
| Auth | Supabase phone OTP | Family members only; most people here trust a phone number more than an email | planned (DS-12) |
| File storage | Supabase Storage | Photos and covers; limit is 1 GB on the free tier, so revisit before the album (P2-07) | planned |
| Templates | Plain HTML and CSS rendered with Handlebars | New invitation looks without touching product code; Handlebars escapes values so names cannot inject HTML | planned (DS-13) |
| Payment | `upi://pay` deep link plus a QR code, no gateway | No payment licence, no money held, nothing to reconcile with a bank | link builder built |
| Hosting | Vercel (web), Render or Railway (API) | Cheap, deploy from git | planned (P1-14) |
| Analytics | PostHog | Optional, after Phase 1 | planned |

### Why two servers (Next.js and FastAPI)

Next.js renders pages. FastAPI owns every write and every rule that touches money or guest data. The browser never writes to the database directly. That keeps validation and rate limiting in one place, and it means the Supabase service key lives only on the API server.

## 3. Repository layout

```
dream-shagun/
├── PROJECT.md          plan, rules, task list
├── web/                Next.js app
├── api/                FastAPI app (routers, models, services, tests)
├── templates/          one folder per invitation design
├── supabase/
│   ├── migrations/     numbered SQL files
│   └── tests/database/ pgTAP tests for row-level security
└── docs/               decisions, UPI test, this file, specs
```

## 4. Data model

Eight tables in Phase 1 (full columns in PROJECT.md section 6):

```
weddings ─┬─< family_members >── auth.users     (who may manage this wedding)
          ├─< events ─────────< rsvps >───────┐
          ├─< guests ─────────────────────────┘
          ├─< wishes ─────────< blessings >── guests
          ├─< blessings                          (the Shagun ledger)
          └─< moments                            (the "Our journey" timeline)
```

- Money is an integer number of paise. Never a float.
- `blessings.status` is `claimed` (the guest says they paid), `received` (a family member confirmed) or `rejected`. Only `received` counts in totals, and a `received` row must record who confirmed it and when.
- `family_members.side` (bride or groom) keeps the two sides' UPI IDs and ledger apart.
- Wishes have no target amount column. That is deliberate.

Later phases add `thank_yous`, `photos`, budget and vendor tables.

## 5. Who can see what

Enforced by Postgres row-level security and by table and column grants, not only by application code.

| Table | Guest (anonymous) | Family member of this wedding | Other logged-in family |
| --- | --- | --- | --- |
| `weddings` | Published only, without UPI and payee columns | All rows and columns, including drafts | Published rows only |
| `events`, `wishes`, `moments` | Published weddings only | Always | Published weddings only |
| `guests`, `rsvps`, `blessings` | Nothing | Read | Nothing |
| Any write | Not directly | Not directly | Not directly |

Every write goes through the API using the service role, after it validates the request. That is stricter than letting guests insert rows themselves, because a guest could otherwise create a blessing already marked `received`.

Known gap: a logged-in family member of a different wedding can read the UPI IDs of a published wedding. UPI IDs are meant to be shared, so we accept this for now.

## 6. Main flows

### Family builds and publishes (Phase 1)

```
Gallery ─► live preview ─► "Try with your names" (no login)
        ─► "Save and continue" ─► phone OTP ─► draft saved
        ─► editor (events, journey, sections, theme) ─► draft link for family check
        ─► Publish ─► live link + WhatsApp message + QR code
```

### Guest opens the link

```
WhatsApp tap ─► /w/[slug] ─► server fills template with wedding data
            ─► finished HTML (fast first paint, WhatsApp preview image and title)
            ─► React components mount into slots: RSVP, blessing, countdown, album
```

### Guest RSVPs

```
Guest enters name (or opens a personal link) ─► picks attending, party size, food, allergies
   ─► POST /weddings/{slug}/rsvp ─► API validates, rate-limits ─► writes guest + rsvps
```

No login. The family reads replies and a per-event headcount on the dashboard.

### Guest sends a blessing

```
Choose side, wish, amount, note
  ─► POST .../blessings/intent ─► API builds the upi://pay link and QR (server-side)
  ─► guest pays in their UPI app (money goes guest ─► family, not through us)
  ─► guest returns: "Did the payment go through?"
  ─► POST .../blessings ─► saved as status = claimed
  ─► family taps Received ─► status = received ─► counts in the ledger
```

We get no callback from UPI, which is why the family's tap is the only proof.

## 7. Templates

```
templates/<id>/
├── manifest.json   name, tradition, language, colour presets, font pairs, sections supported, licence
├── template.html   Handlebars placeholders and slots
├── styles.css      CSS variables for colours and fonts
├── effects.js      optional opening animation, scroll reveals
└── assets/
```

- **Placeholders**: `{{bride_name}}`, `{{#each events}}`.
- **Sections**: `<section data-section="journey">` so the editor can switch them on or off.
- **Slots**: `<div data-slot="rsvp">` is filled by our React components, so RSVP and blessing behave the same in every template.
- **Themes**: each colour preset or font pair only sets CSS variables.
- **Limits**: music never autoplays with sound; reduced-motion is honoured; first load stays light for mobile data; `effects.js` may not call any outside server.

## 8. Security and privacy rules in the architecture

- The Supabase service key exists only in the API's environment, never in the browser or in git.
- Public POST routes are rate-limited by IP and wedding.
- Personal guest links use unguessable tokens (16+ characters), never sequential ids.
- Photos are the family's: shown only through the wedding link, and guest uploads appear after a family member approves.
- Templates may not call outside servers, which limits what a third-party design can do.

## 9. Local development

- Web: `cd web && npm run dev` (http://localhost:3000)
- API: `cd api && uvicorn app.main:app --reload`, tests with `pytest`
- Database: `npx supabase start` (needs Docker Desktop; the local database uses port 54422 because 54322 was blocked on this machine), `npx supabase db reset` to apply migrations, `npx supabase test db` to run the row-level security tests
- Secrets: `web/.env.local` and `api/.env`, copied from `.env.example`, never committed

## 10. What is not built yet

Auth (phone OTP), the template renderer, the editor, the API routes in PROJECT.md section 8, photo storage, and deployment. Each is a task in PROJECT.md and a ticket in Jira (space DS). Phase 4 (budget, vendors, checklist) is designed only at the level of `docs/wedding-timeline.md`.
