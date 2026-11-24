from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.brand import NAME
from app.db import get_supabase
from app.models.side import Side, SideIn, SideOut
from app.services.members import Member, require_member
from app.services.upi import build_upi_link

router = APIRouter(prefix="/weddings/{wedding_id}/sides/{side}", tags=["sides"])

Db = Annotated[Client, Depends(get_supabase)]
Family = Annotated[Member, Depends(require_member)]


def _columns(side: str) -> tuple[str, str]:
    return f"{side}_side_upi", f"{side}_side_payee_name"


def _wish(db: Client, wedding_id: str, side: str) -> dict | None:
    rows = db.table("wishes").select("id, title").eq("wedding_id", wedding_id).eq("side", side).execute().data
    return rows[0] if rows else None


@router.put("")
def save_side(side: Side, body: SideIn, member: Family, db: Db) -> SideOut:
    """Save one side's UPI ID, payee name and wish. Any member of the family may; a stranger gets 404.

    The UPI ID is money-related, so it is only ever written here, after the membership check, and only read back to
    the family. Guests never receive it: the pay link is built on the server.
    """
    upi_column, name_column = _columns(side)
    rows = db.table("weddings").update({upi_column: body.upi_id, name_column: body.payee_name}).eq("id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(404, "Wedding not found")

    existing = _wish(db, member.wedding_id, side)
    if body.wish is None:
        if existing:
            db.table("wishes").delete().eq("id", existing["id"]).execute()
    elif existing:
        db.table("wishes").update({"title": body.wish}).eq("id", existing["id"]).execute()
    else:
        db.table("wishes").insert({"wedding_id": member.wedding_id, "side": side, "title": body.wish}).execute()
    return SideOut(side=side, upi_id=body.upi_id, payee_name=body.payee_name, wish=body.wish)


@router.get("/test-link")
def test_link(side: Side, member: Family, db: Db) -> dict[str, str]:
    """A pay link for one rupee to this side's saved UPI ID, so the family can check it reaches the right account."""
    upi_column, name_column = _columns(side)
    rows = db.table("weddings").select(f"{upi_column}, {name_column}").eq("id", member.wedding_id).execute().data
    upi_id, payee = (rows[0].get(upi_column), rows[0].get(name_column)) if rows else (None, None)
    if not upi_id or not payee:
        raise HTTPException(422, "Save a UPI ID and a name for this side first")
    return {"link": build_upi_link(upi_id, payee, 100, f"Test from {NAME}")}
