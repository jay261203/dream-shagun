from datetime import date

from pydantic import BaseModel, Field, field_validator

# Sections a template can switch on or off. "cover" is always shown, so it is always kept.
KNOWN_SECTIONS = ("cover", "couple", "journey", "events", "countdown", "rsvp", "blessing", "contact")

_CODE = r"^[a-z0-9-]+$"


class WeddingChanges(BaseModel):
    """Details the family can change after the wedding is created. Only the fields sent are changed."""

    bride_name: str | None = Field(default=None, min_length=1, max_length=80)
    groom_name: str | None = Field(default=None, min_length=1, max_length=80)
    wedding_date: date | None = None
    story: str | None = Field(default=None, max_length=5000)
    color_preset: str | None = Field(default=None, min_length=1, max_length=40, pattern=_CODE)
    font_pair: str | None = Field(default=None, min_length=1, max_length=40, pattern=_CODE)
    music_enabled: bool | None = None
    sections_enabled: list[str] | None = Field(default=None, max_length=len(KNOWN_SECTIONS))

    @field_validator("bride_name", "groom_name")
    @classmethod
    def names_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be empty")
        return value

    @field_validator("wedding_date")
    @classmethod
    def sensible_year(cls, value: date | None) -> date | None:
        if value is not None and not 2000 <= value.year <= 2100:
            raise ValueError("Pick a date between 2000 and 2100")
        return value

    @field_validator("story")
    @classmethod
    def blank_story_is_missing(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("sections_enabled")
    @classmethod
    def known_sections(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        unknown = [s for s in value if s not in KNOWN_SECTIONS]
        if unknown:
            raise ValueError("Unknown section")
        # In page order, no repeats, and the cover can never be switched off.
        wanted = set(value) | {"cover"}
        return [s for s in KNOWN_SECTIONS if s in wanted]

    def changes(self) -> dict:
        """Only what was sent. Sending null for the story or the date clears it; the other fields cannot be cleared."""
        sent = self.model_fields_set
        out: dict = {}
        for name in sent:
            value = getattr(self, name)
            if value is None and name not in ("story", "wedding_date"):
                continue
            out[name] = value.isoformat() if isinstance(value, date) else value
        return out
