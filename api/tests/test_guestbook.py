import pytest

from app.db import get_supabase
from app.main import app
from app.routers import guestbook as guestbook_router
from app.services.ratelimit import RateLimiter
from tests.fakedb import FakeDb

A = "11111111-1111-1111-1111-111111111111"
URL = "/weddings/meera-and-dev/guestbook"


def good(**changes):
    body = {"name": "Rohan Shah", "message": "Wishing you both a lifetime of happiness."}
    body.update(changes)
    return body


@pytest.fixture
def db():
    fake = FakeDb(
        weddings=[
            {"id": A, "slug": "meera-and-dev", "status": "published", "sections_enabled": ["cover", "events", "guestbook"]},
            {"id": "33333333-3333-3333-3333-333333333333", "slug": "draft-wedding", "status": "draft", "sections_enabled": ["cover", "guestbook"]},
        ],
        guestbook=[],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    app.dependency_overrides[guestbook_router.get_limiter] = lambda: RateLimiter(limit=1000, window_seconds=60)
    yield fake
    app.dependency_overrides.pop(get_supabase, None)
    app.dependency_overrides.pop(guestbook_router.get_limiter, None)


class TestLeaveMessage:
    def test_a_guest_leaves_a_message_without_logging_in(self, client, db):
        res = client.post(URL, json=good())
        assert res.status_code == 201 and res.json() == {"ok": True}
        (row,) = db.tables["guestbook"]
        assert row["wedding_id"] == A and row["guest_name"] == "Rohan Shah" and row["message"].startswith("Wishing you")

    def test_the_answer_says_nothing_about_other_messages(self, client, db):
        client.post(URL, json=good(name="First", message="Secret first message"))
        text = client.post(URL, json=good(name="Second")).text
        assert "First" not in text and "Secret" not in text

    def test_nothing_can_be_read_through_the_public_route(self, client, db):
        client.post(URL, json=good())
        assert client.get(URL).status_code == 405

    def test_spaces_are_tidied(self, client, db):
        client.post(URL, json=good(name="  Rohan    Shah ", message="  Hello  "))
        assert db.tables["guestbook"][0]["guest_name"] == "Rohan Shah" and db.tables["guestbook"][0]["message"] == "Hello"

    def test_money_has_no_place_here(self, client, db):
        client.post(URL, json=good(amount_rupees=5100, side="bride", status="received"))
        assert set(db.tables["guestbook"][0]) <= {"id", "wedding_id", "guest_name", "message"}

    @pytest.mark.parametrize("changes", [{"name": ""}, {"name": "   "}, {"name": "x" * 81}, {"message": ""}, {"message": "   "}, {"message": "m" * 601}, {"name": None}, {"message": 5}])
    def test_bad_input_is_refused_and_nothing_is_saved(self, client, db, changes):
        assert client.post(URL, json=good(**changes)).status_code == 422
        assert db.tables["guestbook"] == []

    def test_a_message_of_the_longest_allowed_size_works(self, client, db):
        assert client.post(URL, json=good(message="m" * 600, name="n" * 80)).status_code == 201

    def test_a_draft_or_odd_link_is_not_found(self, client, db):
        for slug in ("draft-wedding", "nothing-here", "Bad_Slug", "ab"):
            assert client.post(f"/weddings/{slug}/guestbook", json=good()).status_code == 404, slug
        assert db.tables["guestbook"] == []

    def test_switched_off_means_refused(self, client, db):
        db.tables["weddings"][0]["sections_enabled"] = ["cover", "events"]
        assert client.post(URL, json=good()).status_code == 422 and db.tables["guestbook"] == []


class TestLimits:
    def test_one_visitor_is_slowed_down_but_another_is_not(self, client, db):
        shared = RateLimiter(limit=2, window_seconds=600)
        app.dependency_overrides[guestbook_router.get_limiter] = lambda: shared
        a = {"x-forwarded-for": "1.2.3.4"}
        assert client.post(URL, json=good(), headers=a).status_code == 201
        assert client.post(URL, json=good(), headers=a).status_code == 201
        slow = client.post(URL, json=good(), headers=a)
        assert slow.status_code == 429 and "wait" in slow.json()["detail"].lower()
        assert client.post(URL, json=good(), headers={"x-forwarded-for": "5.6.7.8"}).status_code == 201

    def test_an_invitation_cannot_collect_endless_messages(self, client, db):
        from app.models.guestbook import MAX_MESSAGES_PER_WEDDING

        db.tables["guestbook"] = [{"id": f"m{i}", "wedding_id": A} for i in range(MAX_MESSAGES_PER_WEDDING)]
        assert client.post(URL, json=good()).status_code == 429
