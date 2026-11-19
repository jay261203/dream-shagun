from fastapi.testclient import TestClient

from app.main import app


def test_unhandled_error_hides_details():
    @app.get("/_boom")
    def boom():
        raise RuntimeError("secret internal detail")

    response = TestClient(app, raise_server_exceptions=False).get("/_boom")
    assert response.status_code == 500
    assert response.json() == {"detail": "Something went wrong"}
    assert "secret" not in response.text
