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
                         │  validation, UPI link, QR, │  │  Google sign-in    │
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
| Auth | Supabase Auth with Google sign-in (phone OTP later) | Family members only; no SMS provider needed to start, and the API only checks a Supabase token either way | planned (DS-12) |
| File storage | Supabase Storage | Photos and covers; limit is 1 GB on the free tier, so revisit before the album (P2-07) | planned |
| Templates | Plain HTML and CSS rendered with Handlebars | New invitation looks without touching product code; Handlebars escapes values so names cannot inject HTML | renderer built and tested (DS-13); first template is DS-14 |
| Payment | `upi://pay` deep link plus a QR code, no gateway | No payment licence, no money held, nothing to reconcile with a bank | link builder built |
| Containers | Docker, one image per service, docker-compose for local | Same runtime locally and in production for the API; any service can run alone | built and tested |
| Hosting | Vercel (web), Render or Railway (API, from the `prod` image) | Cheap, deploy from git | planned (P1-14) |
| Analytics | PostHog | Optional, after Phase 1 | planned |

### Why two servers (Next.js and FastAPI)

Next.js renders pages. FastAPI owns every write and every rule that touches money or guest data. The browser never writes to the database directly. That keeps validation and rate limiting in one place, and it means the Supabase service key lives only on the API server.

## 3. Repository layout

```
dream-shagun/
├── PROJECT.md          plan, rules, task list
├── docker-compose.yml  local web + api with hot reload
├── web/                Next.js app + Dockerfile
├── api/                FastAPI app (routers, models, services, tests) + Dockerfile
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
        ─► "Save and continue" ─► Google sign-in ─► draft saved
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

## 9. Docker and environments

### Environments

| | Local | Production |
| --- | --- | --- |
| Web | `web` container (dev target, hot reload) or `npm run dev` | Vercel |
| API | `api` container (dev target, auto reload) or `uvicorn` | Render or Railway, running the `prod` image |
| Database, auth, storage | Supabase CLI stack (`npx supabase start`, its own containers) | Supabase hosted project |
| Secrets | `web/.env.local`, `api/.env` | Provider dashboards |

Supabase is deliberately not in `docker-compose.yml`. The Supabase CLI already manages roughly a dozen containers for it, and duplicating that would drift from what the hosted service does.

### The two images

Each service has one Dockerfile with a `dev` and a `prod` target.

| Image | Base | Prod size | Notes |
| --- | --- | --- | --- |
| `api` | python:3.12-slim | about 175 MB | Runs as a non-root user, has a `/health` check |
| `web` | node:22-alpine | about 235 MB | Next.js `output: "standalone"`, switched on only by `DOCKER_BUILD=1` so Vercel builds are unaffected |

`NEXT_PUBLIC_*` values are baked into the web image at build time, so a production web image needs them as build arguments.

### How containers find each other

```
browser ---> localhost:3000 (web) ---> localhost:8000 (api)        NEXT_PUBLIC_API_URL
             web server code -------> http://api:8000              API_URL_INTERNAL (compose network)
             api container ---------> host.docker.internal:54321   local Supabase on the host
```

Inside a container, `localhost` means the container itself, so server-side calls use the service name and Supabase uses `host.docker.internal`.

### Commands

```
npx supabase start               # database, auth, storage (needs Docker Desktop)
docker compose up --build        # web + api
docker compose up web            # one service only
docker compose run --rm --no-deps api pytest
npx supabase test db             # row-level security tests
```

## 10. Scale and reliability

### Load estimate

One wedding is small: about 300 guests and roughly 1,000 to 2,000 page views in total. The shape matters more than the size. Almost all traffic arrives in the hour after the family sends the WhatsApp message, and again around the RSVP deadline and the wedding day. Reads dominate; the writes are one RSVP per guest and a few blessings.

A single API instance and the Supabase free or entry tier carry this comfortably. The design goal is to be correct and always reachable on the wedding day, not to scale out.

### What can go wrong

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Supabase free project pauses after a week idle | Invitation link stops working | Use a paid project (or keep it active) before the first real wedding; check the current terms |
| API host sleeps when idle on a free plan | First RSVP or blessing waits many seconds | Paid always-on instance for real weddings, or a keep-alive ping |
| Guest page depends on the API being up | Blank page if the API is down | Render the invitation from published data in the web app; only RSVP and blessing need the API |
| Public POST abuse (spam RSVPs, fake blessings) | Noisy ledger | Rate limits by IP and wedding; family confirms every blessing; unguessable guest tokens |
| UPI link fails in a guest's app | Blessing not sent | Offer link, QR and copy-ID; the blessing stays optional |
| Photo storage fills (1 GB free) | Uploads fail | Resize on upload, per-wedding cap, move to cheaper object storage before Phase 2 |
| Bad migration | Data loss or downtime | Migrations are tested locally on a fresh database; back up before the first real wedding |

### What to watch

API error rate and latency on `/weddings/{slug}/rsvp` and `/blessings`, storage use per wedding, database size, and failed UPI confirmations ("Did the payment go through?" answered no). PostHog is optional after Phase 1.

## 11. Trade-offs we accepted

| Decision | Benefit | Cost |
| --- | --- | --- |
| Two servers (Next.js and FastAPI) | Rules for money and guest data live in one place | Two deployments and two sets of environment variables |
| All writes through the API | Guests cannot forge rows | Every form needs an endpoint |
| UPI deep link, no gateway | No licence, no money held | No payment callback, so the family confirms by hand |
| Supabase outside docker-compose | Matches the hosted service | Needs the Supabase CLI as well as Docker |
| One wedding at a time (Phase 1 to 3) | Small, finishable scope | Partner and multi-wedding features wait for Phase 4 |

### What we would revisit as it grows

- Photo storage and image resizing (move off the free Supabase tier).
- A job queue for reminders and thank-you notes (WhatsApp sending, Phase 2 onward).
- Caching published invitation pages at the edge if one wedding goes viral.
- A staging environment once there are paying families.
- Splitting the API only if a second team or heavy background work appears. It is one service on purpose.

## 12. Local development without Docker

- Web: `cd web && npm run dev` (http://localhost:3000)
- API: `cd api && uvicorn app.main:app --reload`, tests with `pytest`
- Database: `npx supabase start`, `npx supabase db reset` to apply migrations. The local database uses port 54422 because 54322 was blocked on this machine.
- Secrets: `web/.env.local` and `api/.env`, copied from `.env.example`, never committed

## 13. What is not built yet

Auth (Google sign-in) and handing the "Try with your names" draft to the new wedding, the editor, the API routes in PROJECT.md section 8, photo storage, and deployment. Each is a task in PROJECT.md and a ticket in Jira (space DS). Phase 4 (budget, vendors, checklist) is designed only at the level of `docs/wedding-timeline.md`.
