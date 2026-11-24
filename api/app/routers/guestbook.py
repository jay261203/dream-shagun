import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from supabase import Client

from app.db import get_supabase
from app.models.guestbook import MAX_MESSAGES_PER_WEDDING, MessageIn
from app.services.ratelimit import RateLimiter, guestbook_limiter

# Public route: a guest needs no login. The guest is only ever told "saved"; nobody can read messages through here.
router = APIRouter(prefix="/weddings/{slug}", tags=["guestbook"])

Db = Annotated[Client, Depends(get_supabase)]

_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def get_limiter() -> RateLimiter:
    return guestbook_limiter


Limiter = Annotated[RateLimiter, Depends(get_limiter)]


@router.post("/guestbook", status_code=status.HTTP_201_CREATED)
def leave_message(slug: str, body: MessageIn, request: Request, db: Db, limiter: Limiter) -> dict[str, bool]:
    rows = (
        db.table("weddings").select("id, sections_enabled").eq("slug", slug).eq("status", "published").execute().data
        if _SLUG.match(slug) and 3 <= len(slug) <= 60
        else []
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
    wedding = rows[0]
    if "guestbook" not in (wedding.get("sections_enabled") or []):
        raise HTTPException(422, "This invitation is not taking messages")

    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    visitor = forwarded or (request.client.host if request.client else "unknown")
    if not limiter.allow(f"{visitor}|{slug}"):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "That is a lot of messages. Please wait a few minutes and try again.")
    if len(db.table("guestbook").select("id").eq("wedding_id", wedding["id"]).execute().data) >= MAX_MESSAGES_PER_WEDDING:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "This invitation has reached its limit of messages. Please contact the hosts.")

    db.table("guestbook").insert({"wedding_id": wedding["id"], "guest_name": body.name, "message": body.message}).execute()
    return {"ok": True}
