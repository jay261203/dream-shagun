from collections.abc import Iterable
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError
from supabase import Client

from app.auth import CurrentUser, get_current_user
from app.db import get_supabase
from app.models.wedding import SLUG_PATTERN, CreateWedding, WeddingCreated, clean_slug
from app.services.slugs import suggest_free

router = APIRouter(prefix="/weddings", tags=["weddings"])

UNIQUE_VIOLATION = "23505"


def _taken(db: Client, slugs: Iterable[str]) -> set[str]:
    rows = db.table("weddings").select("slug").in_("slug", list(slugs)).execute().data
    return {row["slug"] for row in rows}


@router.get("/slug-check")
def slug_check(
    slug: Annotated[str, Query(min_length=3, max_length=60)],
    _user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Client, Depends(get_supabase)],
) -> dict:
    """Live check for the create-wedding form."""
    slug = clean_slug(slug)
    if not SLUG_PATTERN.match(slug):
        return {"available": False, "reason": "invalid", "suggestions": []}
    if slug not in _taken(db, [slug]):
        return {"available": True, "suggestions": []}
    return {
        "available": False,
        "reason": "taken",
        "suggestions": suggest_free(slug, lambda c: _taken(db, c), date.today().year),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_wedding(
    body: CreateWedding,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Client, Depends(get_supabase)],
) -> WeddingCreated:
    """Create a draft wedding. The caller becomes its owner on the chosen side."""
    try:
        result = db.rpc(
            "create_wedding",
            {
                "p_user_id": user.id,
                "p_email": user.email,
                "p_side": body.side,
                "p_bride_name": body.bride_name,
                "p_groom_name": body.groom_name,
                "p_slug": body.slug,
                "p_wedding_date": body.wedding_date.isoformat() if body.wedding_date else None,
                "p_story": body.story,
                "p_cover_photo_url": body.cover_photo_url,
                "p_template_id": body.template_id,
            },
        ).execute()
    except APIError as exc:
        if exc.code == UNIQUE_VIOLATION:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail={
                    "message": "That link name is taken",
                    "suggestions": suggest_free(body.slug, lambda c: _taken(db, c), date.today().year),
                },
            ) from None
        raise
    row = result.data
    return WeddingCreated(id=row["id"], slug=row["slug"], status=row["status"])
