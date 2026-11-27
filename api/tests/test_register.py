import pytest

from app.db import get_supabase
from app.main import app
from tests.fakedb import FakeDb

A = "11111111-1111-1111-1111-111111111111"
B = "22222222-2222-2222-2222-222222222222"
NOTE_ID = "44444444-4444-4444-4444-444444444444"


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def db():
    fake = FakeDb(
        family_members=[
            {"id": "m-a", "wedding_id": A, "user_id": "owner-a", "role": "owner", "side": "bride"},
            {"id": "m-a2", "wedding_id": A, "user_id": "helper-a", "role": "helper", "side": "groom"},
            {"id": "m-b", "wedding_id": B, "user_id": "owner-b", "role": "owner", "side": "bride"},
        ],
        blessings=[
            {"id": NOTE_ID, "wedding_id": A, "giver_name": "Rohan", "amount_paise": 110000, "method": "upi", "status": "claimed",
             "side": "bride", "source": "guest", "received_by": None, "received_at": None},
        ],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_supabase, None)


@pytest.fixture
def owner_a(make_token):
    return auth(make_token(sub="owner-a"))


@pytest.fixture
def helper_a(make_token):
    return auth(make_token(sub="helper-a"))


@pytest.fixture
def owner_b(make_token):
    return auth(make_token(sub="owner-b"))


def note(db):
    return next(r for r in db.tables["blessings"] if r["id"] == NOTE_ID)


class TestRecordAGift:
    def test_a_host_records_cash_and_it_counts_as_received_by_them(self, client, db, owner_a):
        res = client.post(f"/weddings/{A}/gifts", json={"side": "groom", "giver_name": "  Sharma   uncle ", "method": "cash", "amount_rupees": 5100}, headers=owner_a)
        assert res.status_code == 201, res.text
        row = next(r for r in db.tables["blessings"] if r["id"] == res.json()["id"])
        assert row["giver_name"] == "Sharma uncle" and row["amount_paise"] == 510000 and row["method"] == "cash" and row["side"] == "groom"
        assert row["source"] == "host" and row["status"] == "received" and row["received_by"] == "m-a" and row["received_at"]
        assert row["description"] is None

    def test_a_physical_gift_needs_a_description_and_has_no_amount(self, client, db, owner_a):
        url = f"/weddings/{A}/gifts"
        ok = client.post(url, json={"side": "bride", "giver_name": "Mehta family", "method": "gift", "description": "Silver diya set", "note": "From Pune"}, headers=owner_a)
        assert ok.status_code == 201, ok.text
        row = db.tables["blessings"][-1]
        assert row["description"] == "Silver diya set" and row["amount_paise"] is None and row["note"] == "From Pune"
        assert client.post(url, json={"side": "bride", "giver_name": "X", "method": "gift"}, headers=owner_a).status_code == 422
        assert client.post(url, json={"side": "bride", "giver_name": "X", "method": "gift", "description": "Watch", "amount_rupees": 9000}, headers=owner_a).status_code == 422

    def test_money_needs_an_amount_in_range(self, client, db, owner_a):
        url = f"/weddings/{A}/gifts"
        for amount in (None, 0, -5, 10_000_001):
            body = {"side": "bride", "giver_name": "X", "method": "upi", "amount_rupees": amount}
            assert client.post(url, json=body, headers=owner_a).status_code == 422, amount
        assert client.post(url, json={"side": "bride", "giver_name": "X", "method": "upi", "amount_rupees": 10_000_000}, headers=owner_a).status_code == 201

    def test_odd_values_are_refused(self, client, db, owner_a):
        url = f"/weddings/{A}/gifts"
        base = {"side": "bride", "giver_name": "X", "method": "cash", "amount_rupees": 100}
        for change in ({"side": "both"}, {"method": "cheque"}, {"giver_name": "   "}, {"giver_name": "x" * 121}, {"note": "n" * 301}):
            assert client.post(url, json={**base, **change}, headers=owner_a).status_code == 422, change

    def test_a_helper_can_record_too(self, client, db, helper_a):
        res = client.post(f"/weddings/{A}/gifts", json={"side": "groom", "giver_name": "Dev's friend", "method": "upi", "amount_rupees": 501}, headers=helper_a)
        assert res.status_code == 201
        assert db.tables["blessings"][-1]["received_by"] == "m-a2"

    def test_the_register_has_a_size_limit(self, client, db, owner_a):
        from app.models.gift import MAX_REGISTER_ROWS

        db.tables["blessings"] = [{"id": f"r{i}", "wedding_id": A} for i in range(MAX_REGISTER_ROWS)]
        res = client.post(f"/weddings/{A}/gifts", json={"side": "bride", "giver_name": "X", "method": "cash", "amount_rupees": 1}, headers=owner_a)
        assert res.status_code == 422


