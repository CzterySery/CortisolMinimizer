"""Unit tests for the simulated mObywatel / eZUS / USC services. No database: submissions are stubbed."""
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app import params, repositories
from app.api.gov_mock import _personas, answer
from app.calc.paperwork import documents
from app.calc.plan import compute_plan
from app.calc.rules import check
from app.params import Params
from app.repositories import DATA

P = Params.model_validate_json((DATA / "params.json").read_text(encoding="utf-8"))


@pytest.fixture
def client(monkeypatch):
    sent = []

    def add_submission(kind, payload, status):
        sent.append({"id": len(sent) + 1, "kind": kind, "payload": payload, "status": status,
                     "created_at": datetime(2026, 11, 21, 12, 0)})
        return len(sent)

    monkeypatch.setattr(repositories, "init", lambda: None)
    monkeypatch.setattr(repositories, "add_submission", add_submission)
    monkeypatch.setattr(repositories, "list_submissions",
                        lambda persona: [s for s in reversed(sent) if s["payload"].get("persona") == persona])
    monkeypatch.setattr(params, "active", lambda on=None: P)
    from app.main import app
    with TestClient(app) as c:
        c.sent = sent
        yield c


def login(client, persona_id):
    token = client.post("/api/v1/auth/mobywatel", json={"persona_id": persona_id}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_login_and_account(client):
    assert [p["id"] for p in client.get("/api/v1/auth/personas").json()] == ["anna", "magda", "ola"]
    assert client.post("/api/v1/auth/mobywatel", json={"persona_id": "nobody"}).status_code == 404
    me = client.get("/api/v1/zus/me", headers=login(client, "anna")).json()
    assert me["persona"]["name"] == "Anna Kowalczyk" and len(me["ezla"]) == 2 and me["ezla"][0]["code_b"]
    assert me["debt"] == {"as_of": "2026-10-06", "debt": "0.00", "blocks_benefits": False}
    assert {a["form"] for a in me["applications"]} >= {"e-ZLA (zwolnienie lekarskie)"}


def test_account_needs_a_valid_token(client):
    assert client.get("/api/v1/zus/me").status_code == 401
    forged = login(client, "anna")["Authorization"].replace("anna", "magda")
    assert client.get("/api/v1/zus/me", headers={"Authorization": forged}).status_code == 401


def test_debt_certificate_blocks_jdg_benefits(client):
    debt = client.get("/api/v1/zus/me", headers=login(client, "magda")).json()["debt"]
    assert debt == {"as_of": "2026-09-14", "debt": "150.00", "blocks_benefits": True}  # > 1% of 4806 (art. 2a)


def test_filed_applications_come_back_on_the_account(client):
    auth = login(client, "ola")
    body = {"form": "ZAM: wniosek o zasiłek macierzyński", "who": "mother", "recipient": "zus",
            "payload": {"imie_nazwisko": "Aleksandra Zielińska"}}
    assert client.post("/api/v1/applications", json=body, headers=auth).json() == {
        "id": 1, "recipient": "zus", "status": "wysłano (symulacja)"}
    usc = {"who": "mother", "child_name": "Zosia", "birth_date": "2027-04-02"}
    assert client.post("/api/v1/usc/birth-certificate", json=usc, headers=auth).json()["recipient"] == "usc"
    filed = client.get("/api/v1/zus/me", headers=auth).json()["applications"]
    assert [(a["form"], a["recipient"], a["filed_on"]) for a in filed] == [
        ("Odpis skrócony aktu urodzenia", "usc", "2026-11-21"), (body["form"], "zus", "2026-11-21")]
    client.post("/api/v1/applications", json=body)  # anonymous: stored, but on nobody's account
    assert client.sent[-1]["payload"]["persona"] is None


def test_pue_answers_from_params_and_logs_the_question(client):
    reply = client.post("/api/v1/pue/messages", json={"question": "Ile trwa urlop ojcowski?"}).json()
    assert "14 dni" in reply["answer"] and reply["links"]
    assert client.sent[-1]["kind"] == "pue"
    assert "konsultant" in answer("Jaka jest pogoda?", P).answer
    assert "81,5%" in answer("Czy warto wybrać 81,5%?", P).answer


def test_every_pue_answer_renders():
    import json
    for topic in json.loads((DATA / "pue.json").read_text(encoding="utf-8")):
        reply = answer(topic["keywords"][0], P)
        assert "{" not in reply.answer and reply.links == topic["links"]


def test_personas_match_the_calculator():
    """Each persona shows a brief case; what it already filed must be among its plan's documents."""
    expected = {"anna": set(),
                "magda": {"debt.blocks-benefits", "base.raised-in-pregnancy", "insured-parent.no-voluntary-sickness"},
                "ola": {"insured-parent.ends-before-birth"}}
    for pid, persona in _personas().items():
        result = compute_plan(persona.plan, P)
        assert {i.code for i in check(persona.plan, result, P)} == expected[pid]
        have = {(d.form, d.who) for d in documents(persona.plan, P)}
        assert all((a.form, a.who) in have for a in persona.applications), pid


def test_charities_are_listed_with_krs(client):
    charities = client.get("/api/v1/info/charities").json()
    assert len(charities) == 6 and all(c["krs"].isdigit() and c["url"].startswith("https://") for c in charities)
