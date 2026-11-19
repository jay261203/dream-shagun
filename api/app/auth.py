"""Check the Supabase login token sent by a family member's browser."""

from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    phone: str | None


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CurrentUser:
    """Return the logged-in user, or reply 401. Guests never log in, so only family routes use this."""
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Login required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or not settings.supabase_jwt_secret:
        raise unauthorized
    try:
        claims = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        raise unauthorized from None
    return CurrentUser(id=claims["sub"], email=claims.get("email"), phone=claims.get("phone"))
