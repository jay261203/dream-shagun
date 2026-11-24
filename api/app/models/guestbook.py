from pydantic import BaseModel, Field, field_validator

MAX_MESSAGES_PER_WEDDING = 1000


class MessageIn(BaseModel):
    """A guest's message for the hosts: a name and some words. Nothing else is asked or kept."""

    name: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=1, max_length=600)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Enter your name")
        return value

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Write a message")
        return value
