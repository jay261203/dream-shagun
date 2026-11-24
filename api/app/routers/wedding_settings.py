from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db import get_supabase
from app.models.wedding_changes import WeddingChanges
from app.services.members import Member, require_member

router = APIRouter(prefix="/weddings/{wedding_id}", tags=["wedding"])

Db = Annotated[Client, Depends(get_supabase)]
Family = Annotated[Member, Depends(require_member)]

COLUMNS = "id, bride_name, groom_name, wedding_date, story, color_preset, font_pair, music_enabled, gift_mode, sections_enabled"


@router.patch("/details")
def change_details(body: WeddingChanges, member: Family, db: Db) -> dict:
    """Change names, date, story, look, music or sections. Any member of the family may; strangers get 404."""
    changes = body.changes()
    if not changes:
        raise HTTPException(422, "Nothing to change")
    rows = db.table("weddings").update(changes).eq("id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(404, "Wedding not found")
    row = rows[0]
    return {key: row.get(key) for key in COLUMNS.split(", ")}
