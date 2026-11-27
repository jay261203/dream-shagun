"""Who belongs to a wedding. Every route that changes a wedding's content starts here."""

from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from supabase import Client

from app.auth import CurrentUser, get_current_user
from app.db import get_supabase


@dataclass(frozen=True)
class Member:
    wedding_id: str
    user_id: str
    role: str  # "owner" or "helper"
    side: str  # "bride" or "groom"
    member_id: str | None = None  # the family_members row, recorded when this person marks a gift received


def require_member(
    wedding_id: UUID,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Client, Depends(get_supabase)],
) -> Member:
    """The signed-in person's membership of this wedding, or 404.

    404 and not 403 on purpose: a stranger learns nothing about whether the wedding exists.
    The database uses the service role, which skips row-level security, so this check is the lock.
    """
    rows = (
        db.table("family_members")
        .select("id, role, side")
        .eq("wedding_id", str(wedding_id))
        .eq("user_id", user.id)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Wedding not found")
    return Member(wedding_id=str(wedding_id), user_id=user.id, role=rows[0]["role"], side=rows[0]["side"], member_id=rows[0].get("id"))
