import pytest

from app.db import get_supabase
from app.main import app
from tests.fakedb import FakeDb

WEDDING_A = "11111111-1111-1111-1111-111111111111"
WEDDING_B = "22222222-2222-2222-2222-222222222222"

PHEras = {"name": "Pheras", "kind": "pheras", "local_date": "2027-02-14", "local_time": "10:30"}


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def base(wedding_id: str) -> str:
    return f"/weddings/{wedding_id}/events"


@pytest.fixture
def db():
    fake = FakeDb(
        family_members=[
            {"wedding_id": WEDDING_A, "user_id": "owner-a", "role": "owner", "side": "bride"},
            {"wedding_id": WEDDING_A, "user_id": "helper-a", "role": "helper", "side": "groom"},
            {"wedding_id": WEDDING_B, "user_id": "owner-b", "role": "owner", "side": "bride"},
        ],
        events=[],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_supabase, None)


@pytest.fixture
def owner_a(make_token):
    return auth(make_token(sub="owner-a"))


def add(client, headers, body=None, wedding=WEDDING_A):
    res = client.post(base(wedding), json=body or PHEras, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


class TestWhoMayAccess:
    def test_login_is_required(self, client, db):
        assert client.get(base(WEDDING_A)).status_code == 401
        assert client.post(base(WEDDING_A), json=PHEras).status_code == 401

    def test_a_stranger_gets_not_found_for_every_action_and_nothing_changes(self, client, db, owner_a, make_token):
        event = add(client, owner_a)
        stranger = auth(make_token(sub="owner-b"))  # a real member, but of wedding B
        before = [dict(r) for r in db.tables["events"]]

        assert client.get(base(WEDDING_A), headers=stranger).status_code == 404
        assert client.post(base(WEDDING_A), json=PHEras, headers=stranger).status_code == 404
        assert client.put(f"{base(WEDDING_A)}/{event['id']}", json={**PHEras, "name": "Hacked"}, headers=stranger).status_code == 404
        assert client.delete(f"{base(WEDDING_A)}/{event['id']}", headers=stranger).status_code == 404
        assert client.post(f"{base(WEDDING_A)}/reorder", json={"ids": [event["id"]]}, headers=stranger).status_code == 404
        assert db.tables["events"] == before

    def test_a_signed_in_person_with_no_wedding_at_all_gets_not_found(self, client, db, make_token):
        nobody = auth(make_token(sub="someone-new"))
        assert client.get(base(WEDDING_A), headers=nobody).status_code == 404

    def test_another_weddings_event_cannot_be_reached_through_your_own_wedding(self, client, db, owner_a, make_token):
        event_in_a = add(client, owner_a)
        owner_b = auth(make_token(sub="owner-b"))
        # Owner B is a member of B, and passes B's id, but names A's event.
        assert client.put(f"{base(WEDDING_B)}/{event_in_a['id']}", json={**PHEras, "name": "Hacked"}, headers=owner_b).status_code == 404
        assert client.delete(f"{base(WEDDING_B)}/{event_in_a['id']}", headers=owner_b).status_code == 404
        assert db.tables["events"][0]["name"] == "Pheras"

    def test_a_helper_can_edit_too(self, client, db, make_token):
        helper = auth(make_token(sub="helper-a"))
        assert add(client, helper)["name"] == "Pheras"

    def test_a_bad_wedding_id_is_rejected_before_anything_runs(self, client, db, owner_a):
        assert client.get("/weddings/not-a-uuid/events", headers=owner_a).status_code == 422


class TestAddAndList:
    def test_india_time_is_stored_as_utc_and_comes_back_as_india_time(self, client, db, owner_a):
        event = add(client, owner_a, {**PHEras, "name": "Sangeet", "local_date": "2027-02-13", "local_time": "19:00"})
        assert db.tables["events"][0]["starts_at"] == "2027-02-13T13:30:00+00:00"
        assert (event["local_date"], event["local_time"]) == ("2027-02-13", "19:00")

    def test_just_after_midnight_in_india_is_still_the_same_india_day(self, client, db, owner_a):
        event = add(client, owner_a, {**PHEras, "local_date": "2027-02-14", "local_time": "00:30"})
        assert db.tables["events"][0]["starts_at"] == "2027-02-13T19:00:00+00:00"  # the day before, in UTC
        assert (event["local_date"], event["local_time"]) == ("2027-02-14", "00:30")

    def test_new_events_go_to_the_end_and_are_listed_in_that_order(self, client, db, owner_a):
        a = add(client, owner_a, {**PHEras, "name": "Reception"})
        b = add(client, owner_a, {**PHEras, "name": "Mehendi"})
        assert (a["sort_order"], b["sort_order"]) == (1, 2)
        names = [e["name"] for e in client.get(base(WEDDING_A), headers=owner_a).json()]
        assert names == ["Reception", "Mehendi"]  # the family's order, not the clock's

    def test_each_wedding_only_sees_its_own_events(self, client, db, owner_a, make_token):
        add(client, owner_a)
        owner_b = auth(make_token(sub="owner-b"))
        add(client, owner_b, {**PHEras, "name": "Their event"}, wedding=WEDDING_B)
        assert [e["name"] for e in client.get(base(WEDDING_A), headers=owner_a).json()] == ["Pheras"]
        assert [e["name"] for e in client.get(base(WEDDING_B), headers=owner_b).json()] == ["Their event"]

    def test_blank_optional_fields_are_stored_as_nothing(self, client, db, owner_a):
        event = add(client, owner_a, {**PHEras, "venue_name": "  ", "dress_code": "", "note": None, "map_url": " "})
        assert event["venue_name"] is None and event["dress_code"] is None and event["map_url"] is None

    def test_a_full_event_is_kept(self, client, db, owner_a):
        body = {**PHEras, "venue_name": "Vasant Lawns", "venue_address": "Satellite", "map_url": "https://maps.example/v", "dress_code": "Colourful", "note": "Dinner served"}
        event = add(client, owner_a, body)
        assert event["venue_name"] == "Vasant Lawns" and event["map_url"] == "https://maps.example/v" and event["note"] == "Dinner served"

    @pytest.mark.parametrize(
        "change",
        [
            {"name": ""},
            {"name": "   "},
            {"name": "x" * 81},
            {"kind": "party"},
            {"local_date": "2027-02-30"},
            {"local_date": "1999-01-01"},
            {"local_time": "7pm"},
            {"map_url": "javascript:alert(1)"},
            {"map_url": "ftp://files.example/a"},
            {"map_url": "https://"},
            {"note": "x" * 301},
        ],
    )
    def test_bad_input_is_refused_and_nothing_is_saved(self, client, db, owner_a, change):
        res = client.post(base(WEDDING_A), json={**PHEras, **change}, headers=owner_a)
        assert res.status_code == 422
        assert db.tables["events"] == []

    def test_a_wedding_can_have_twenty_events_and_no_more(self, client, db, owner_a):
        for i in range(20):
            add(client, owner_a, {**PHEras, "name": f"Event {i}"})
        assert client.post(base(WEDDING_A), json=PHEras, headers=owner_a).status_code == 422
        assert len(db.tables["events"]) == 20


class TestChangeAndRemove:
    def test_changing_an_event_keeps_its_place_in_the_order(self, client, db, owner_a):
        first, second = add(client, owner_a, {**PHEras, "name": "A"}), add(client, owner_a, {**PHEras, "name": "B"})
        res = client.put(f"{base(WEDDING_A)}/{first['id']}", json={**PHEras, "name": "A changed", "local_time": "18:15"}, headers=owner_a)
        assert res.status_code == 200
        assert (res.json()["name"], res.json()["local_time"], res.json()["sort_order"]) == ("A changed", "18:15", 1)
        assert [e["name"] for e in client.get(base(WEDDING_A), headers=owner_a).json()] == ["A changed", "B"]

    def test_an_unknown_event_is_not_found(self, client, db, owner_a):
        assert client.put(f"{base(WEDDING_A)}/{'0' * 8}-0000-0000-0000-{'0' * 12}", json=PHEras, headers=owner_a).status_code == 404

    def test_deleting_removes_it_once(self, client, db, owner_a):
        event = add(client, owner_a)
        assert client.delete(f"{base(WEDDING_A)}/{event['id']}", headers=owner_a).status_code == 204
        assert db.tables["events"] == []
        assert client.delete(f"{base(WEDDING_A)}/{event['id']}", headers=owner_a).status_code == 404


class TestReorder:
    def make_three(self, client, owner_a):
        return [add(client, owner_a, {**PHEras, "name": n})["id"] for n in ("A", "B", "C")]

    def test_puts_the_events_in_the_order_given(self, client, db, owner_a):
        a, b, c = self.make_three(client, owner_a)
        res = client.post(f"{base(WEDDING_A)}/reorder", json={"ids": [c, a, b]}, headers=owner_a)
        assert res.status_code == 200
        assert [e["name"] for e in res.json()] == ["C", "A", "B"]
        assert [e["name"] for e in client.get(base(WEDDING_A), headers=owner_a).json()] == ["C", "A", "B"]

    def test_the_list_must_name_every_event_once(self, client, db, owner_a):
        a, b, c = self.make_three(client, owner_a)
        for bad in ([a, b], [a, b, c, c], [a, b, "99999999-9999-9999-9999-999999999999"], [a, a, b]):
            assert client.post(f"{base(WEDDING_A)}/reorder", json={"ids": bad}, headers=owner_a).status_code == 422
        assert [e["name"] for e in client.get(base(WEDDING_A), headers=owner_a).json()] == ["A", "B", "C"]

    def test_another_weddings_event_cannot_be_slipped_into_the_order(self, client, db, owner_a, make_token):
        a, b, c = self.make_three(client, owner_a)
        owner_b = auth(make_token(sub="owner-b"))
        foreign = add(client, owner_b, wedding=WEDDING_B)["id"]
        assert client.post(f"{base(WEDDING_A)}/reorder", json={"ids": [a, b, foreign]}, headers=owner_a).status_code == 422
        assert [r["sort_order"] for r in db.tables["events"] if r["wedding_id"] == WEDDING_B] == [1]
