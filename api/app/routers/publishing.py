from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db import get_supabase
from app.services.members import Member, require_member

router = APIRouter(prefix="/weddings/{wedding_id}", tags=["publishing"])

Db = Annotated[Client, Depends(get_supabase)]
Family = Annotated[Member, Depends(require_member)]


def missing_basics(db: Client, wedding_id: str) -> list[str]:
    """What is still needed before guests can see the invitation, in plain words."""
    wedding = db.table("weddings").select("bride_name, groom_name, wedding_date").eq("id", wedding_id).execute().data
    if not wedding:
        raise HTTPException(404, "Wedding not found")
    row = wedding[0]
    missing = []
    if not (row.get("bride_name") or "").strip() or not (row.get("groom_name") or "").strip():
        missing.append("Both names")
    if not row.get("wedding_date"):
        missing.append("The wedding date")
    if not db.table("events").select("id").eq("wedding_id", wedding_id).limit(1).execute().data:
        missing.append("At least one event")
    return missing


@router.post("/publish")
def publish(member: Family, db: Db) -> dict:
    """Make the invitation visible to anyone with the link. Refused, with the list of what is missing, until the basics are in."""
    missing = missing_basics(db, member.wedding_id)
    if missing:
        raise HTTPException(422, {"missing": missing, "message": "Add these first: " + ", ".join(m.lower() for m in missing)})
    rows = db.table("weddings").update({"status": "published"}).eq("id", member.wedding_id).execute().data
    return {"status": rows[0]["status"], "slug": rows[0]["slug"]}


@router.post("/unpublish")
def unpublish(member: Family, db: Db) -> dict:
    """Take the invitation offline. The link then shows "not found" to guests; everything stays saved."""
    rows = db.table("weddings").update({"status": "draft"}).eq("id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(404, "Wedding not found")
    return {"status": rows[0]["status"], "slug": rows[0]["slug"]}
