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


def test_debt_certificate_blocks_jdg_benefits(client, monkeypatch):
    personas = repositories.get_personas()
    next(p for p in personas if p["id"] == "magda")["plan"]["family"]["mother"]["contribution_debt"] = "150.00"
    monkeypatch.setattr(repositories, "get_personas", lambda: personas)
    debt = client.get("/api/v1/zus/me", headers=login(client, "magda")).json()["debt"]
    assert debt == {"as_of": "2026-09-14", "debt": "150.00", "blocks_benefits": True}  # > 1% of 4806 (art. 2a)


def test_magda_account_plan_can_be_calculated(client):
    account = client.get("/api/v1/zus/me", headers=login(client, "magda")).json()
    assert account["debt"]["debt"] == "0.00" and not account["debt"]["blocks_benefits"]
    assert all("wstrzymane" not in app["status"] for app in account["applications"])
    response = client.post("/api/v1/calc/plan", json=account["plan"])
    assert response.status_code == 200
    assert not [issue for issue in response.json()["issues"] if issue["severity"] == "error"]


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


def test_filed_application_preserves_the_exact_period_and_fields(client):
    auth = login(client, "ola")
    body = {"form": "ZAM", "who": "mother", "recipient": "zus", "start": "2027-04-02",
            "end": "2027-08-19", "payload": {"imie_nazwisko": "Ala Przykładowa"},
            "official_fields": {"p1-3": "Ala", "p2-1": "X", "p2-3": "2.04.2027 – 19.08.2027"}}
    assert client.post("/api/v1/applications", json=body, headers=auth).status_code == 200
    filed = client.get("/api/v1/zus/me", headers=auth).json()["applications"][0]
    assert (filed["start"], filed["end"]) == (body["start"], body["end"])
    assert filed["payload"]["imie_nazwisko"] == body["payload"]["imie_nazwisko"]
    assert filed["payload"]["pdf:p1-3"] == "Ala"
    body["official_fields"] = {"not-an-official-field": "bad"}
    assert client.post("/api/v1/applications", json=body).status_code == 422
    body["official_fields"] = {"p2-1": "Yes"}  # checkbox values are explicit
    assert client.post("/api/v1/applications", json=body).status_code == 422
    body["official_fields"] = {"p2-3": "01.01.2027 – 31.01.2027"}
    assert client.post("/api/v1/applications", json=body).status_code == 422
    body["official_fields"] = {}
    body["end"] = "2027-01-01"
    assert client.post("/api/v1/applications", json=body).status_code == 422


def test_legacy_receipts_recover_only_explicit_complete_periods(client):
    auth = login(client, "ola")
    client.sent.append({"id": 1, "kind": "application", "created_at": datetime(2026, 11, 21), "status": "wysłano",
                        "payload": {"form": "ZAM", "who": "mother", "recipient": "zus", "persona": "ola",
                                    "payload": {"okres_od": "2027-04-02", "okres_do": "2027-08-19"}}})
    filed = client.get("/api/v1/zus/me", headers=auth).json()["applications"][0]
    assert (filed["start"], filed["end"]) == ("2027-04-02", "2027-08-19")
    client.sent[0]["payload"]["payload"]["okres_do"] = "not-a-date"
    incomplete = client.get("/api/v1/zus/me", headers=auth).json()["applications"][0]
    assert incomplete["start"] is None and incomplete["end"] is None


def test_pue_answers_from_params_and_logs_the_question(client):
    reply = client.post("/api/v1/pue/messages", json={"question": "Ile trwa urlop ojcowski?"}).json()
    assert "14 dni" in reply["answer"] and reply["links"]
    assert any(s["url"] == "/sources/labour-code#article-1823" for s in reply["sources"])
    assert client.sent[-1]["kind"] == "pue"
    assert "konsultant" in answer("Jaka jest pogoda?", P).answer
    assert "81,5%" in answer("Czy warto wybrać 81,5%?", P).answer


