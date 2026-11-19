import time

import jwt
import pytest
from fastapi.testclient import TestClient

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


@pytest.fixture
def make_token():
    def _make(sub="user-123", secret=TEST_SECRET, exp_in=3600, aud="authenticated", **extra):
        claims = {"sub": sub, "aud": aud, "exp": int(time.time()) + exp_in, **extra}
        return jwt.encode(claims, secret, algorithm="HS256")

    return _make
