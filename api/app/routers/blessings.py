import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from supabase import Client

from app.db import get_supabase
from app.models.blessing import (
    MAX_BLESSINGS_PER_WEDDING,
    MAX_RUPEES,
    MIN_RUPEES,
    PRESET_RUPEES,
    BlessingIn,
    BlessingOptions,
    SideOption,
)
from app.services.ratelimit import RateLimiter, blessing_limiter

# Public routes: a guest needs no login. The guest never receives a UPI ID or a payee name from here; they only learn
# which sides can receive blessings and the short wish each side wrote.
router = APIRouter(prefix="/weddings/{slug}", tags=["blessings"])

Db = Annotated[Client, Depends(get_supabase)]

_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

COLUMNS = "id, bride_name, groom_name, blessings_enabled, bride_side_upi, bride_side_payee_name, groom_side_upi, groom_side_payee_name"


def get_limiter() -> RateLimiter:
    return blessing_limiter


Limiter = Annotated[RateLimiter, Depends(get_limiter)]


def _published(db: Client, slug: str) -> dict:
    rows = (
        db.table("weddings").select(COLUMNS).eq("slug", slug).eq("status", "published").execute().data
        if _SLUG.match(slug) and 3 <= len(slug) <= 60
        else []
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
    return rows[0]


def _ready_sides(wedding: dict) -> list[str]:
    """Sides that can receive a blessing: a UPI ID and a payee name are both saved."""
    return [s for s in ("bride", "groom") if wedding.get(f"{s}_side_upi") and wedding.get(f"{s}_side_payee_name")]


def _wish(db: Client, wedding_id: str, side: str) -> dict | None:
    rows = db.table("wishes").select("id, title").eq("wedding_id", wedding_id).eq("side", side).execute().data
    return rows[0] if rows else None


@router.get("/blessing-options")
def blessing_options(slug: str, db: Db) -> BlessingOptions:
    wedding = _published(db, slug)
    enabled = bool(wedding.get("blessings_enabled"))
    sides = []
    if enabled:
        for side in _ready_sides(wedding):
            wish = _wish(db, wedding["id"], side)
            sides.append(SideOption(side=side, host=wedding[f"{side}_name"], wish=wish["title"] if wish else None))
    return BlessingOptions(enabled=enabled and bool(sides), sides=sides, presets=list(PRESET_RUPEES), min_rupees=MIN_RUPEES, max_rupees=MAX_RUPEES)


@router.post("/blessings", status_code=status.HTTP_201_CREATED)
def send_blessing(slug: str, body: BlessingIn, request: Request, db: Db, limiter: Limiter) -> dict[str, bool]:
    """Record a blessing as "claimed". Only a family member can later mark it received; nothing here moves money."""
    wedding = _published(db, slug)
    if not wedding.get("blessings_enabled") or body.side not in _ready_sides(wedding):
        raise HTTPException(422, "That side is not taking blessings here")

    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    visitor = forwarded or (request.client.host if request.client else "unknown")
    if not limiter.allow(f"{visitor}|{slug}"):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "That is a lot of blessings. Please wait a few minutes and try again.")
    if len(db.table("blessings").select("id").eq("wedding_id", wedding["id"]).execute().data) >= MAX_BLESSINGS_PER_WEDDING:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "This invitation has reached its limit. Please contact the family.")

    wish = _wish(db, wedding["id"], body.side)
    db.table("blessings").insert(
        {
            "wedding_id": wedding["id"],
            "giver_name": body.name,
            "wish_id": wish["id"] if wish else None,
            "amount_paise": body.amount_paise(),
            "note": body.note,
            "method": "upi",
            "status": "claimed",
            "side": body.side,
        }
    ).execute()
    # Nothing about the stored row is sent back: a guest never learns anything about other blessings.
    return {"ok": True}
