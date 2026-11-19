import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def clean_slug(value: str) -> str:
    return value.strip().lower()


class CreateWedding(BaseModel):
    bride_name: str = Field(min_length=1, max_length=80)
    groom_name: str = Field(min_length=1, max_length=80)
    slug: str = Field(min_length=3, max_length=60)
    side: Literal["bride", "groom"]
    wedding_date: date | None = None
    story: str | None = Field(default=None, max_length=5000)
    cover_photo_url: str | None = Field(default=None, max_length=2000)
    template_id: str | None = Field(default=None, max_length=80)

    @field_validator("bride_name", "groom_name")
    @classmethod
    def strip_names(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be empty")
        return value

    @field_validator("slug")
    @classmethod
    def valid_slug(cls, value: str) -> str:
        value = clean_slug(value)
        if not SLUG_PATTERN.match(value):
            raise ValueError("Use lowercase letters, numbers and single dashes, for example diya-and-aarav")
        return value


class WeddingCreated(BaseModel):
    id: str
    slug: str
    status: str