def test_rag_indexes_all_loaded_documents_and_cites_sources(monkeypatch):
    from app import rag
    chunks, _, _ = rag._build_index()
    kinds = {c.kind for c in chunks}
    assert kinds == {"rule", "document", "form", "card"} and len(chunks) >= 200

    # Deep subtopic queries not in basic pue.json keywords
    preterm = answer("Ile trwa uzupełniający urlop macierzyński dla wcześniaka w szpitalu?", P)
    assert "15 tygodni" in preterm.answer and "/sources/labour-code#article-1802" in preterm.links
    assert any(s.url == "/sources/labour-code#article-1802" for s in preterm.sources)

    rehab = answer("Kiedy składa się wniosek ZNp-7 o świadczenie rehabilitacyjne?", P)
    assert "12 miesięcy" in rehab.answer and any(s.url.startswith("/sources/benefits-act#article-18") for s in rehab.sources)

    # Simulated Gemini API generation with GEMINI_API_KEY
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        rag,
        "_call_gemini",
        lambda api_key, q, ch, p, ctx="": (
            "Urlop uzupełniający trwa do 15 tygodni (KP art. 180²).",
            ["/sources/labour-code#article-1802"],
        ),
    )
    gem = answer("Wcześniak w szpitalu — ile urlopu?", P)
    assert gem.mode == "gemini-rag"
    assert "15 tygodni" in gem.answer and "/sources/labour-code#article-1802" in gem.links


def test_gemini_help_request_and_parsing(monkeypatch):
    """Thinking output must have room (it shares maxOutputTokens), thought parts are skipped, the key stays out
    of the URL, and an empty or malformed reply falls back instead of raising."""
    import io
    import json
    import urllib.request

    from app import rag
    sent, replies = [], []

    def fake_urlopen(req, timeout=None):
        sent.append(req)
        return io.BytesIO(json.dumps(replies.pop(0)).encode())

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    reply = lambda *parts, reason="STOP": {"candidates": [{"finishReason": reason,
                                                            "content": {"parts": list(parts)}}]}
    answer_json = json.dumps({"answer": "14 dni.", "source_urls": ["/sources/labour-code#article-1823"]})
    replies += [reply({"text": "plan", "thought": True}, {"text": answer_json}),
                reply({"text": ""}, reason="MAX_TOKENS"),
                reply({"text": "[1, 2]"})]
    call = lambda: rag._call_gemini("k", "Ile trwa ojcowski?", [], P)
    assert call() == ("14 dni.", ["/sources/labour-code#article-1823"])
    body = json.loads(sent[0].data)
    assert body["generationConfig"]["maxOutputTokens"] >= 2048 and body["generationConfig"]["thinkingConfig"]
    assert "key=" not in sent[0].full_url and sent[0].get_header("X-goog-api-key") == "k"
    assert call() is None and call() is None


def test_every_pue_answer_renders():
    import json
    for topic in json.loads((DATA / "pue.json").read_text(encoding="utf-8")):
        reply = answer(topic["keywords"][0], P)
        assert "{" not in reply.answer and reply.links == topic["links"]


def test_personas_match_the_calculator():
    """Each persona shows a brief case; what it already filed must be among its plan's documents."""
    expected = {"anna": set(),
                "magda": {"base.raised-in-pregnancy", "base.recalculation-needed"},
                "ola": {"insured-parent.ends-before-birth"}}
    for pid, persona in _personas().items():
        result = compute_plan(persona.plan, P)
        assert {i.code for i in check(persona.plan, result, P)} == expected[pid]
        have = {(d.form, d.who, d.recipient, d.start, d.end) for d in documents(persona.plan, P)}
        assert all((a.form, a.who, a.recipient, a.start, a.end) in have for a in persona.applications), pid


def test_charities_are_listed_with_krs(client):
    charities = client.get("/api/v1/info/charities").json()
    assert len(charities) == 6 and all(c["krs"].isdigit() and c["url"].startswith("https://") for c in charities)
