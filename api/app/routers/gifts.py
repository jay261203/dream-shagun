import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from supabase import Client

from app.db import get_supabase
from app.models.gift import MAX_GIFT_NOTES_PER_WEDDING, GiftNoteIn, GiftPage, GiftSide
from app.services.ratelimit import RateLimiter, gift_limiter
from app.services.upi import build_upi_link, is_valid_upi_id

# Public routes: a guest needs no login. The gift page is the one place a UPI ID is shown to a guest, and only when the
# hosts chose to have a gift page at all (gift_mode is not "off"). There is no amount, no minimum and no preset here.
router = APIRouter(prefix="/weddings/{slug}", tags=["gifts"])

Db = Annotated[Client, Depends(get_supabase)]

_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

COLUMNS = "id, bride_name, groom_name, gift_mode, bride_side_upi, bride_side_payee_name, groom_side_upi, groom_side_payee_name"


def get_limiter() -> RateLimiter:
    return gift_limiter


Limiter = Annotated[RateLimiter, Depends(get_limiter)]


def _with_gifts(db: Client, slug: str) -> dict:
    """The published wedding whose hosts have a gift page, or 404 (a draft, a missing link and "off" look the same)."""
    rows = (
        db.table("weddings").select(COLUMNS).eq("slug", slug).eq("status", "published").execute().data
        if _SLUG.match(slug) and 3 <= len(slug) <= 60
        else []
    )
    if not rows or rows[0].get("gift_mode", "off") == "off":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
    return rows[0]


def _ready(wedding: dict, side: str) -> bool:
    upi, payee = wedding.get(f"{side}_side_upi"), wedding.get(f"{side}_side_payee_name")
    return bool(upi and payee and is_valid_upi_id(upi))


@router.get("/gift")
def gift_page(slug: str, db: Db) -> GiftPage:
    wedding = _with_gifts(db, slug)
    sides = []
    for side in ("bride", "groom"):
        if not _ready(wedding, side):
            continue
        wish = db.table("wishes").select("title").eq("wedding_id", wedding["id"]).eq("side", side).execute().data
        upi, payee = wedding[f"{side}_side_upi"], wedding[f"{side}_side_payee_name"]
        sides.append(
            GiftSide(side=side, host=wedding[f"{side}_name"], wish=wish[0]["title"] if wish else None, upi_id=upi.strip(), payee_name=payee.strip(), link=build_upi_link(upi, payee, None, None))
        )
    return GiftPage(mode=wedding["gift_mode"], sides=sides)


@router.post("/gift-notes", status_code=status.HTTP_201_CREATED)
def leave_gift_note(slug: str, body: GiftNoteIn, request: Request, db: Db, limiter: Limiter) -> dict[str, bool]:
    """Save "I sent a gift" as a claimed, unverified entry. Only a family member can later mark it received."""
    wedding = _with_gifts(db, slug)
    if not _ready(wedding, body.side):
        raise HTTPException(422, "That side is not taking gifts here")

    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    visitor = forwarded or (request.client.host if request.client else "unknown")
    if not limiter.allow(f"{visitor}|{slug}"):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "That is a lot of notes. Please wait a few minutes and try again.")
    if len(db.table("blessings").select("id").eq("wedding_id", wedding["id"]).execute().data) >= MAX_GIFT_NOTES_PER_WEDDING:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "This invitation has reached its limit. Please contact the family.")

    db.table("blessings").insert(
        {
            "wedding_id": wedding["id"],
            "giver_name": body.name,
            "amount_paise": body.amount_rupees * 100 if body.amount_rupees else None,
            "note": body.note,
            "method": "upi",
            "status": "claimed",
            "side": body.side,
        }
    ).execute()
    return {"ok": True}
