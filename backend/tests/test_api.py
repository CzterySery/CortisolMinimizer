import pytest
from fastapi.testclient import TestClient

AUTH = {"Authorization": "Bearer test-token"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("ADMIN_TOKEN", "test-token")
    from app.main import app
    with TestClient(app) as c:  # runs lifespan => seeds DB
        yield c


def test_health(client):
    assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_links(client):
    assert any("zus.pl" in link["url"] for link in client.get("/api/v1/info/links").json())


def test_admin_requires_token(client):
    assert client.get("/api/v1/admin/params").status_code == 401
    assert client.get("/api/v1/admin/params", headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_admin_params_roundtrip_and_versioning(client):
    params = client.get("/api/v1/admin/params", headers=AUTH).json()
    assert params["rates"]["parental"] == "0.70"

    params["rates"]["parental"] = "0.75"
    saved = client.put("/api/v1/admin/params", json=params, headers=AUTH)
    assert saved.json()["version"] == 2
    assert client.get("/api/v1/admin/params", headers=AUTH).json()["rates"]["parental"] == "0.75"


def test_admin_rejects_invalid_params(client):
    params = client.get("/api/v1/admin/params", headers=AUTH).json()
    del params["rates"]
    assert client.put("/api/v1/admin/params", json=params, headers=AUTH).status_code == 422
    assert len(client.get("/api/v1/admin/params/versions", headers=AUTH).json()) == 1


def test_stubs_are_501_not_500(client):
    assert client.get("/api/v1/game/scenarios").status_code == 501


def test_catalog(client):
    cards = client.get("/api/v1/cards").json()
    assert len(cards) == 15 and {c["round_id"] for c in cards} == {1, 2, 3, 4, 5}
    assert client.get("/api/v1/rounds/2").json()["title"] == "Poród"
    assert client.get("/api/v1/rounds/9").status_code == 404


def test_board_preview(client):
    preview = client.get("/api/v1/game/preview").json()
    assert [s["id"] for s in preview["statistics"]] == ["money", "time", "happiness"]
    assert len(preview["rounds"]) == 5
