import pytest

from app.db import get_supabase
from app.main import app
from tests.fakes import FakeSupabase

BODY = {
    "bride_name": " Diya ",
    "groom_name": "Aarav",
    "slug": "Diya-And-Aarav",
    "side": "bride",
    "wedding_date": "2027-02-14",
}


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def db():
    fake = FakeSupabase(taken_slugs=["mehta-wedding", "mehta-wedding-2"])
    app.dependency_overrides[get_supabase] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_supabase, None)


def test_create_requires_login(client, db):
    assert client.post("/weddings", json=BODY).status_code == 401
    assert db.rpc_calls == []


def test_create_wedding_makes_caller_the_owner(client, db, make_token):
    token = make_token(sub="user-9", email="owner@example.com")
    response = client.post("/weddings", json=BODY, headers=auth(token))
    assert response.status_code == 201
    assert response.json()["slug"] == "diya-and-aarav"
    assert response.json()["status"] == "draft"
    _, params = db.rpc_calls[0]
    assert params["p_user_id"] == "user-9"
    assert params["p_email"] == "owner@example.com"
    assert params["p_side"] == "bride"
    assert params["p_bride_name"] == "Diya"  # trimmed
    assert params["p_wedding_date"] == "2027-02-14"
    assert params["p_color_preset"] is None


def test_create_keeps_the_template_and_colour_the_visitor_picked(client, db, make_token):
    body = {**BODY, "template_id": "marigold", "color_preset": "rose"}
    assert client.post("/weddings", json=body, headers=auth(make_token())).status_code == 201
    _, params = db.rpc_calls[0]
    assert (params["p_template_id"], params["p_color_preset"]) == ("marigold", "rose")


@pytest.mark.parametrize("colour", ["Rose", "rose; drop table", "<b>", "x" * 41])
def test_a_bad_colour_name_is_rejected(client, db, make_token, colour):
    response = client.post("/weddings", json={**BODY, "color_preset": colour}, headers=auth(make_token()))
    assert response.status_code == 422
    assert db.rpc_calls == []


def test_taken_slug_returns_409_with_suggestions(client, db, make_token):
    body = {**BODY, "slug": "mehta-wedding"}
    response = client.post("/weddings", json=body, headers=auth(make_token()))
    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["message"] == "That link name is taken"
    assert detail["suggestions"], "should offer at least one free alternative"
    assert "mehta-wedding-2" not in detail["suggestions"]  # already taken
    assert all(s.startswith("mehta-wedding-") for s in detail["suggestions"])


@pytest.mark.parametrize("slug", ["ab", "Has Space", "-leading", "double--dash", "trailing-", "ünïcode"])
def test_bad_slug_is_rejected(client, db, make_token, slug):
    response = client.post("/weddings", json={**BODY, "slug": slug}, headers=auth(make_token()))
    assert response.status_code == 422
    assert db.rpc_calls == []


def test_bad_side_and_blank_name_are_rejected(client, db, make_token):
    token = make_token()
    assert client.post("/weddings", json={**BODY, "side": "both"}, headers=auth(token)).status_code == 422
    assert client.post("/weddings", json={**BODY, "bride_name": "   "}, headers=auth(token)).status_code == 422


def test_slug_check_available(client, db, make_token):
    response = client.get("/weddings/slug-check", params={"slug": "fresh-name"}, headers=auth(make_token()))
    assert response.json() == {"available": True, "suggestions": []}


def test_slug_check_taken_suggests(client, db, make_token):
    response = client.get("/weddings/slug-check", params={"slug": "mehta-wedding"}, headers=auth(make_token()))
    body = response.json()
    assert body["available"] is False and body["reason"] == "taken"
    assert body["suggestions"]


def test_slug_check_requires_login(client, db):
    assert client.get("/weddings/slug-check", params={"slug": "fresh-name"}).status_code == 401
