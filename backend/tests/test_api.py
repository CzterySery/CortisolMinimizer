"""Unit tests: no database. Persistence is covered by test_repositories.py (integration)."""
import json

import pytest
from fastapi.testclient import TestClient

from app import params, repositories

AUTH = {"Authorization": "Bearer test-token"}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "test-token")
    monkeypatch.setattr(repositories, "init", lambda: None)  # startup must not need Postgres
    from app.main import app
    with TestClient(app) as c:
        yield c


def test_health(client):
    assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_links(client):
    assert any("zus.pl" in link["url"] for link in client.get("/api/v1/info/links").json())


def test_admin_requires_token(client):
    assert client.get("/api/v1/admin/params").status_code == 401
    assert client.get("/api/v1/admin/params", headers={"Authorization": "Bearer wrong"}).status_code == 401


def test_admin_rejects_invalid_params(client):
    params = json.loads((repositories.DATA / "params.json").read_text(encoding="utf-8"))
    del params["rates"]
    assert client.put("/api/v1/admin/params", json=params, headers=AUTH).status_code == 422


def test_stubs_are_501_not_500(client):
    assert client.get("/api/v1/game/scenarios").status_code == 501


def test_home_game_replays_and_rejects_exhausted_pool(client, monkeypatch):
    seed = params.Params.model_validate_json((repositories.DATA / "params.json").read_text(encoding="utf-8"))
    monkeypatch.setattr(params, "active", lambda on=None: seed)
    selected = ["1A", "2C", "3A", "4A"]
    response = client.post("/api/v1/game/simulate", json={"selected": selected})
    assert response.status_code == 200
    assert response.json()["result"]["pools"]["parental_days_left"] == 0
    invalid = client.post("/api/v1/game/simulate", json={"selected": selected + ["5A"]})
    assert invalid.status_code == 422
    assert "Przekroczony" in invalid.json()["detail"]


def test_catalog(client):
    cards = client.get("/api/v1/cards").json()
    assert len(cards) == 15 and {c["round_id"] for c in cards} == {1, 2, 3, 4, 5}
    assert client.get("/api/v1/rounds/2").json()["title"] == "Poród"
    assert client.get("/api/v1/rounds/9").status_code == 404


def test_board_preview(client):
    preview = client.get("/api/v1/game/preview").json()
    assert [s["id"] for s in preview["statistics"]] == ["money", "time", "happiness"]
    assert len(preview["rounds"]) == 5


def test_calc_base(client, monkeypatch):
    seed = params.Params.model_validate_json((repositories.DATA / "params.json").read_text(encoding="utf-8"))
    monkeypatch.setattr(params, "active", lambda on=None: seed)
    body = {"employment": "employee", "event_date": "2026-07-15", "months": [{"month": "2026-06", "gross": "6000"}]}
    result = client.post("/api/v1/calc/base", json=body).json()
    assert result["base"] == "5177.40" and result["steps"][-1]["rule"] == "art. 36"
    assert client.post("/api/v1/calc/base", json={**body, "months": []}).status_code == 422


def test_calc_plan(client, monkeypatch):
    seed = params.Params.model_validate_json((repositories.DATA / "params.json").read_text(encoding="utf-8"))
    monkeypatch.setattr(params, "active", lambda on=None: seed)
    family = {"mother": {"employment": "employee", "base_monthly": "6000"}, "due_date": "2027-03-01"}
    body = {"family": family, "blocks": [{"who": "mother", "kind": "maternity", "start": "2027-03-01", "days": 140}]}
    result = client.post("/api/v1/calc/plan", json=body).json()
    assert result["months"][0] == {"month": "2027-03", "salary": {"mother": "0.00"}, "benefit": {"mother": "6200.00"},
                                   "total": "6200.00", "below_target": False}
    father_block = {"who": "father", "kind": "paternity", "start": "2027-03-01", "days": 7}
    assert client.post("/api/v1/calc/plan", json={**body, "blocks": [father_block]}).status_code == 422
    assert result["issues"] == []
    mother_paternity = {"who": "mother", "kind": "paternity", "start": "2027-03-01", "days": 7}
    flagged = client.post("/api/v1/calc/plan", json={**body, "blocks": [mother_paternity]}).json()
    assert [i["code"] for i in flagged["issues"]] == ["paternity.father-only"]
