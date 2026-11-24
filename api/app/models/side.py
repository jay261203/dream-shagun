from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.services.upi import is_valid_upi_id

Side = Literal["bride", "groom"]


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = " ".join(value.split())
    return value or None


class SideIn(BaseModel):
    """Where one side's blessings go, and the short wish guests read. Both sides are set separately."""

    upi_id: str | None = Field(default=None, max_length=256)
    payee_name: str | None = Field(default=None, max_length=60)
    wish: str | None = Field(default=None, max_length=120)

    @field_validator("upi_id")
    @classmethod
    def valid_upi_id(cls, value: str | None) -> str | None:
        value = _blank_to_none(value)
        if value is None:
            return None
        if not is_valid_upi_id(value):
            raise ValueError("Check the UPI ID. It looks like name@bank")
        return value

    @field_validator("payee_name", "wish")
    @classmethod
    def blank_is_missing(cls, value: str | None) -> str | None:
        return _blank_to_none(value)

    @model_validator(mode="after")
    def id_and_name_together(self) -> "SideIn":
        # The pay link needs both. Neither is allowed (the family has not set it up yet).
        if self.payee_name and not self.upi_id:
            raise ValueError("Add the UPI ID for this name")
        if self.upi_id and not self.payee_name:
            raise ValueError("Add the name shown when guests pay")
        return self


class SideOut(BaseModel):
    side: Side
    upi_id: str | None
    payee_name: str | None
    wish: str | None
