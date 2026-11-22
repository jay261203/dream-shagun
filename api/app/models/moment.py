import re

from pydantic import BaseModel, Field, field_validator

MAX_MOMENTS_PER_WEDDING = 12

_MONTH = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class MomentIn(BaseModel):
    """One step of the couple's story. The date is a month and year, written like 2024-03."""

    title: str = Field(min_length=1, max_length=80)
    month: str | None = None
    caption: str | None = Field(default=None, max_length=300)
    photo_url: str | None = Field(default=None, max_length=500)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be empty")
        return value

    @field_validator("month")
    @classmethod
    def month_shape(cls, value: str | None) -> str | None:
        value = _blank_to_none(value)
        if value is None:
            return None
        match = _MONTH.match(value)
        if not match or not 1950 <= int(match.group(1)) <= 2100:
            raise ValueError("Pick a month and year between 1950 and 2100")
        return value

    @field_validator("caption", "photo_url")
    @classmethod
    def blank_is_missing(cls, value: str | None) -> str | None:
        return _blank_to_none(value)

    def happened_on(self) -> str | None:
        """The database stores a date, so a month is kept as the first of that month."""
        return f"{self.month}-01" if self.month else None


class MomentOut(BaseModel):
    id: str
    title: str
    month: str | None
    caption: str | None
    photo_url: str | None
    sort_order: int

    @classmethod
    def from_row(cls, row: dict) -> "MomentOut":
        happened = row.get("happened_on")
        return cls(
            id=str(row["id"]),
            title=row["title"],
            month=str(happened)[:7] if happened else None,
            caption=row.get("caption"),
            photo_url=row.get("photo_url"),
            sort_order=int(row.get("sort_order") or 0),
        )


class ReorderMoments(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=MAX_MOMENTS_PER_WEDDING)
