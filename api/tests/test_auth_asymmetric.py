"""Login tokens signed with a key pair (new hosted Supabase projects), and tokens that try to cheat."""

import base64
import hashlib
import hmac
import json
import time

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from tests.conftest import TEST_SECRET


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def es256(key, sub="user-1", exp_in=3600, aud="authenticated", **extra):
    claims = {"sub": sub, "aud": aud, "exp": int(time.time()) + exp_in, **extra}
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": "key-1"})


def test_accepts_a_token_signed_with_the_project_key(client, jwks, ec_key):
    token = es256(ec_key, sub="family-7", email="mehta@example.com")
    response = client.get("/me", headers=auth(token))
    assert response.status_code == 200
    assert response.json() == {"id": "family-7", "email": "mehta@example.com", "phone": None}


def test_rejects_a_token_signed_by_someone_elses_key(client, jwks):
    other = ec.generate_private_key(ec.SECP256R1())
    assert client.get("/me", headers=auth(es256(other))).status_code == 401


def test_rejects_an_expired_asymmetric_token(client, jwks, ec_key):
    assert client.get("/me", headers=auth(es256(ec_key, exp_in=-10))).status_code == 401


def test_rejects_the_wrong_audience(client, jwks, ec_key):
    assert client.get("/me", headers=auth(es256(ec_key, aud="anon"))).status_code == 401


def test_rejects_alg_none(client, jwks):
    token = jwt.encode({"sub": "x", "aud": "authenticated", "exp": int(time.time()) + 600}, key=None, algorithm="none")
    assert client.get("/me", headers=auth(token)).status_code == 401


def test_public_key_cannot_be_used_as_an_hs256_secret(client, jwks, ec_key):
    """The classic key-confusion attack: sign with HS256 using the public key as if it were the shared secret.

    The JWT library refuses to build such a token, so it is assembled by hand, as an attacker would.
    """
    public_pem = ec_key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )

    def b64(data: bytes) -> bytes:
        return base64.urlsafe_b64encode(data).rstrip(b"=")

    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({"sub": "attacker", "aud": "authenticated", "exp": int(time.time()) + 600}).encode())
    signature = b64(hmac.new(public_pem, header + b"." + payload, hashlib.sha256).digest())
    token = (header + b"." + payload + b"." + signature).decode()
    assert client.get("/me", headers=auth(token)).status_code == 401


def test_rejects_an_unsupported_algorithm(client, jwks):
    token = jwt.encode({"sub": "x", "aud": "authenticated", "exp": int(time.time()) + 600}, TEST_SECRET, algorithm="HS512")
    assert client.get("/me", headers=auth(token)).status_code == 401


def test_asymmetric_token_is_refused_when_no_supabase_address_is_configured(client, ec_key):
    # No jwks override and the test settings have an address, but make the lookup fail the way an outage would.
    from app.auth import get_jwks_client
    from app.main import app

    app.dependency_overrides[get_jwks_client] = lambda: None
    try:
        assert client.get("/me", headers=auth(es256(ec_key))).status_code == 401
    finally:
        app.dependency_overrides.pop(get_jwks_client, None)


def test_shared_secret_tokens_still_work_alongside(client, jwks, make_token):
    assert client.get("/me", headers=auth(make_token(sub="local-user"))).status_code == 200
