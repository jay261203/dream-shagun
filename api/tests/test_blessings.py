import pytest

from app.db import get_supabase
from app.main import app
from app.routers import blessings as blessings_router
from app.services.ratelimit import RateLimiter
from tests.fakedb import FakeDb

A = "11111111-1111-1111-1111-111111111111"
OPTIONS = "/weddings/meera-and-dev/blessing-options"
SEND = "/weddings/meera-and-dev/blessings"


def good(**changes):
    body = {"side": "bride", "amount_rupees": 1001, "name": "Rohan Shah", "note": "Congratulations to you both"}
    body.update(changes)
    return body


@pytest.fixture
def db():
    fake = FakeDb(
        weddings=[
            {
                "id": A, "slug": "meera-and-dev", "status": "published", "bride_name": "Meera", "groom_name": "Dev", "blessings_enabled": True,
                "bride_side_upi": "meera@okhdfc", "bride_side_payee_name": "Meera Shah", "groom_side_upi": None, "groom_side_payee_name": None,
            },
            {"id": "33333333-3333-3333-3333-333333333333", "slug": "draft-wedding", "status": "draft", "bride_name": "D", "groom_name": "R", "blessings_enabled": True,
             "bride_side_upi": "d@upi", "bride_side_payee_name": "D", "groom_side_upi": None, "groom_side_payee_name": None},
        ],
        wishes=[{"id": "w1", "wedding_id": A, "side": "bride", "title": "Bless our new home"}],
        blessings=[],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    app.dependency_overrides[blessings_router.get_limiter] = lambda: RateLimiter(limit=1000, window_seconds=60)
    yield fake
    app.dependency_overrides.pop(get_supabase, None)
    app.dependency_overrides.pop(blessings_router.get_limiter, None)


def wedding(db):
    return db.tables["weddings"][0]


class TestOptions:
    def test_a_guest_sees_only_sides_that_are_set_up_with_their_wish(self, client, db):
        body = client.get(OPTIONS).json()
        assert body["enabled"] is True
        assert body["sides"] == [{"side": "bride", "host": "Meera", "wish": "Bless our new home"}]
        assert body["presets"] == [501, 1001, 2100, 5100] and body["min_rupees"] == 1 and body["max_rupees"] == 100000

    def test_no_upi_id_or_payee_name_ever_reaches_a_guest(self, client, db):
        text = client.get(OPTIONS).text
        for secret in ("meera@okhdfc", "Meera Shah", "upi", "payee"):
            assert secret not in text, secret

    def test_both_sides_show_once_both_are_set_up_and_a_side_without_a_wish_still_shows(self, client, db):
        wedding(db).update({"groom_side_upi": "dev@oksbi", "groom_side_payee_name": "Dev Shah"})
        sides = client.get(OPTIONS).json()["sides"]
        assert [(s["side"], s["wish"]) for s in sides] == [("bride", "Bless our new home"), ("groom", None)]

    def test_a_side_with_only_half_the_details_is_left_out(self, client, db):
        wedding(db).update({"groom_side_upi": "dev@oksbi", "groom_side_payee_name": None})
        assert [s["side"] for s in client.get(OPTIONS).json()["sides"]] == ["bride"]

    def test_switched_off_or_nothing_set_up_means_not_enabled(self, client, db):
        wedding(db)["blessings_enabled"] = False
        assert client.get(OPTIONS).json() == {"enabled": False, "sides": [], "presets": [501, 1001, 2100, 5100], "min_rupees": 1, "max_rupees": 100000}
        wedding(db).update({"blessings_enabled": True, "bride_side_upi": None})
        assert client.get(OPTIONS).json()["enabled"] is False

    def test_a_draft_or_odd_link_is_not_found(self, client, db):
        for slug in ("draft-wedding", "nothing-here", "Bad_Slug", "ab"):
            assert client.get(f"/weddings/{slug}/blessing-options").status_code == 404, slug


class TestSend:
    def test_a_guest_sends_a_blessing_which_is_stored_as_claimed(self, client, db):
        res = client.post(SEND, json=good())
        assert res.status_code == 201 and res.json() == {"ok": True}
        (row,) = db.tables["blessings"]
        assert row["status"] == "claimed" and row["method"] == "upi" and row["side"] == "bride" and row["wedding_id"] == A
        assert row["amount_paise"] == 100100 and row["giver_name"] == "Rohan Shah" and row["note"] == "Congratulations to you both"
        assert row["wish_id"] == "w1" and row.get("received_by") is None and row.get("received_at") is None

    def test_the_answer_tells_a_guest_nothing_about_money_or_other_blessings(self, client, db):
        client.post(SEND, json=good(name="First"))
        text = client.post(SEND, json=good(name="Second", amount_rupees=5100)).text
        assert "5100" not in text and "paise" not in text and "First" not in text

    def test_a_guest_can_never_record_a_blessing_as_received(self, client, db):
        client.post(SEND, json=good(status="received", received_by="x", received_at="2028-01-01T00:00:00Z"))
        assert db.tables["blessings"][0]["status"] == "claimed" and db.tables["blessings"][0].get("received_by") is None

    @pytest.mark.parametrize("amount", [1, 501, 100000])
    def test_amounts_at_and_inside_the_limits_work(self, client, db, amount):
        assert client.post(SEND, json=good(amount_rupees=amount)).status_code == 201

    @pytest.mark.parametrize("amount", [0, -5, 100001, 10**9, "ten", 1.5, None])
    def test_amounts_outside_the_limits_or_not_whole_rupees_are_refused(self, client, db, amount):
        assert client.post(SEND, json=good(amount_rupees=amount)).status_code == 422
        assert db.tables["blessings"] == []

    @pytest.mark.parametrize("changes", [{"name": ""}, {"name": "   "}, {"name": "x" * 81}, {"note": "n" * 301}, {"side": "both"}, {"side": "../x"}])
    def test_bad_input_is_refused_and_nothing_is_saved(self, client, db, changes):
        assert client.post(SEND, json=good(**changes)).status_code == 422
        assert db.tables["blessings"] == []

    def test_a_note_is_optional_and_blank_becomes_missing(self, client, db):
        client.post(SEND, json=good(note="   "))
        client.post(SEND, json={"side": "bride", "amount_rupees": 501, "name": "No note"})
        assert [b["note"] for b in db.tables["blessings"]] == [None, None]

    def test_a_side_that_is_not_set_up_is_refused(self, client, db):
        res = client.post(SEND, json=good(side="groom"))
        assert res.status_code == 422 and db.tables["blessings"] == []

    def test_switched_off_means_refused(self, client, db):
        wedding(db)["blessings_enabled"] = False
        assert client.post(SEND, json=good()).status_code == 422

    def test_a_draft_or_odd_link_is_not_found(self, client, db):
        for slug in ("draft-wedding", "nothing-here", "Bad_Slug"):
            assert client.post(f"/weddings/{slug}/blessings", json=good()).status_code == 404, slug
        assert db.tables["blessings"] == []


class TestLimits:
    def test_one_visitor_is_slowed_down_but_another_is_not(self, client, db):
        shared = RateLimiter(limit=2, window_seconds=600)
        app.dependency_overrides[blessings_router.get_limiter] = lambda: shared
        a = {"x-forwarded-for": "1.2.3.4"}
        assert client.post(SEND, json=good(), headers=a).status_code == 201
        assert client.post(SEND, json=good(), headers=a).status_code == 201
        slow = client.post(SEND, json=good(), headers=a)
        assert slow.status_code == 429 and "wait" in slow.json()["detail"].lower()
        assert client.post(SEND, json=good(), headers={"x-forwarded-for": "5.6.7.8"}).status_code == 201
        assert len(db.tables["blessings"]) == 3

    def test_a_wedding_cannot_collect_endless_blessings(self, client, db):
        from app.models.blessing import MAX_BLESSINGS_PER_WEDDING

        db.tables["blessings"] = [{"id": f"b{i}", "wedding_id": A} for i in range(MAX_BLESSINGS_PER_WEDDING)]
        assert client.post(SEND, json=good()).status_code == 429
