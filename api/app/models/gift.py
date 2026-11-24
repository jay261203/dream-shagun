from pydantic import BaseModel, Field, field_validator

from app.models.side import Side

MIN_RUPEES = 1
MAX_RUPEES = 100_000  # the usual limit for one UPI payment
MAX_GIFT_NOTES_PER_WEDDING = 2000


class GiftNoteIn(BaseModel):
    """A guest saying "I sent a gift". Nothing is checked or verified: the hosts confirm it themselves in their own register."""

    side: Side
    name: str = Field(min_length=1, max_length=80)
    amount_rupees: int | None = Field(default=None, ge=MIN_RUPEES, le=MAX_RUPEES)
    note: str | None = Field(default=None, max_length=300)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Enter your name")
        return value

    @field_validator("note")
    @classmethod
    def blank_note(cls, value: str | None) -> str | None:
        return (value.strip() or None) if value is not None else None


class GiftSide(BaseModel):
    side: Side
    host: str
    wish: str | None
    upi_id: str
    payee_name: str
    link: str


class GiftPage(BaseModel):
    mode: str
    sides: list[GiftSide]
