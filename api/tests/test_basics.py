import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.upi import build_upi_link, is_valid_upi_id

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_upi_link_encodes_and_formats_amount():
    link = build_upi_link("mehta.family@okhdfc", "Mehta Family", 210100, "Shagun from Patel family")
    assert link == (
        "upi://pay?pa=mehta.family@okhdfc&pn=Mehta%20Family&am=2101.00"
        "&cu=INR&tn=Shagun%20from%20Patel%20family"
    )


def test_upi_link_rejects_bad_input():
    assert not is_valid_upi_id("not-an-id")
    with pytest.raises(ValueError):
        build_upi_link("not-an-id", "X", 10000, "note")
    with pytest.raises(ValueError):
        build_upi_link("ab@okaxis", "X", 50, "note")


def test_note_cannot_inject_extra_parameters():
    link = build_upi_link("ab@okaxis", "X", 10000, "hi&am=1.00")
    assert link.count("am=") == 1
