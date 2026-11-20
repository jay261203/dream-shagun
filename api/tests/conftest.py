import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.auth import get_jwks_client
from app.config import Settings, get_settings
from app.main import app

TEST_SECRET = "test-secret-at-least-32-characters-long!!"


@pytest.fixture
def client():
    app.dependency_overrides[get_settings] = lambda: Settings(
        supabase_url="http://localhost:54321",
        supabase_service_role_key="test",
        supabase_jwt_secret=TEST_SECRET,
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


class FakeSigningKey:
    def __init__(self, key):
        self.key = key


class FakeJwks:
    """Stands in for the Supabase JWKS address: hands back one known public key."""

    def __init__(self, public_key):
        self.public_key = public_key

    def get_signing_key_from_jwt(self, _token):
        return FakeSigningKey(self.public_key)


@pytest.fixture
def ec_key():
    return ec.generate_private_key(ec.SECP256R1())


@pytest.fixture
def jwks(client, ec_key):
    app.dependency_overrides[get_jwks_client] = lambda: FakeJwks(ec_key.public_key())
    yield
    app.dependency_overrides.pop(get_jwks_client, None)


@pytest.fixture
def make_token():
    def _make(sub="user-123", secret=TEST_SECRET, exp_in=3600, aud="authenticated", **extra):
        claims = {"sub": sub, "aud": aud, "exp": int(time.time()) + exp_in, **extra}
        return jwt.encode(claims, secret, algorithm="HS256")

    return _make
