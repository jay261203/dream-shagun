import pytest

from app.db import get_supabase
from app.main import app
from tests.fakedb import FakeDb

WEDDING_A = "11111111-1111-1111-1111-111111111111"
WEDDING_B = "22222222-2222-2222-2222-222222222222"


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def db():
    fake = FakeDb(
        family_members=[
            {"wedding_id": WEDDING_A, "user_id": "owner-a", "role": "owner", "side": "bride"},
            {"wedding_id": WEDDING_A, "user_id": "helper-a", "role": "helper", "side": "groom"},
            {"wedding_id": WEDDING_B, "user_id": "owner-b", "role": "owner", "side": "bride"},
        ],
        weddings=[
            {"id": WEDDING_A, "slug": "meera-and-dev", "status": "draft", "bride_name": "Meera", "groom_name": "Dev", "wedding_date": "2028-02-12"},
            {"id": WEDDING_B, "slug": "other", "status": "draft", "bride_name": "O", "groom_name": "C", "wedding_date": "2028-01-01"},
        ],
        events=[{"id": "e1", "wedding_id": WEDDING_A, "name": "Pheras"}],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_supabase, None)


@pytest.fixture
def owner(make_token):
    return auth(make_token(sub="owner-a"))


def status_of(db, wedding=WEDDING_A):
    return next(w for w in db.tables["weddings"] if w["id"] == wedding)["status"]


class TestWho:
    def test_login_is_required(self, client, db):
        assert client.post(f"/weddings/{WEDDING_A}/publish").status_code == 401
        assert client.post(f"/weddings/{WEDDING_A}/unpublish").status_code == 401

    def test_a_stranger_cannot_publish_or_unpublish(self, client, db, make_token):
        stranger = auth(make_token(sub="owner-b"))
        assert client.post(f"/weddings/{WEDDING_A}/publish", headers=stranger).status_code == 404
        assert status_of(db) == "draft"
        db.tables["weddings"][0]["status"] = "published"
        assert client.post(f"/weddings/{WEDDING_A}/unpublish", headers=stranger).status_code == 404
        assert status_of(db) == "published"

    def test_only_the_stranger_own_wedding_changes(self, client, db, owner):
        client.post(f"/weddings/{WEDDING_A}/publish", headers=owner)
        assert status_of(db, WEDDING_B) == "draft"


class TestPublish:
    def test_publishes_and_returns_the_link_name(self, client, db, owner):
        res = client.post(f"/weddings/{WEDDING_A}/publish", headers=owner)
        assert res.status_code == 200 and res.json() == {"status": "published", "slug": "meera-and-dev"}
        assert status_of(db) == "published"

    def test_publishing_twice_is_fine(self, client, db, owner):
        client.post(f"/weddings/{WEDDING_A}/publish", headers=owner)
        assert client.post(f"/weddings/{WEDDING_A}/publish", headers=owner).status_code == 200

    def test_a_helper_in_the_family_may(self, client, db, make_token):
        assert client.post(f"/weddings/{WEDDING_A}/publish", headers=auth(make_token(sub="helper-a"))).status_code == 200

    def test_refused_with_the_list_of_what_is_missing(self, client, db, owner):
        db.tables["events"].clear()
        db.tables["weddings"][0]["wedding_date"] = None
        res = client.post(f"/weddings/{WEDDING_A}/publish", headers=owner)
        assert res.status_code == 422
        assert res.json()["detail"]["missing"] == ["The wedding date", "At least one event"]
        assert status_of(db) == "draft"

    def test_a_blank_name_counts_as_missing(self, client, db, owner):
        db.tables["weddings"][0]["groom_name"] = "  "
        res = client.post(f"/weddings/{WEDDING_A}/publish", headers=owner)
        assert res.status_code == 422 and res.json()["detail"]["missing"] == ["Both names"]

    def test_events_of_another_wedding_do_not_count(self, client, db, owner):
        db.tables["events"][0]["wedding_id"] = WEDDING_B
        assert client.post(f"/weddings/{WEDDING_A}/publish", headers=owner).status_code == 422


class TestUnpublish:
    def test_takes_it_offline_and_keeps_everything(self, client, db, owner):
        client.post(f"/weddings/{WEDDING_A}/publish", headers=owner)
        res = client.post(f"/weddings/{WEDDING_A}/unpublish", headers=owner)
        assert res.status_code == 200 and res.json()["status"] == "draft"
        assert status_of(db) == "draft" and len(db.tables["events"]) == 1

    def test_unpublishing_a_draft_is_fine(self, client, db, owner):
        assert client.post(f"/weddings/{WEDDING_A}/unpublish", headers=owner).status_code == 200
