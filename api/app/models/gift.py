from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

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


# ---------------------------------------------------------------- the hosts' private register (DS-25)

MAX_REGISTER_RUPEES = 10_000_000  # one crore: a cash envelope or bank transfer can be larger than one UPI payment
MAX_REGISTER_ROWS = 5000

GiftMethod = Literal["upi", "cash", "gift"]  # "gift" is a physical gift


class GiftEntryIn(BaseModel):
    """A gift a host records by hand. It is counted as received straight away: the host is the one holding it."""

    side: Side
    giver_name: str = Field(min_length=1, max_length=120)
    method: GiftMethod
    amount_rupees: int | None = Field(default=None, ge=1, le=MAX_REGISTER_RUPEES)
    description: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=300)

    @field_validator("giver_name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Enter who gave it")
        return value

    @field_validator("description", "note")
    @classmethod
    def blank_is_missing(cls, value: str | None) -> str | None:
        return (" ".join(value.split()) or None) if value is not None else None

    @model_validator(mode="after")
    def amount_or_description(self) -> "GiftEntryIn":
        # Money has an amount; a physical gift has a description and no amount, so the money totals stay honest.
        if self.method == "gift":
            if not self.description:
                raise ValueError("Say what the gift was")
            if self.amount_rupees is not None:
                raise ValueError("A physical gift has no amount. Put its value in the note if you want to keep it")
        else:
            if self.amount_rupees is None:
                raise ValueError("Enter the amount in rupees")
            self.description = None
        return self


class GiftStatusIn(BaseModel):
    """A host's check of a gift. Only "received" counts in the totals."""

    status: Literal["received", "not_received", "unchecked"]
