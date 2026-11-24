from datetime import date

import pytest

from app.db import get_supabase
from app.main import app
from app.routers import rsvp as rsvp_router
from app.services.ratelimit import RateLimiter
from tests.fakedb import FakeDb

WEDDING_A, WEDDING_B = "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"
MEHENDI, PHERAS, OTHER_EVENT = "aaaaaaaa-0000-0000-0000-000000000001", "aaaaaaaa-0000-0000-0000-000000000002", "bbbbbbbb-0000-0000-0000-000000000001"
URL = "/weddings/meera-and-dev/rsvp"


def good(**changes):
    body = {
        "name": "Rohan Shah",
        "phone": "+91 98765 43210",
        "replies": [{"event_id": MEHENDI, "response": "yes", "party_size": 3}, {"event_id": PHERAS, "response": "maybe", "party_size": 2}],
        "food_choice": "jain",
        "allergies": "Peanuts",
    }
    body.update(changes)
    return body


@pytest.fixture
def db():
    fake = FakeDb(
        weddings=[
            {"id": WEDDING_A, "slug": "meera-and-dev", "status": "published", "rsvp_deadline": None},
            {"id": WEDDING_B, "slug": "other-couple", "status": "published", "rsvp_deadline": None},
            {"id": "33333333-3333-3333-3333-333333333333", "slug": "draft-wedding", "status": "draft", "rsvp_deadline": None},
        ],
        events=[{"id": MEHENDI, "wedding_id": WEDDING_A}, {"id": PHERAS, "wedding_id": WEDDING_A}, {"id": OTHER_EVENT, "wedding_id": WEDDING_B}],
        guests=[],
        rsvps=[],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    app.dependency_overrides[rsvp_router.get_limiter] = lambda: RateLimiter(limit=1000, window_seconds=60)
    yield fake
    app.dependency_overrides.pop(get_supabase, None)
    app.dependency_overrides.pop(rsvp_router.get_limiter, None)


def set_today(monkeypatch, day: str):
    monkeypatch.setattr(rsvp_router, "today_in_india", lambda: date.fromisoformat(day))


class TestReply:
    def test_a_guest_replies_without_logging_in(self, client, db):
        res = client.post(URL, json=good())
        assert res.status_code == 201, res.text
        body = res.json()
        assert len(body["edit_code"]) >= 24
        assert body["name"] == "Rohan Shah" and body["food_choice"] == "jain" and body["allergies"] == "Peanuts"
        assert {(r["event_id"], r["response"], r["party_size"]) for r in body["replies"]} == {(MEHENDI, "yes", 3), (PHERAS, "maybe", 2)}

    def test_it_saves_one_guest_and_one_row_per_event(self, client, db):
        client.post(URL, json=good())
        assert len(db.tables["guests"]) == 1 and db.tables["guests"][0]["source"] == "open" and db.tables["guests"][0]["wedding_id"] == WEDDING_A
        rows = db.tables["rsvps"]
        assert len(rows) == 2 and {r["food_choice"] for r in rows} == {"jain"}

    def test_not_coming_means_nobody_whatever_the_form_sent(self, client, db):
        res = client.post(URL, json=good(replies=[{"event_id": MEHENDI, "response": "no", "party_size": 5}]))
        assert res.status_code == 201 and res.json()["replies"][0]["party_size"] == 0

    @pytest.mark.parametrize(
        "changes",
        [
            {"name": ""}, {"name": "   "}, {"name": "x" * 81}, {"phone": "abc"}, {"phone": "123"}, {"phone": "1" * 16}, {"allergies": "a" * 301},
            {"food_choice": "steak"}, {"replies": []},
            {"replies": [{"event_id": MEHENDI, "response": "yes", "party_size": 0}]},
            {"replies": [{"event_id": MEHENDI, "response": "yes", "party_size": 21}]},
            {"replies": [{"event_id": MEHENDI, "response": "perhaps", "party_size": 1}]},
            {"replies": [{"event_id": MEHENDI, "response": "yes", "party_size": 1}, {"event_id": MEHENDI, "response": "no", "party_size": 0}]},
            {"replies": [{"event_id": "not-an-id", "response": "yes", "party_size": 1}]},
        ],
    )
    def test_bad_input_is_refused_and_nothing_is_saved(self, client, db, changes):
        assert client.post(URL, json=good(**changes)).status_code == 422
        assert db.tables["guests"] == [] and db.tables["rsvps"] == []

    def test_an_event_of_another_wedding_is_refused(self, client, db):
        res = client.post(URL, json=good(replies=[{"event_id": OTHER_EVENT, "response": "yes", "party_size": 1}]))
        assert res.status_code == 422 and db.tables["guests"] == []

    def test_blank_phone_and_allergies_are_stored_as_missing(self, client, db):
        client.post(URL, json=good(phone="  ", allergies="  "))
        assert db.tables["guests"][0]["phone"] is None and db.tables["rsvps"][0]["allergies"] is None

    def test_a_draft_or_unknown_or_odd_link_is_not_found(self, client, db):
        for slug in ("draft-wedding", "no-such-wedding", "Bad_Slug", "ab"):
            assert client.post(f"/weddings/{slug}/rsvp", json=good()).status_code == 404, slug
        assert db.tables["guests"] == []


class TestDeadline:
    def test_closed_after_the_deadline_with_a_clear_message(self, client, db, monkeypatch):
        db.tables["weddings"][0]["rsvp_deadline"] = "2028-01-31"
        set_today(monkeypatch, "2028-02-01")
        res = client.post(URL, json=good())
        assert res.status_code == 403 and "closed" in res.json()["detail"].lower()
        assert db.tables["guests"] == []

    def test_still_open_on_the_deadline_day(self, client, db, monkeypatch):
        db.tables["weddings"][0]["rsvp_deadline"] = "2028-01-31"
        set_today(monkeypatch, "2028-01-31")
        assert client.post(URL, json=good()).status_code == 201

    def test_no_deadline_means_always_open(self, client, db, monkeypatch):
        set_today(monkeypatch, "2099-01-01")
        assert client.post(URL, json=good()).status_code == 201

    def test_changing_a_reply_is_also_closed_after_the_deadline(self, client, db, monkeypatch):
        code = client.post(URL, json=good()).json()["edit_code"]
        db.tables["weddings"][0]["rsvp_deadline"] = "2028-01-31"
        set_today(monkeypatch, "2028-02-01")
        assert client.put(f"{URL}/{code}", json=good(name="Changed")).status_code == 403
        assert db.tables["guests"][0]["display_name"] == "Rohan Shah"


class TestEditing:
    def test_the_guest_reads_their_own_reply_with_their_code(self, client, db):
        code = client.post(URL, json=good()).json()["edit_code"]
        res = client.get(f"{URL}/{code}")
        assert res.status_code == 200 and res.json()["name"] == "Rohan Shah" and len(res.json()["replies"]) == 2

    def test_a_wrong_code_or_another_weddings_code_finds_nothing(self, client, db):
        code = client.post(URL, json=good()).json()["edit_code"]
        assert client.get(f"{URL}/{'x' * 30}").status_code == 404
        assert client.get(f"{URL}/short").status_code == 404
        assert client.get(f"/weddings/other-couple/rsvp/{code}").status_code == 404
        assert client.put(f"/weddings/other-couple/rsvp/{code}", json=good(replies=[{"event_id": OTHER_EVENT, "response": "yes", "party_size": 1}])).status_code == 404

    def test_changing_replaces_answers_and_keeps_one_row_per_event(self, client, db):
        code = client.post(URL, json=good()).json()["edit_code"]
        res = client.put(f"{URL}/{code}", json=good(name="Rohan S", replies=[{"event_id": MEHENDI, "response": "no"}, {"event_id": PHERAS, "response": "yes", "party_size": 4}], food_choice="veg", allergies=None))
        assert res.status_code == 200, res.text
        assert len(db.tables["guests"]) == 1 and db.tables["guests"][0]["display_name"] == "Rohan S"
        by_event = {r["event_id"]: r for r in db.tables["rsvps"]}
        assert len(by_event) == 2 and by_event[MEHENDI]["response"] == "no" and by_event[MEHENDI]["party_size"] == 0
        assert by_event[PHERAS]["party_size"] == 4 and by_event[PHERAS]["food_choice"] == "veg" and by_event[PHERAS]["allergies"] is None

    def test_leaving_an_event_out_removes_that_reply(self, client, db):
        code = client.post(URL, json=good()).json()["edit_code"]
        client.put(f"{URL}/{code}", json=good(replies=[{"event_id": PHERAS, "response": "yes", "party_size": 1}]))
        assert [r["event_id"] for r in db.tables["rsvps"]] == [PHERAS]

    def test_one_guest_cannot_change_another_guests_reply(self, client, db):
        mine = client.post(URL, json=good(name="Mine")).json()["edit_code"]
        client.post(URL, json=good(name="Theirs"))
        client.put(f"{URL}/{mine}", json=good(name="Mine changed"))
        names = sorted(g["display_name"] for g in db.tables["guests"])
        assert names == ["Mine changed", "Theirs"]
        assert len(db.tables["rsvps"]) == 4


class TestLimits:
    def test_one_visitor_is_slowed_down_but_another_is_not(self, client, db):
        # one limiter shared by every call in this test, so the count carries over
        shared = RateLimiter(limit=2, window_seconds=600)
        app.dependency_overrides[rsvp_router.get_limiter] = lambda: shared
        a = {"x-forwarded-for": "1.2.3.4"}
        assert client.post(URL, json=good(), headers=a).status_code == 201
        assert client.post(URL, json=good(), headers=a).status_code == 201
        slow = client.post(URL, json=good(), headers=a)
        assert slow.status_code == 429 and "wait" in slow.json()["detail"].lower()
        assert client.post(URL, json=good(), headers={"x-forwarded-for": "5.6.7.8"}).status_code == 201
        assert len(db.tables["guests"]) == 3

    def test_a_wedding_cannot_collect_endless_guests(self, client, db):
        from app.models.rsvp import MAX_GUESTS_PER_WEDDING

        db.tables["guests"] = [{"id": f"g{i}", "wedding_id": WEDDING_A, "display_name": "x"} for i in range(MAX_GUESTS_PER_WEDDING)]
        assert client.post(URL, json=good()).status_code == 429


class TestRateLimiter:
    def test_window_slides(self):
        now = [0.0]
        limiter = RateLimiter(limit=2, window_seconds=10, clock=lambda: now[0])
        assert limiter.allow("a") and limiter.allow("a") and not limiter.allow("a")
        now[0] = 10.0
        assert limiter.allow("a")