class TestCheckAGift:
    def test_received_records_who_and_when_and_the_other_answers_clear_it(self, client, db, owner_a):
        url = f"/weddings/{A}/gifts/{NOTE_ID}/status"
        assert client.put(url, json={"status": "received"}, headers=owner_a).status_code == 200
        assert note(db)["status"] == "received" and note(db)["received_by"] == "m-a" and note(db)["received_at"]

        assert client.put(url, json={"status": "not_received"}, headers=owner_a).json() == {"status": "not_received"}
        assert note(db)["status"] == "rejected" and note(db)["received_by"] is None and note(db)["received_at"] is None

        client.put(url, json={"status": "unchecked"}, headers=owner_a)
        assert note(db)["status"] == "claimed"

    def test_only_the_three_answers_are_accepted(self, client, db, owner_a):
        for value in ("claimed", "rejected", "paid", ""):
            assert client.put(f"/weddings/{A}/gifts/{NOTE_ID}/status", json={"status": value}, headers=owner_a).status_code == 422, value
        assert note(db)["status"] == "claimed"

    def test_a_missing_gift_is_not_found(self, client, db, owner_a):
        res = client.put(f"/weddings/{A}/gifts/99999999-9999-9999-9999-999999999999/status", json={"status": "received"}, headers=owner_a)
        assert res.status_code == 404


class TestRemoveAGift:
    def test_a_host_removes_a_row(self, client, db, owner_a):
        assert client.delete(f"/weddings/{A}/gifts/{NOTE_ID}", headers=owner_a).status_code == 204
        assert db.tables["blessings"] == []
        assert client.delete(f"/weddings/{A}/gifts/{NOTE_ID}", headers=owner_a).status_code == 404


class TestStrangers:
    """Someone who is not a host of this invitation can neither change it nor learn that it exists."""

    def test_a_host_of_another_invitation_gets_not_found_everywhere(self, client, db, owner_b):
        assert client.post(f"/weddings/{A}/gifts", json={"side": "bride", "giver_name": "X", "method": "cash", "amount_rupees": 1}, headers=owner_b).status_code == 404
        assert client.put(f"/weddings/{A}/gifts/{NOTE_ID}/status", json={"status": "received"}, headers=owner_b).status_code == 404
        assert client.delete(f"/weddings/{A}/gifts/{NOTE_ID}", headers=owner_b).status_code == 404
        assert note(db)["status"] == "claimed" and len(db.tables["blessings"]) == 1

    def test_a_host_cannot_reach_another_invitations_gift_through_their_own(self, client, db, owner_b):
        assert client.put(f"/weddings/{B}/gifts/{NOTE_ID}/status", json={"status": "received"}, headers=owner_b).status_code == 404
        assert client.delete(f"/weddings/{B}/gifts/{NOTE_ID}", headers=owner_b).status_code == 404
        assert note(db)["status"] == "claimed"

    def test_nobody_signed_in_gets_nothing(self, client, db):
        assert client.post(f"/weddings/{A}/gifts", json={"side": "bride", "giver_name": "X", "method": "cash", "amount_rupees": 1}).status_code == 401
        assert client.put(f"/weddings/{A}/gifts/{NOTE_ID}/status", json={"status": "received"}).status_code == 401
        assert client.delete(f"/weddings/{A}/gifts/{NOTE_ID}").status_code == 401
