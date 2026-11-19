def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_protected_route_rejects_missing_token(client):
    response = client.get("/me")
    assert response.status_code == 401


def test_protected_route_rejects_garbage_token(client):
    assert client.get("/me", headers=auth("not-a-jwt")).status_code == 401


def test_protected_route_rejects_wrong_secret(client, make_token):
    token = make_token(secret="a-different-secret-that-is-long-enough!!")
    assert client.get("/me", headers=auth(token)).status_code == 401


def test_protected_route_rejects_expired_token(client, make_token):
    assert client.get("/me", headers=auth(make_token(exp_in=-10))).status_code == 401


def test_protected_route_rejects_wrong_audience(client, make_token):
    assert client.get("/me", headers=auth(make_token(aud="anon"))).status_code == 401


def test_protected_route_accepts_valid_token(client, make_token):
    token = make_token(sub="family-1", email="mehta@example.com")
    response = client.get("/me", headers=auth(token))
    assert response.status_code == 200
    assert response.json() == {"id": "family-1", "email": "mehta@example.com", "phone": None}
