import io

import pytest
from PIL import Image

from app.db import get_supabase
from app.main import app
from app.services import photos
from tests.fakedb import FakeDb

WEDDING_A = "11111111-1111-1111-1111-111111111111"
WEDDING_B = "22222222-2222-2222-2222-222222222222"
SUPABASE = "http://localhost:54321"  # what the `client` fixture configures


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def moments_url(wedding: str = WEDDING_A) -> str:
    return f"/weddings/{wedding}/moments"


def own_photo(wedding: str, name: str = "p.jpg") -> str:
    return f"{SUPABASE}/storage/v1/object/public/wedding-photos/{wedding}/{name}"


def jpeg(size=(3000, 2000), with_gps=True, mode="RGB", fmt="JPEG") -> bytes:
    picture = Image.new(mode, size, "red" if mode == "RGB" else None)
    out = io.BytesIO()
    if fmt == "JPEG" and with_gps:
        exif = Image.Exif()
        exif[0x8825] = {1: "N", 2: (23.0, 3.0, 0.0), 3: "E", 4: (72.0, 30.0, 0.0)}  # GPS block
        exif[0x010F] = "PhoneMaker"
        picture.save(out, format="JPEG", exif=exif)
    else:
        picture.save(out, format=fmt)
    return out.getvalue()


@pytest.fixture
def db():
    fake = FakeDb(
        family_members=[
            {"wedding_id": WEDDING_A, "user_id": "owner-a", "role": "owner", "side": "bride"},
            {"wedding_id": WEDDING_B, "user_id": "owner-b", "role": "owner", "side": "bride"},
        ],
        moments=[],
    )
    app.dependency_overrides[get_supabase] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_supabase, None)


@pytest.fixture
def owner_a(make_token):
    return auth(make_token(sub="owner-a"))


@pytest.fixture
def owner_b(make_token):
    return auth(make_token(sub="owner-b"))


