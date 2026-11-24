import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

MAX_REPLIES = 20  # one per event, and a wedding has at most 20 events
MAX_GUESTS_PER_WEDDING = 800

Response = Literal["yes", "maybe", "no"]
Food = Literal["veg", "jain", "other"]

_PHONE_CHARS = re.compile(r"^[0-9+()\- ]+$")


class EventReply(BaseModel):
    event_id: UUID
    response: Response
    party_size: int = Field(default=1, ge=0, le=20)

    @model_validator(mode="after")
    def party_matches_answer(self) -> "EventReply":
        # Not coming means nobody; coming or maybe means at least the guest.
        if self.response == "no":
            self.party_size = 0
        elif self.party_size < 1:
            raise ValueError("Say how many people are coming")
        return self


class RsvpIn(BaseModel):
    """A guest's reply to the events of one wedding. No login: the guest only gives a name."""

    name: str = Field(min_length=1, max_length=80)
    phone: str | None = Field(default=None, max_length=20)
    replies: list[EventReply] = Field(min_length=1, max_length=MAX_REPLIES)
    food_choice: Food | None = None
    allergies: str | None = Field(default=None, max_length=300)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Enter your name")
        return value

    @field_validator("phone")
    @classmethod
    def phone_shape(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        digits = [c for c in value if c.isdigit()]
        if not _PHONE_CHARS.match(value) or not 7 <= len(digits) <= 15:
            raise ValueError("Enter a phone number with 7 to 15 digits")
        return value

    @field_validator("allergies")
    @classmethod
    def blank_allergies(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def one_reply_per_event(self) -> "RsvpIn":
        ids = [r.event_id for r in self.replies]
        if len(set(ids)) != len(ids):
            raise ValueError("Reply once for each event")
        return self


class RsvpOut(BaseModel):
    edit_code: str
    name: str
    phone: str | None
    replies: list[EventReply]
    food_choice: str | None
    allergies: str | None
