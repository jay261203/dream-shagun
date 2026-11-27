"""The hosts' private gift register (DS-25). Only the invitation's family reaches these routes; anyone else gets 404.

Hosts read the register straight from the database (row-level security lets only the family see it). Every change comes
through here, because no one can write to the table from the browser.
"""

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from supabase import Client

from app.db import get_supabase
from app.models.gift import MAX_REGISTER_ROWS, GiftEntryIn, GiftStatusIn
from app.services.members import Member, require_member

router = APIRouter(prefix="/weddings/{wedding_id}", tags=["gift register"])

Db = Annotated[Client, Depends(get_supabase)]
Family = Annotated[Member, Depends(require_member)]

_STATUS = {"received": "received", "not_received": "rejected", "unchecked": "claimed"}


def _received_by(member: Member) -> dict:
    return {"status": "received", "received_by": member.member_id, "received_at": datetime.now(UTC).isoformat()}


@router.post("/gifts", status_code=status.HTTP_201_CREATED)
def record_gift(body: GiftEntryIn, member: Family, db: Db) -> dict[str, str]:
    """A gift a host has in hand: cash, a transfer seen in the bank app, or a physical gift. It counts as received."""
    if len(db.table("blessings").select("id").eq("wedding_id", member.wedding_id).execute().data) >= MAX_REGISTER_ROWS:
        raise HTTPException(422, f"The register can hold at most {MAX_REGISTER_ROWS} gifts")
    row = {
        "wedding_id": member.wedding_id,
        "side": body.side,
        "giver_name": body.giver_name,
        "method": body.method,
        "amount_paise": body.amount_rupees * 100 if body.amount_rupees is not None else None,
        "description": body.description,
        "note": body.note,
        "source": "host",
        **_received_by(member),
    }
    return {"id": str(db.table("blessings").insert(row).execute().data[0]["id"])}


@router.put("/gifts/{gift_id}/status")
def check_gift(gift_id: UUID, body: GiftStatusIn, member: Family, db: Db) -> dict[str, str]:
    """Received, Not received, or back to unchecked. Only Received records who tapped it and when."""
    values = _received_by(member) if body.status == "received" else {"status": _STATUS[body.status], "received_by": None, "received_at": None}
    rows = db.table("blessings").update(values).eq("id", str(gift_id)).eq("wedding_id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gift not found")
    return {"status": body.status}


@router.delete("/gifts/{gift_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_gift(gift_id: UUID, member: Family, db: Db) -> Response:
    """Take a row out: a mistake by a host, or a guest note that was not real."""
    rows = db.table("blessings").delete().eq("id", str(gift_id)).eq("wedding_id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gift not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
