from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from supabase import Client

from app.db import get_supabase
from app.models.event import MAX_EVENTS_PER_WEDDING, EventIn, EventOut, ReorderEvents
from app.services.members import Member, require_member

router = APIRouter(prefix="/weddings/{wedding_id}/events", tags=["events"])

Db = Annotated[Client, Depends(get_supabase)]
Family = Annotated[Member, Depends(require_member)]

COLUMNS = "id, name, kind, starts_at, venue_name, venue_address, map_url, dress_code, note, sort_order"


def _rows(db: Client, wedding_id: str) -> list[dict]:
    rows = db.table("events").select(COLUMNS).eq("wedding_id", wedding_id).execute().data
    return sorted(rows, key=lambda r: (r.get("sort_order") or 0, str(r["starts_at"])))


def _values(body: EventIn) -> dict:
    return {
        "name": body.name,
        "kind": body.kind,
        "starts_at": body.starts_at_utc(),
        "venue_name": body.venue_name,
        "venue_address": body.venue_address,
        "map_url": body.map_url,
        "dress_code": body.dress_code,
        "note": body.note,
    }


@router.get("")
def list_events(member: Family, db: Db) -> list[EventOut]:
    return [EventOut.from_row(r) for r in _rows(db, member.wedding_id)]


@router.post("", status_code=status.HTTP_201_CREATED)
def add_event(body: EventIn, member: Family, db: Db) -> EventOut:
    existing = _rows(db, member.wedding_id)
    if len(existing) >= MAX_EVENTS_PER_WEDDING:
        raise HTTPException(422, f"A wedding can have at most {MAX_EVENTS_PER_WEDDING} events")
    next_order = max((r.get("sort_order") or 0 for r in existing), default=0) + 1
    row = db.table("events").insert({**_values(body), "wedding_id": member.wedding_id, "sort_order": next_order}).execute().data[0]
    return EventOut.from_row(row)


@router.post("/reorder")
def reorder_events(body: ReorderEvents, member: Family, db: Db) -> list[EventOut]:
    """Put the events in the order given. The list must name every event of this wedding exactly once."""
    existing = _rows(db, member.wedding_id)
    wanted = body.ids
    if len(set(wanted)) != len(wanted) or set(wanted) != {str(r["id"]) for r in existing}:
        raise HTTPException(422, "The list must contain every event of this wedding once")
    for position, event_id in enumerate(wanted, start=1):
        db.table("events").update({"sort_order": position}).eq("id", event_id).eq("wedding_id", member.wedding_id).execute()
    return [EventOut.from_row(r) for r in _rows(db, member.wedding_id)]


@router.put("/{event_id}")
def change_event(event_id: UUID, body: EventIn, member: Family, db: Db) -> EventOut:
    # Matching on the wedding as well as the event means an id from another wedding finds nothing.
    rows = db.table("events").update(_values(body)).eq("id", str(event_id)).eq("wedding_id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return EventOut.from_row(rows[0])


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_event(event_id: UUID, member: Family, db: Db) -> Response:
    rows = db.table("events").delete().eq("id", str(event_id)).eq("wedding_id", member.wedding_id).execute().data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
