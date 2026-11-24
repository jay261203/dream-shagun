import re
import secrets
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from supabase import Client

from app.db import get_supabase
from app.models.event import IST
from app.models.rsvp import MAX_GUESTS_PER_WEDDING, EventReply, RsvpIn, RsvpOut
from app.services.ratelimit import RateLimiter, rsvp_limiter

# Public routes: a guest needs no login, so nothing here trusts the caller beyond the checks in this file.
router = APIRouter(prefix="/weddings/{slug}/rsvp", tags=["rsvp"])

Db = Annotated[Client, Depends(get_supabase)]

_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
_CODE = re.compile(r"^[A-Za-z0-9_-]{24,64}$")


def get_limiter() -> RateLimiter:
    return rsvp_limiter


Limiter = Annotated[RateLimiter, Depends(get_limiter)]


def today_in_india() -> date:
    return datetime.now(IST).date()


def _visitor(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _published(db: Client, slug: str) -> dict:
    """The published wedding with this link name, or 404. A draft looks exactly like a link that does not exist."""
    rows = (
        db.table("weddings").select("id, rsvp_deadline").eq("slug", slug).eq("status", "published").execute().data
        if _SLUG.match(slug) and 3 <= len(slug) <= 60
        else []
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
    return rows[0]


def _open_for_replies(wedding: dict) -> None:
    deadline = wedding.get("rsvp_deadline")
    if deadline and today_in_india() > date.fromisoformat(str(deadline)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Replies are closed. Please contact the family.")


def _check_events(db: Client, wedding_id: str, body: RsvpIn) -> None:
    mine = {str(r["id"]) for r in db.table("events").select("id").eq("wedding_id", wedding_id).execute().data}
    if any(str(r.event_id) not in mine for r in body.replies):
        raise HTTPException(422, "One of those events is not part of this wedding")


def _throttle(request: Request, limiter: RateLimiter, slug: str) -> None:
    if not limiter.allow(f"{_visitor(request)}|{slug}"):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "That is a lot of replies. Please wait a few minutes and try again.")


def _out(guest: dict, rsvps: list[dict]) -> RsvpOut:
    first = rsvps[0] if rsvps else {}
    return RsvpOut(
        edit_code=guest["edit_code"],
        name=guest["display_name"],
        phone=guest.get("phone"),
        replies=[EventReply(event_id=r["event_id"], response=r["response"], party_size=r["party_size"]) for r in rsvps],
        food_choice=first.get("food_choice"),
        allergies=first.get("allergies"),
    )


def _rows(body: RsvpIn, guest_id: str) -> list[dict]:
    # Food and allergies are asked once for the party, so every event row carries the same answers.
    return [
        {
            "guest_id": guest_id,
            "event_id": str(r.event_id),
            "response": r.response,
            "party_size": r.party_size,
            "food_choice": body.food_choice,
            "allergies": body.allergies,
        }
        for r in body.replies
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def reply(slug: str, body: RsvpIn, request: Request, db: Db, limiter: Limiter) -> RsvpOut:
    wedding = _published(db, slug)
    _open_for_replies(wedding)
    _throttle(request, limiter, slug)
    _check_events(db, wedding["id"], body)
    if len(db.table("guests").select("id").eq("wedding_id", wedding["id"]).execute().data) >= MAX_GUESTS_PER_WEDDING:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "This invitation has reached its limit of replies. Please contact the family.")

    guest = (
        db.table("guests")
        .insert({"wedding_id": wedding["id"], "display_name": body.name, "phone": body.phone, "source": "open", "edit_code": secrets.token_urlsafe(24)})
        .execute()
        .data[0]
    )
    saved = [db.table("rsvps").insert(row).execute().data[0] for row in _rows(body, guest["id"])]
    return _out(guest, saved)


def _guest(db: Client, wedding_id: str, code: str) -> dict:
    # The code belongs to one guest of this wedding only. Anything else is "not found".
    guests = (
        db.table("guests").select("id, display_name, phone, edit_code").eq("wedding_id", wedding_id).eq("edit_code", code).execute().data
        if _CODE.match(code)
        else []
    )
    if not guests:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reply not found")
    return guests[0]


@router.get("/{code}")
def my_reply(slug: str, code: str, db: Db) -> RsvpOut:
    """The guest's own saved reply, so the form can show it. Needs the guest's private code."""
    wedding = _published(db, slug)
    guest = _guest(db, wedding["id"], code)
    return _out(guest, db.table("rsvps").select("*").eq("guest_id", guest["id"]).execute().data)


@router.put("/{code}")
def change_reply(slug: str, code: str, body: RsvpIn, request: Request, db: Db, limiter: Limiter) -> RsvpOut:
    wedding = _published(db, slug)
    _open_for_replies(wedding)
    _throttle(request, limiter, slug)
    guest = _guest(db, wedding["id"], code)
    _check_events(db, wedding["id"], body)

    guest = db.table("guests").update({"display_name": body.name, "phone": body.phone}).eq("id", guest["id"]).execute().data[0]
    existing = {str(r["event_id"]): r for r in db.table("rsvps").select("*").eq("guest_id", guest["id"]).execute().data}
    wanted = _rows(body, guest["id"])
    for row in wanted:
        if row["event_id"] in existing:
            db.table("rsvps").update(row).eq("id", existing[row["event_id"]]["id"]).execute()
        else:
            db.table("rsvps").insert(row).execute()
    kept = {r["event_id"] for r in wanted}
    for event_id, old in existing.items():
        if event_id not in kept:
            db.table("rsvps").delete().eq("id", old["id"]).execute()
    return _out(guest, db.table("rsvps").select("*").eq("guest_id", guest["id"]).execute().data)
