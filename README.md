# Dream Shagun

Wedding invitation website with RSVP, blessings by UPI and a Shagun ledger.
The plan, rules and task list live in [PROJECT.md](PROJECT.md). Sprints are tracked in Jira (space **DS**).

## Run locally

**Web** (Next.js)

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

The Sprint 0 UPI test page is at `/upi-test.html`.

**API** (FastAPI, Python 3.12+)

```bash
cd api
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload      # http://localhost:8000/health
pytest
```

## Run with Docker

Needs Docker Desktop. Supabase runs through its CLI; web and api run in compose.

```bash
npx supabase start               # database, auth, storage
docker compose up --build        # web on :3000 and api on :8000 (hot reload)
docker compose up web            # or just one service
docker compose run --rm --no-deps api pytest
npx supabase test db             # row-level security tests
```

See [docs/architecture.md](docs/architecture.md) for how it all fits together.

## Environment

Copy `.env.example` to `web/.env.local` and `api/.env` and fill in the Supabase values. Never commit real keys.

## Deploy the UPI test page (Sprint 0)

1. Push this repo to GitHub.
2. In Vercel, import the repo and set **Root Directory** to `web`.
3. Open `https://<your-project>.vercel.app/upi-test.html?pa=<your-upi-id>&pn=<your%20name>` from a WhatsApp message on each phone.
4. Record results in `docs/upi-test.md`.