def add(client, headers, body=None, wedding=WEDDING_A):
    res = client.post(moments_url(wedding), json=body or {"title": "How we met"}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


class TestMoments:
    def test_login_is_required(self, client, db):
        assert client.get(moments_url()).status_code == 401
        assert client.post(f"/weddings/{WEDDING_A}/photos", content=b"x").status_code == 401

    def test_a_member_of_another_wedding_is_refused_everything(self, client, db, owner_a, owner_b):
        moment = add(client, owner_a)
        before = [dict(r) for r in db.tables["moments"]]
        assert client.get(moments_url(), headers=owner_b).status_code == 404
        assert client.post(moments_url(), json={"title": "x"}, headers=owner_b).status_code == 404
        assert client.put(f"{moments_url()}/{moment['id']}", json={"title": "x"}, headers=owner_b).status_code == 404
        assert client.delete(f"{moments_url()}/{moment['id']}", headers=owner_b).status_code == 404
        assert client.post(f"{moments_url()}/reorder", json={"ids": [moment["id"]]}, headers=owner_b).status_code == 404
        assert client.post(f"/weddings/{WEDDING_A}/photos", content=jpeg((50, 50)), headers=owner_b).status_code == 404
        assert db.tables["moments"] == before
        assert db.files == {}

    def test_add_stores_the_month_as_the_first_of_the_month_and_lists_in_order(self, client, db, owner_a):
        first = add(client, owner_a, {"title": "How we met", "month": "2024-03", "caption": "  Coffee  "})
        second = add(client, owner_a, {"title": "The proposal"})
        assert first["month"] == "2024-03" and first["caption"] == "Coffee" and second["month"] is None
        assert db.tables["moments"][0]["happened_on"] == "2024-03-01"
        assert [m["title"] for m in client.get(moments_url(), headers=owner_a).json()] == ["How we met", "The proposal"]
        assert second["sort_order"] == first["sort_order"] + 1

    @pytest.mark.parametrize(
        "body",
        [{"title": ""}, {"title": "   "}, {"title": "x" * 81}, {"title": "x", "month": "2024-13"}, {"title": "x", "month": "1949-01"}, {"title": "x", "caption": "c" * 301}],
    )
    def test_bad_input_is_refused(self, client, db, owner_a, body):
        assert client.post(moments_url(), json=body, headers=owner_a).status_code == 422
        assert db.tables["moments"] == []

    def test_at_most_twelve(self, client, db, owner_a):
        for i in range(12):
            add(client, owner_a, {"title": f"m{i}"})
        assert client.post(moments_url(), json={"title": "one more"}, headers=owner_a).status_code == 422

    def test_a_photo_must_be_from_this_weddings_own_folder(self, client, db, owner_a):
        for url in [own_photo(WEDDING_B), "https://evil.example/x.jpg", f"{SUPABASE}/storage/v1/object/public/other-bucket/{WEDDING_A}/x.jpg"]:
            res = client.post(moments_url(), json={"title": "x", "photo_url": url}, headers=owner_a)
            assert res.status_code == 422, url
        assert client.post(moments_url(), json={"title": "x", "photo_url": own_photo(WEDDING_A)}, headers=owner_a).status_code == 201

    def test_update_delete_and_unknown_ids(self, client, db, owner_a):
        moment = add(client, owner_a)
        changed = client.put(f"{moments_url()}/{moment['id']}", json={"title": "First date", "month": "2023-12"}, headers=owner_a)
        assert changed.status_code == 200 and changed.json()["title"] == "First date"
        assert client.delete(f"{moments_url()}/{moment['id']}", headers=owner_a).status_code == 204
        assert client.delete(f"{moments_url()}/{moment['id']}", headers=owner_a).status_code == 404
        assert client.put(f"{moments_url()}/{'3' * 8}-3333-3333-3333-{'3' * 12}", json={"title": "x"}, headers=owner_a).status_code == 404

    def test_reorder_needs_every_moment_once(self, client, db, owner_a):
        a, b, c = (add(client, owner_a, {"title": t}) for t in "abc")
        ok = client.post(f"{moments_url()}/reorder", json={"ids": [c["id"], a["id"], b["id"]]}, headers=owner_a)
        assert [m["title"] for m in ok.json()] == ["c", "a", "b"]
        for ids in ([a["id"]], [a["id"], a["id"], b["id"]], [a["id"], b["id"], "nope"]):
            assert client.post(f"{moments_url()}/reorder", json={"ids": ids}, headers=owner_a).status_code == 422


class TestPhotos:
    def upload(self, client, headers, data, wedding=WEDDING_A):
        return client.post(f"/weddings/{wedding}/photos", content=data, headers={**headers, "content-type": "application/octet-stream"})

    def test_a_big_phone_photo_is_shrunk_cleaned_and_kept_in_the_weddings_folder(self, client, db, owner_a):
        original = jpeg((4000, 3000))
        res = self.upload(client, owner_a, original)
        assert res.status_code == 201, res.text
        url = res.json()["url"]
        assert url.startswith(own_photo(WEDDING_A, "")) and url.endswith(".jpg")
        (path, stored), = db.files.items()
        assert path.startswith(f"{WEDDING_A}/")
        assert len(stored) < len(original)
        with Image.open(io.BytesIO(stored)) as saved:
            assert saved.format == "JPEG"
            assert max(saved.size) == 1600 and saved.size == (1600, 1200)
            assert 0x8825 not in saved.getexif()  # no GPS
            assert 0x010F not in saved.getexif()  # no camera details

    def test_a_png_with_see_through_parts_becomes_a_jpeg(self, client, db, owner_a):
        res = self.upload(client, owner_a, jpeg((200, 100), mode="RGBA", fmt="PNG"))
        assert res.status_code == 201
        with Image.open(io.BytesIO(next(iter(db.files.values())))) as saved:
            assert saved.format == "JPEG" and saved.size == (200, 100)

    def test_a_small_photo_is_not_enlarged(self, client, db, owner_a):
        self.upload(client, owner_a, jpeg((300, 200)))
        with Image.open(io.BytesIO(next(iter(db.files.values())))) as saved:
            assert saved.size == (300, 200)

    @pytest.mark.parametrize("data", [b"", b"not a picture", b"<html><script>alert(1)</script></html>", b"GIF89a-broken"])
    def test_things_that_are_not_photos_are_refused_and_nothing_is_stored(self, client, db, owner_a, data):
        assert self.upload(client, owner_a, data).status_code == 422
        assert db.files == {}

    def test_too_large_an_upload_is_refused(self, client, db, owner_a):
        assert self.upload(client, owner_a, b"0" * (photos.MAX_UPLOAD_BYTES + 1)).status_code == 413
        assert db.files == {}

    def test_a_wedding_can_keep_only_so_many_photos(self, client, db, owner_a):
        for i in range(photos.MAX_PHOTOS_PER_WEDDING):
            db.files[f"{WEDDING_A}/{i}.jpg"] = b"x"
        assert self.upload(client, owner_a, jpeg((50, 50))).status_code == 422

    def test_deleting_a_moment_removes_its_photo_but_not_another_weddings(self, client, db, owner_a):
        db.files[f"{WEDDING_A}/mine.jpg"] = b"x"
        db.files[f"{WEDDING_B}/theirs.jpg"] = b"x"
        moment = add(client, owner_a, {"title": "x", "photo_url": own_photo(WEDDING_A, "mine.jpg")})
        assert client.delete(f"{moments_url()}/{moment['id']}", headers=owner_a).status_code == 204
        assert set(db.files) == {f"{WEDDING_B}/theirs.jpg"}

    def test_replacing_a_photo_removes_the_old_one(self, client, db, owner_a):
        db.files[f"{WEDDING_A}/old.jpg"] = b"x"
        db.files[f"{WEDDING_A}/new.jpg"] = b"x"
        moment = add(client, owner_a, {"title": "x", "photo_url": own_photo(WEDDING_A, "old.jpg")})
        client.put(f"{moments_url()}/{moment['id']}", json={"title": "x", "photo_url": own_photo(WEDDING_A, "new.jpg")}, headers=owner_a)
        assert set(db.files) == {f"{WEDDING_A}/new.jpg"}
