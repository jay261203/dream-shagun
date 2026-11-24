from typing import Literal

from pydantic import BaseModel, Field, field_validator

# Amounts are rupees in the form and integer paise in the database, so no float ever touches money.
PRESET_RUPEES = (501, 1001, 2100, 5100)
MIN_RUPEES = 1
MAX_RUPEES = 100_000  # the usual limit for one UPI payment
MAX_BLESSINGS_PER_WEDDING = 2000

Side = Literal["bride", "groom"]


class BlessingIn(BaseModel):
    """A guest's blessing: which side, how much, who it is from and an optional note."""

    side: Side
    amount_rupees: int = Field(ge=MIN_RUPEES, le=MAX_RUPEES)
    name: str = Field(min_length=1, max_length=80)
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
        if value is None:
            return None
        return value.strip() or None

    def amount_paise(self) -> int:
        return self.amount_rupees * 100


class SideOption(BaseModel):
    side: Side
    host: str
    wish: str | None


class BlessingOptions(BaseModel):
    enabled: bool
    sides: list[SideOption]
    presets: list[int]
    min_rupees: int
    max_rupees: int
