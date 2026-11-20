"""Check the Supabase login token sent by a family member's browser.

Supabase signs login tokens one of two ways, depending on the project:

* HS256, with a shared secret. Local Supabase and older projects. We hold the secret (SUPABASE_JWT_SECRET).
* ES256 or RS256, with a key pair. New hosted projects. We fetch the public keys from the project's JWKS address.

The algorithm to use is decided by us, never by the token: each kind only accepts its own algorithm, so a forged
token cannot ask for a weaker one (the "alg: none" and "sign it with the public key as a secret" tricks).
"""

import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import Settings, get_settings

logger = logging.getLogger("dream_shagun")

bearer = HTTPBearer(auto_error=False)

ASYMMETRIC_ALGORITHMS = {"ES256", "RS256"}


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    phone: str | None


@lru_cache
def _jwks_client(url: str) -> PyJWKClient:
    # The client keeps fetched keys for ten minutes, so a request does not call Supabase every time.
    return PyJWKClient(url, cache_keys=True, lifespan=600, timeout=5)


def get_jwks_client(settings: Annotated[Settings, Depends(get_settings)]) -> PyJWKClient | None:
    """The public-key source for asymmetric tokens, or None when no Supabase address is set."""
    if not settings.supabase_url:
        return None
    return _jwks_client(f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json")


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
    jwks: Annotated[PyJWKClient | None, Depends(get_jwks_client)],
) -> CurrentUser:
    """Return the logged-in user, or reply 401. Guests never log in, so only family routes use this."""
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Login required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    token = credentials.credentials

    try:
        algorithm = jwt.get_unverified_header(token).get("alg")
        if algorithm == "HS256":
            if not settings.supabase_jwt_secret:
                raise unauthorized
            key: object = settings.supabase_jwt_secret
        elif algorithm in ASYMMETRIC_ALGORITHMS:
            if jwks is None:
                raise unauthorized
            key = jwks.get_signing_key_from_jwt(token).key
        else:
            raise unauthorized
        claims = jwt.decode(
            token,
            key,  # type: ignore[arg-type]
            algorithms=[algorithm],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except HTTPException:
        raise
    except jwt.PyJWKClientConnectionError:
        # Supabase could not be reached for its keys. The caller sees a plain 401; we log the real reason.
        logger.warning("Could not fetch Supabase signing keys")
        raise unauthorized from None
    except jwt.PyJWTError:
        raise unauthorized from None

    return CurrentUser(id=claims["sub"], email=claims.get("email"), phone=claims.get("phone"))
