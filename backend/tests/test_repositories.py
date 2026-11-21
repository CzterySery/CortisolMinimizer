"""Integration tests against a real PostgreSQL. Opt-in:
TEST_DATABASE_URL=postgresql://zp:zp@localhost:5432/zp uv run pytest -m integration
Each test runs in a fresh `zp_test` schema, so pointing at the dev database leaves its tables alone."""
import json
import os
from datetime import date

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg.conninfo import make_conninfo

from app import params, repositories

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL"), reason="set TEST_DATABASE_URL to run"),
]
AUTH = {"Authorization": "Bearer test-token"}
SEED = json.loads((repositories.DATA / "params.json").read_text(encoding="utf-8"))


@pytest.fixture(autouse=True)
def test_schema(monkeypatch):
    url = os.environ["TEST_DATABASE_URL"]
    with psycopg.connect(url, autocommit=True) as conn:
        conn.execute("DROP SCHEMA IF EXISTS zp_test CASCADE")
        conn.execute("CREATE SCHEMA zp_test")
    monkeypatch.setenv("DATABASE_URL", make_conninfo(url, options="-c search_path=zp_test"))
    repositories.init()


def test_init_seeds_once():
    repositories.init()  # second startup must not add a version
    assert [v["version"] for v in repositories.list_config("params")] == [-3, -2, -1, 1]  # history + current
    assert str(params.active().rates.parental) == SEED["rates"]["parental"]
    assert str(params.active(date(2025, 6, 1)).min_wage) == "4666.00"  # a 2025 case uses 2025 figures
    assert str(params.active(date(2024, 3, 1)).min_wage) == "4242.00"


def test_init_refreshes_seed_version():
    with repositories.db() as c:  # simulate a database seeded by an older params.json
        c.execute("""UPDATE config SET data = data || '{"min_wage": "1"}' WHERE kind = 'params' AND version = 1""")
    repositories.init()
    assert str(params.active().min_wage) == SEED["min_wage"]


def test_versions_and_effective_dates():
    newer = {**SEED, "rates": {**SEED["rates"], "parental": "0.75"}}
    future = {**SEED, "effective_from": "2099-01-01", "rates": {**SEED["rates"], "parental": "0.80"}}
    assert repositories.put_config("params", newer) == 2
    assert repositories.put_config("params", future) == 3
    assert repositories.get_config("params", "2027-01-01")["rates"]["parental"] == "0.75"  # future one not in force yet
    assert repositories.get_config("params", "2099-06-01")["rates"]["parental"] == "0.80"
    with pytest.raises(LookupError):
        repositories.get_config("params", "2000-01-01")  # before the oldest seeded year


def test_admin_params_roundtrip(monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "test-token")
    from app.main import app
    with TestClient(app) as client:
        current = client.get("/api/v1/admin/params", headers=AUTH).json()
        current["rates"]["parental"] = "0.75"
        saved = client.put("/api/v1/admin/params", json=current, headers=AUTH).json()
        assert saved["version"] == 2 and saved["effective_from"] == current["effective_from"]
        assert client.get("/api/v1/admin/params", headers=AUTH).json()["rates"]["parental"] == "0.75"
        del current["rates"]
        assert client.put("/api/v1/admin/params", json=current, headers=AUTH).status_code == 422
        assert [v["version"] for v in client.get("/api/v1/admin/params/versions", headers=AUTH).json()][-2:] == [1, 2]


def test_submissions_are_listed_per_persona():
    first = repositories.add_submission("application", {"form": "ZAM", "who": "mother", "recipient": "zus",
                                                        "persona": "anna"}, "wysłano (symulacja)")
    repositories.add_submission("pue", {"question": "?", "persona": None}, "odpowiedź automatyczna")
    second = repositories.add_submission("usc", {"form": "Odpis", "persona": "anna"}, "wysłano (symulacja)")
    rows = repositories.list_submissions("anna")
    assert [r["id"] for r in rows] == [second, first] and rows[1]["payload"]["form"] == "ZAM"
    assert repositories.list_submissions("magda") == []
    assert [r["kind"] for r in repositories.list_submissions()] == ["usc", "pue", "application"]  # admin: all
