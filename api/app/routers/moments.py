from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from supabase import Client

from app.config import Settings, get_settings
from app.db import get_supabase
from app.models.moment import MAX_MOMENTS_PER_WEDDING, MomentIn, MomentOut, ReorderMoments
from app.services import photos
from app.services.members import Member, require_member

router = APIRouter(prefix="/weddings/{wedding_id}", tags=["journey"])

Db = Annotated[Client, Depends(get_supabase)]
Family = Annotated[Member, Depends(require_member)]
Config = Annotated[Settings, Depends(get_settings)]

COLUMNS = "id, title, happened_on, caption, photo_url, sort_order"


def _rows(db: Client, wedding_id: str) -> list[dict]:
    rows = db.table("moments").select(COLUMNS).eq("wedding_id", wedding_id).execute().data
    return sorted(rows, key=lambda r: r.get("sort_order") or 0)


def _values(body: MomentIn, wedding_id: str, supabase_url: str) -> dict:
    # A photo address may only point at this wedding's own folder, so a moment cannot show someone else's photo.
    if body.photo_url and not body.photo_url.startswith(photos.public_prefix(supabase_url, wedding_id)):
        raise HTTPException(422, [{"loc": ["body", "photo_url"], "msg": "Use a photo you uploaded here", "type": "value_error"}])
    return {"title": body.title, "happened_on": body.happened_on(), "caption": body.caption, "photo_url": body.photo_url}


@router.get("/moments")
def list_moments(member: Family, db: Db) -> list[MomentOut]:
    return [MomentOut.from_row(r) for r in _rows(db, member.wedding_id)]


@router.post("/moments", status_code=status.HTTP_201_CREATED)
def add_moment(body: MomentIn, member: Family, db: Db, config: Config) -> MomentOut:
    existing = _rows(db, member.wedding_id)
    if len(existing) >= MAX_MOMENTS_PER_WEDDING:
        raise HTTPException(422, f"A story can have at most {MAX_MOMENTS_PER_WEDDING} moments")
    next_order = max((r.get("sort_order") or 0 for r in existing), default=0) + 1
    values = {**_values(body, member.wedding_id, config.supabase_url), "wedding_id": member.wedding_id, "sort_order": next_order}
    return MomentOut.from_row(db.table("moments").insert(values).execute().data[0])


@router.post("/moments/reorder")
def reorder_moments(body: ReorderMoments, member: Family, db: Db) -> list[MomentOut]:
    existing = _rows(db, member.wedding_id)
    wanted = body.ids
    if len(set(wanted)) != len(wanted) or set(wanted) != {str(r["id"]) for r in existing}:
        raise HTTPException(422, "The list must contain every moment of this wedding once")
    for position, moment_id in enumerate(wanted, start=1):
        db.table("moments").update({"sort_order": position}).eq("id", moment_id).eq("wedding_id", member.wedding_id).execute()
    return [MomentOut.from_row(r) for r in _rows(db, member.wedding_id)]


@router.put("/moments/{moment_id}")
def change_moment(moment_id: UUID, body: MomentIn, member: Family, db: Db, config: Config) -> MomentOut:
    values = _values(body, member.wedding_id, config.supabase_url)
    before = db.table("moments").select("photo_url").eq("id", str(moment_id)).eq("wedding_id", member.wedding_id).execute().data
    rows = db.table("moments").update(values).eq("id", str(moment_id)).eq("wedding_id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Moment not found")
    if before and before[0].get("photo_url") != values["photo_url"]:
        photos.delete(db, member.wedding_id, before[0].get("photo_url"), config.supabase_url)
    return MomentOut.from_row(rows[0])


@router.delete("/moments/{moment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_moment(moment_id: UUID, member: Family, db: Db, config: Config) -> Response:
    rows = db.table("moments").delete().eq("id", str(moment_id)).eq("wedding_id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Moment not found")
    photos.delete(db, member.wedding_id, rows[0].get("photo_url"), config.supabase_url)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/photos", status_code=status.HTTP_201_CREATED)
async def upload_photo(request: Request, member: Family, db: Db, config: Config) -> dict[str, str]:
    """Take one picture as the raw request body, shrink it and keep it. Returns the address to put on a moment."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > photos.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "That photo is too large")
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > photos.MAX_UPLOAD_BYTES:
            raise HTTPException(413, "That photo is too large")
    try:
        jpeg = photos.shrink(bytes(data))
    except photos.BadImage as error:
        raise HTTPException(422, str(error)) from error
    if photos.count(db, member.wedding_id) >= photos.MAX_PHOTOS_PER_WEDDING:
        raise HTTPException(422, f"A wedding can keep at most {photos.MAX_PHOTOS_PER_WEDDING} photos")
    return {"url": photos.save(db, member.wedding_id, jpeg, config.supabase_url)}
