import pytest

from app.db import get_supabase
from app.main import app
from app.routers import gifts as gifts_router
from app.services.ratelimit import RateLimiter
from tests.fakedb import FakeDb

A = "11111111-1111-1111-1111-111111111111"
PAGE = "/weddings/meera-and-dev/gift"
NOTE = "/weddings/meera-and-dev/gift-notes"


def good(**changes):
    body = {"side": "bride", "name": "Rohan Shah"}
    body.update(changes)
    return body


@pytest.fixture
def db():
    fake = FakeDb(
        weddings=[
            {"id": A, "slug": "meera-and-dev", "status": "published", "bride_name": "Meera", "groom_name": "Dev", "gift_mode": "link",
             "bride_side_upi": "meera@okhdfc", "bride_side_payee_name": "Meera Shah", "groom_side_upi": None, "groom_side_payee_name": None},
            {"id": "33333333-3333-3333-3333-333333333333", "slug": "draft-wedding", "status": "draft", "bride_name": "D", "groom_name": "R", "gift_mode": "link",
             "bride_side_upi": "d@upi", "bride_side_payee_name": "D", "groom_side_upi": None, "groom_side_payee_name": None},
        ],
        wishes=[{"id": "w1", "wedding_id": A, "side": "bride", "title": "Bless our new home"}],
        blessings=[],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    app.dependency_overrides[gifts_router.get_limiter] = lambda: RateLimiter(limit=1000, window_seconds=60)
    yield fake
    app.dependency_overrides.pop(get_supabase, None)
    app.dependency_overrides.pop(gifts_router.get_limiter, None)


def wedding(db):
    return db.tables["weddings"][0]


class TestGiftPage:
    def test_a_guest_gets_the_ready_sides_with_a_link_that_has_no_amount(self, client, db):
        body = client.get(PAGE).json()
        assert body["mode"] == "link"
        (side,) = body["sides"]
        assert side["host"] == "Meera" and side["wish"] == "Bless our new home" and side["upi_id"] == "meera@okhdfc"
        assert side["link"] == "upi://pay?pa=meera@okhdfc&pn=Meera%20Shah&cu=INR"
        assert "am=" not in side["link"] and "tn=" not in side["link"]

    def test_a_private_link_still_works_for_whoever_has_it(self, client, db):
        wedding(db)["gift_mode"] = "private"
        assert client.get(PAGE).json()["mode"] == "private"

    def test_off_a_draft_and_an_odd_link_look_like_nothing_is_there(self, client, db):
        wedding(db)["gift_mode"] = "off"
        assert client.get(PAGE).status_code == 404
        for slug in ("draft-wedding", "nothing-here", "Bad_Slug", "ab"):
            assert client.get(f"/weddings/{slug}/gift").status_code == 404, slug

    def test_a_side_that_is_half_set_up_is_left_out(self, client, db):
        wedding(db).update({"groom_side_upi": "dev@oksbi"})
        assert [s["side"] for s in client.get(PAGE).json()["sides"]] == ["bride"]
        wedding(db).update({"bride_side_upi": None})
        assert client.get(PAGE).json()["sides"] == []

    def test_both_sides_show_once_both_are_set_up(self, client, db):
        wedding(db).update({"groom_side_upi": "dev@oksbi", "groom_side_payee_name": "Dev Shah"})
        assert [s["side"] for s in client.get(PAGE).json()["sides"]] == ["bride", "groom"]


class TestGiftNote:
    def test_a_guest_saves_a_note_with_nothing_but_a_name(self, client, db):
        res = client.post(NOTE, json=good())
        assert res.status_code == 201 and res.json() == {"ok": True}
        (row,) = db.tables["blessings"]
        assert row["status"] == "claimed" and row["amount_paise"] is None and row["side"] == "bride" and row["giver_name"] == "Rohan Shah"

    def test_an_amount_and_a_note_are_kept_but_stay_unverified(self, client, db):
        client.post(NOTE, json=good(amount_rupees=1001, note="  With love  ", status="received"))
        (row,) = db.tables["blessings"]
        assert row["amount_paise"] == 100100 and row["note"] == "With love" and row["status"] == "claimed"

    def test_the_answer_says_nothing_about_other_notes(self, client, db):
        client.post(NOTE, json=good(name="First", note="Secret"))
        assert "First" not in client.post(NOTE, json=good(name="Second")).text

    @pytest.mark.parametrize("changes", [{"name": ""}, {"name": "  "}, {"name": "x" * 81}, {"amount_rupees": 0}, {"amount_rupees": -5}, {"amount_rupees": 100001}, {"amount_rupees": 1.5}, {"amount_rupees": "ten"}, {"note": "n" * 301}, {"side": "cousin"}])
    def test_bad_input_is_refused_and_nothing_is_saved(self, client, db, changes):
        assert client.post(NOTE, json=good(**changes)).status_code == 422
        assert db.tables["blessings"] == []

    def test_a_side_that_is_not_set_up_is_refused(self, client, db):
        assert client.post(NOTE, json=good(side="groom")).status_code == 422 and db.tables["blessings"] == []

    def test_off_or_a_draft_is_not_found(self, client, db):
        wedding(db)["gift_mode"] = "off"
        assert client.post(NOTE, json=good()).status_code == 404
        assert client.post("/weddings/draft-wedding/gift-notes", json=good()).status_code == 404
        assert db.tables["blessings"] == []

    def test_the_old_routes_with_preset_amounts_are_gone(self, client, db):
        assert client.post("/weddings/meera-and-dev/blessings", json={"side": "bride", "amount_rupees": 501, "name": "A"}).status_code == 404
        assert client.get("/weddings/meera-and-dev/blessing-options").status_code == 404


class TestLimits:
    def test_one_visitor_is_slowed_down_but_another_is_not(self, client, db):
        shared = RateLimiter(limit=2, window_seconds=600)
        app.dependency_overrides[gifts_router.get_limiter] = lambda: shared
        a = {"x-forwarded-for": "1.2.3.4"}
        assert client.post(NOTE, json=good(), headers=a).status_code == 201
        assert client.post(NOTE, json=good(), headers=a).status_code == 201
        assert client.post(NOTE, json=good(), headers=a).status_code == 429
        assert client.post(NOTE, json=good(), headers={"x-forwarded-for": "5.6.7.8"}).status_code == 201

    def test_an_invitation_cannot_collect_endless_notes(self, client, db):
        from app.models.gift import MAX_GIFT_NOTES_PER_WEDDING

        db.tables["blessings"] = [{"id": f"n{i}", "wedding_id": A} for i in range(MAX_GIFT_NOTES_PER_WEDDING)]
        assert client.post(NOTE, json=good()).status_code == 429
