import pytest

from app.db import get_supabase
from app.main import app
from tests.fakedb import FakeDb

WEDDING_A = "11111111-1111-1111-1111-111111111111"
WEDDING_B = "22222222-2222-2222-2222-222222222222"


def url(wedding: str = WEDDING_A) -> str:
    return f"/weddings/{wedding}/details"


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
            {"id": WEDDING_A, "bride_name": "Meera", "groom_name": "Dev", "wedding_date": "2028-02-12", "story": "Old story",
             "color_preset": None, "font_pair": None, "music_enabled": True, "gift_mode": "link", "sections_enabled": ["cover", "couple", "events"],
             "upi_id": "secret@upi"},
            {"id": WEDDING_B, "bride_name": "Other", "groom_name": "Couple", "wedding_date": None, "story": None,
             "color_preset": None, "font_pair": None, "music_enabled": True, "sections_enabled": ["cover"]},
        ],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_supabase, None)


@pytest.fixture
def owner(make_token):
    return auth(make_token(sub="owner-a"))


def row(db, wedding=WEDDING_A):
    return next(r for r in db.tables["weddings"] if r["id"] == wedding)


class TestWho:
    def test_login_is_required(self, client, db):
        assert client.patch(url(), json={"story": "x"}).status_code == 401

    def test_a_stranger_cannot_change_anything(self, client, db, make_token):
        before = [dict(r) for r in db.tables["weddings"]]
        res = client.patch(url(), json={"bride_name": "Hacked"}, headers=auth(make_token(sub="owner-b")))
        assert res.status_code == 404
        assert db.tables["weddings"] == before

    def test_a_helper_in_the_family_may(self, client, db, make_token):
        res = client.patch(url(), json={"story": "Our story"}, headers=auth(make_token(sub="helper-a")))
        assert res.status_code == 200 and row(db)["story"] == "Our story"


class TestChanges:
    def test_only_the_fields_sent_change(self, client, db, owner):
        res = client.patch(url(), json={"color_preset": "rose"}, headers=owner)
        assert res.status_code == 200
        assert row(db)["color_preset"] == "rose"
        assert row(db)["bride_name"] == "Meera" and row(db)["story"] == "Old story"

    def test_the_answer_never_includes_money_details(self, client, db, owner):
        body = client.patch(url(), json={"story": "x"}, headers=owner).json()
        assert "upi_id" not in body
        assert set(body) == {"id", "bride_name", "groom_name", "wedding_date", "story", "color_preset", "font_pair", "music_enabled", "gift_mode", "sections_enabled"}

    def test_names_dates_and_story(self, client, db, owner):
        res = client.patch(url(), json={"bride_name": "  Meera Shah ", "groom_name": "Dev", "wedding_date": "2028-03-04", "story": "  Hello  "}, headers=owner)
        assert res.status_code == 200
        assert (row(db)["bride_name"], row(db)["wedding_date"], row(db)["story"]) == ("Meera Shah", "2028-03-04", "Hello")

    def test_a_blank_story_or_null_date_clears_them(self, client, db, owner):
        client.patch(url(), json={"story": "   ", "wedding_date": None}, headers=owner)
        assert row(db)["story"] is None and row(db)["wedding_date"] is None

    @pytest.mark.parametrize("mode", ["off", "link", "private"])
    def test_the_gift_setting_can_be_changed(self, client, db, owner, mode):
        assert client.patch(url(), json={"gift_mode": mode}, headers=owner).json()["gift_mode"] == mode
        assert row(db)["gift_mode"] == mode

    def test_music_off_and_on(self, client, db, owner):
        client.patch(url(), json={"music_enabled": False}, headers=owner)
        assert row(db)["music_enabled"] is False
        client.patch(url(), json={"music_enabled": True}, headers=owner)
        assert row(db)["music_enabled"] is True

    def test_sections_keep_page_order_always_include_the_cover_and_drop_repeats(self, client, db, owner):
        client.patch(url(), json={"sections_enabled": ["events", "journey", "events"]}, headers=owner)
        assert row(db)["sections_enabled"] == ["cover", "journey", "events"]
        client.patch(url(), json={"sections_enabled": []}, headers=owner)
        assert row(db)["sections_enabled"] == ["cover"]

    def test_nothing_sent_is_refused(self, client, db, owner):
        assert client.patch(url(), json={}, headers=owner).status_code == 422

    @pytest.mark.parametrize(
        "body",
        [
            {"bride_name": ""}, {"bride_name": "   "}, {"groom_name": "x" * 81}, {"wedding_date": "1999-01-01"}, {"wedding_date": "2101-01-01"},
            {"story": "s" * 5001}, {"color_preset": "Not Valid!"}, {"color_preset": "../x"}, {"font_pair": ""},
            {"sections_enabled": ["cover", "admin"]}, {"sections_enabled": "events"}, {"music_enabled": "maybe"}, {"gift_mode": "public"}, {"gift_mode": 3},
        ],
    )
    def test_bad_input_is_refused_and_nothing_changes(self, client, db, owner, body):
        before = dict(row(db))
        assert client.patch(url(), json=body, headers=owner).status_code == 422
        assert row(db) == before

    def test_sending_null_for_a_required_field_does_not_clear_it(self, client, db, owner):
        client.patch(url(), json={"bride_name": None, "story": "kept going"}, headers=owner)
        assert row(db)["bride_name"] == "Meera"
