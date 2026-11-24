from urllib.parse import parse_qs, urlparse

import pytest

from app.db import get_supabase
from app.main import app
from tests.fakedb import FakeDb

A, B = "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"


def url(side="bride", wedding=A, tail=""):
    return f"/weddings/{wedding}/sides/{side}{tail}"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def db():
    fake = FakeDb(
        family_members=[
            {"wedding_id": A, "user_id": "owner-a", "role": "owner", "side": "bride"},
            {"wedding_id": A, "user_id": "helper-a", "role": "helper", "side": "groom"},
            {"wedding_id": B, "user_id": "owner-b", "role": "owner", "side": "bride"},
        ],
        weddings=[
            {"id": A, "bride_side_upi": None, "bride_side_payee_name": None, "groom_side_upi": "dev@okbank", "groom_side_payee_name": "Dev Shah"},
            {"id": B, "bride_side_upi": "other@upi", "bride_side_payee_name": "Other", "groom_side_upi": None, "groom_side_payee_name": None},
        ],
        wishes=[],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_supabase, None)


@pytest.fixture
def owner(make_token):
    return auth(make_token(sub="owner-a"))


def wedding(db, which=A):
    return next(w for w in db.tables["weddings"] if w["id"] == which)


GOOD = {"upi_id": "meera@okhdfc", "payee_name": "Meera Shah", "wish": "Join us in blessing our new home"}


class TestWho:
    def test_login_is_required(self, client, db):
        assert client.put(url(), json=GOOD).status_code == 401
        assert client.get(url(tail="/test-link")).status_code == 401

    def test_a_stranger_changes_and_reads_nothing(self, client, db, make_token):
        stranger = auth(make_token(sub="owner-b"))
        before = [dict(w) for w in db.tables["weddings"]]
        assert client.put(url(), json=GOOD, headers=stranger).status_code == 404
        assert client.get(url("groom", tail="/test-link"), headers=stranger).status_code == 404
        assert db.tables["weddings"] == before and db.tables["wishes"] == []

    def test_either_family_member_may_save_either_side(self, client, db, make_token):
        helper = auth(make_token(sub="helper-a"))
        assert client.put(url("bride"), json=GOOD, headers=helper).status_code == 200
        assert client.put(url("groom"), json={**GOOD, "upi_id": "dev@upi"}, headers=helper).status_code == 200


class TestSave:
    def test_saves_the_id_name_and_wish_for_that_side_only(self, client, db, owner):
        res = client.put(url("bride"), json=GOOD, headers=owner)
        assert res.status_code == 200 and res.json() == {"side": "bride", **GOOD}
        row = wedding(db)
        assert (row["bride_side_upi"], row["bride_side_payee_name"]) == ("meera@okhdfc", "Meera Shah")
        assert (row["groom_side_upi"], row["groom_side_payee_name"]) == ("dev@okbank", "Dev Shah")  # the other side untouched
        assert [(w["side"], w["title"]) for w in db.tables["wishes"]] == [("bride", GOOD["wish"])]

    def test_the_two_sides_keep_separate_wishes_and_a_second_save_replaces_not_adds(self, client, db, owner):
        client.put(url("bride"), json=GOOD, headers=owner)
        client.put(url("groom"), json={"upi_id": "dev@upi", "payee_name": "Dev", "wish": "Bless the groom's side"}, headers=owner)
        client.put(url("bride"), json={**GOOD, "wish": "A new wish"}, headers=owner)
        assert sorted((w["side"], w["title"]) for w in db.tables["wishes"]) == [("bride", "A new wish"), ("groom", "Bless the groom's side")]

    def test_clearing_everything_clears_it(self, client, db, owner):
        client.put(url("bride"), json=GOOD, headers=owner)
        res = client.put(url("bride"), json={}, headers=owner)
        assert res.status_code == 200
        assert wedding(db)["bride_side_upi"] is None and wedding(db)["bride_side_payee_name"] is None and db.tables["wishes"] == []

    def test_a_wish_alone_is_fine(self, client, db, owner):
        assert client.put(url("groom"), json={"wish": "Only a wish", "upi_id": "dev@okbank", "payee_name": "Dev Shah"}, headers=owner).status_code == 200
        assert client.put(url("groom"), json={"wish": "Only a wish"}, headers=owner).status_code == 200
        assert wedding(db)["groom_side_upi"] is None

    def test_spaces_are_tidied(self, client, db, owner):
        res = client.put(url(), json={"upi_id": "  meera@okhdfc ", "payee_name": "  Meera   Shah ", "wish": "  Hello   there "}, headers=owner)
        assert res.json()["payee_name"] == "Meera Shah" and res.json()["wish"] == "Hello there" and res.json()["upi_id"] == "meera@okhdfc"

    @pytest.mark.parametrize(
        "body",
        [
            {"upi_id": "not-an-id", "payee_name": "X"}, {"upi_id": "a@b", "payee_name": "X"}, {"upi_id": "meera@ok hdfc", "payee_name": "X"},
            {"upi_id": "meera@okhdfc"}, {"payee_name": "Meera Shah"},
            {"upi_id": "meera@okhdfc", "payee_name": "n" * 61}, {"wish": "w" * 121},
            {"upi_id": "meera@okhdfc?pa=evil@upi", "payee_name": "X"}, {"upi_id": "x" * 300 + "@upi", "payee_name": "X"},
        ],
    )
    def test_bad_input_is_refused_and_nothing_changes(self, client, db, owner, body):
        before = [dict(w) for w in db.tables["weddings"]]
        assert client.put(url(), json=body, headers=owner).status_code == 422
        assert db.tables["weddings"] == before and db.tables["wishes"] == []

    def test_only_two_sides_exist(self, client, db, owner):
        assert client.put(url("both"), json=GOOD, headers=owner).status_code == 422


class TestTestLink:
    def test_builds_a_one_rupee_link_for_the_saved_id(self, client, db, owner):
        res = client.get(url("groom", tail="/test-link"), headers=owner)
        assert res.status_code == 200
        link = urlparse(res.json()["link"])
        q = parse_qs(link.query)
        assert link.scheme == "upi" and q["pa"] == ["dev@okbank"] and q["pn"] == ["Dev Shah"] and q["am"] == ["1.00"] and q["cu"] == ["INR"]

    def test_the_note_in_the_paying_app_comes_from_the_caller_and_has_a_plain_default(self, client, db, owner):
        custom = parse_qs(urlparse(client.get(url("groom", tail="/test-link?note=Test%20from%20Acme"), headers=owner).json()["link"]).query)
        plain = parse_qs(urlparse(client.get(url("groom", tail="/test-link"), headers=owner).json()["link"]).query)
        assert custom["tn"] == ["Test from Acme"] and plain["tn"] == ["Test payment"]
        assert client.get(url("groom", tail="/test-link?note="), headers=owner).status_code == 422
        assert client.get(url("groom", tail="/test-link?note=" + "n" * 51), headers=owner).status_code == 422

    def test_asks_to_save_first_when_the_side_is_not_set_up(self, client, db, owner):
        res = client.get(url("bride", tail="/test-link"), headers=owner)
        assert res.status_code == 422 and "save" in res.json()["detail"].lower()

    def test_never_uses_another_weddings_id(self, client, db, make_token):
        # Wedding B has a bride-side ID; a member of A must not be able to reach it through A's id.
        res = client.get(url("bride", wedding=B, tail="/test-link"), headers=auth(make_token(sub="owner-a")))
        assert res.status_code == 404
