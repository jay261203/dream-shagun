from datetime import date, datetime, time, timedelta, timezone
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

# India has one time zone and no daylight saving, so a fixed offset is exact and needs no time-zone database.
IST = timezone(timedelta(hours=5, minutes=30))

EventKind = Literal["mehendi", "haldi", "sangeet", "pheras", "reception", "other"]

MAX_EVENTS_PER_WEDDING = 20


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class EventIn(BaseModel):
    """What the family fills in for one function. The date and time are what a person in India would write."""

    name: str = Field(min_length=1, max_length=80)
    kind: EventKind = "other"
    local_date: date
    local_time: time
    venue_name: str | None = Field(default=None, max_length=120)
    venue_address: str | None = Field(default=None, max_length=250)
    map_url: str | None = Field(default=None, max_length=500)
    dress_code: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=300)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be empty")
        return value

    @field_validator("venue_name", "venue_address", "dress_code", "note")
    @classmethod
    def blank_is_missing(cls, value: str | None) -> str | None:
        return _blank_to_none(value)

    @field_validator("map_url")
    @classmethod
    def only_web_links(cls, value: str | None) -> str | None:
        value = _blank_to_none(value)
        if value is None:
            return None
        parsed = urlparse(value)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("The map link must start with http:// or https://")
        return value

    @field_validator("local_date")
    @classmethod
    def sensible_year(cls, value: date) -> date:
        if not 2000 <= value.year <= 2100:
            raise ValueError("Pick a date between 2000 and 2100")
        return value

    def starts_at_utc(self) -> str:
        """The instant to store: this India clock reading, as a UTC timestamp."""
        local = datetime.combine(self.local_date, self.local_time.replace(second=0, microsecond=0), tzinfo=IST)
        return local.astimezone(timezone.utc).isoformat()


class EventOut(BaseModel):
    id: str
    name: str
    kind: str
    starts_at: str
    local_date: str
    local_time: str
    venue_name: str | None
    venue_address: str | None
    map_url: str | None
    dress_code: str | None
    note: str | None
    sort_order: int

    @classmethod
    def from_row(cls, row: dict) -> "EventOut":
        instant = datetime.fromisoformat(str(row["starts_at"]).replace("Z", "+00:00"))
        local = instant.astimezone(IST)
        return cls(
            id=str(row["id"]),
            name=row["name"],
            kind=row.get("kind") or "other",
            starts_at=instant.astimezone(timezone.utc).isoformat(),
            local_date=local.strftime("%Y-%m-%d"),
            local_time=local.strftime("%H:%M"),
            venue_name=row.get("venue_name"),
            venue_address=row.get("venue_address"),
            map_url=row.get("map_url"),
            dress_code=row.get("dress_code"),
            note=row.get("note"),
            sort_order=int(row.get("sort_order") or 0),
        )


class ReorderEvents(BaseModel):
    """Every event of the wedding, in the order they should appear."""

    ids: list[str] = Field(min_length=1, max_length=MAX_EVENTS_PER_WEDDING)
