"""Golden tests: ZUS sample cases transcribed into numbers (data/samples.json) must give ZUS's own outcome, and where
ZUS printed a payout, the same base and monthly amounts to the grosz. No database, no sample documents in the repo."""
import hashlib
import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import params, repositories, vision
from app.api import cases
from app.calc.plan import compute_plan
from app.calc.rules import check
from app.params import Params
from app.repositories import seed_params
from app.schemas import CaseInput

SAMPLES = {s.id: s for s in cases._samples()}
# the rule each refusal must be reported under, matching ZUS's reason
REASON = {"brak-ubezpieczenia-porod": "insured-parent.not-insured", "jdg-wyrejestrowanie": "insured-parent.ended",
          "zlecenie-bez-chorobowego": "insured-parent.no-voluntary-sickness",
          "szosta-czesc-rodzicielskiego": "parental-parts.too-many"}


def params_on(on=None) -> Params:
    """The seeded params version in force on `on`, like params.active() but without Postgres."""
    day = (on or SAMPLES["jdg-81-5"].plan.family.due_date).isoformat()
    return Params.model_validate(max((v for _, v in seed_params() if v["effective_from"] <= day),
                                     key=lambda v: v["effective_from"]))


@pytest.mark.parametrize("sample", SAMPLES.values(), ids=SAMPLES.keys())
def test_sample_matches_zus(sample):
    plan = sample.plan
    p = params_on(plan.family.birth_date or plan.family.due_date)
    result = compute_plan(plan, p)
    errors = {i.code for i in check(plan, result, p) if i.severity == "error"}
    assert (not errors) == sample.zus_entitled, errors
    if sample.id in REASON:
        assert REASON[sample.id] in errors
    for granted in sample.granted:
        assert result.bases[granted.who] == granted.base
        paid = {m.month: m.benefit[granted.who] for m in result.months}
        assert {month: paid[month] for month in granted.months} == granted.months


def test_history_params_are_used_for_older_cases():
    assert params_on(SAMPLES["szosta-czesc-rodzicielskiego"].plan.family.due_date).min_wage == 4242  # 2024
    assert params_on(SAMPLES["zlecenie-bez-chorobowego"].plan.family.due_date).min_wage == 4666  # 2025


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(repositories, "init", lambda: None)
    monkeypatch.setattr(params, "active", params_on)
    uploads = {}  # the uploads table: hash -> stored reading
    monkeypatch.setattr(repositories, "upload_seen", lambda sha256: uploads.setdefault(sha256, None))
    monkeypatch.setattr(repositories, "save_reading", uploads.__setitem__)
    from app.main import app
    with TestClient(app) as c:
        yield c


def test_samples_and_evaluate(client):
    listed = client.get("/api/v1/cases/samples").json()
    assert {s["id"] for s in listed} == set(SAMPLES)
    sample = next(s for s in listed if s["id"] == "ojciec-9-tygodni")
    verdict = client.post("/api/v1/cases/evaluate", json={"plan": sample["plan"]}).json()
    assert verdict["entitled"] and verdict["insured"] and not verdict["debt_block"]
    assert verdict["result"]["bases"]["father"] == "4344.11"
    refused = next(s for s in listed if s["id"] == "zlecenie-bez-chorobowego")
    assert not client.post("/api/v1/cases/evaluate", json={"plan": refused["plan"]}).json()["insured"]


def test_upload_is_recognized_by_hash_or_sent_to_manual_entry(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    pdf = b"%PDF-1.4 sample bundle"
    known = SAMPLES["jdg-81-5"].model_copy(update={"sha256": [hashlib.sha256(pdf).hexdigest()]})
    monkeypatch.setattr(cases, "_samples", lambda: [known])
    hit = client.post("/api/v1/cases/parse", files={"file": ("a.pdf", pdf, "application/pdf")}).json()
    assert hit["sample"]["id"] == "jdg-81-5" and not hit["needs_manual_entry"]
    miss = client.post("/api/v1/cases/parse", files={"file": ("b.pdf", b"%PDF-1.4 other", "application/pdf")}).json()
    assert miss["sample"] is None and miss["needs_manual_entry"] and "wyłączony" in miss["message"]
    assert client.post("/api/v1/cases/parse", files={"file": ("c.txt", b"hello", "text/plain")}).status_code == 422


def test_unknown_upload_is_read_by_the_vision_model(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    case = SAMPLES["jdg-81-5"]
    sent = {}

    async def generate_content(*, model, contents, config):
        sent.update(pdf=contents[0].inline_data.data, schema=json.dumps(config.response_json_schema))
        return SimpleNamespace(text=CaseInput(plan=case.plan, title=case.title).model_dump_json())

    fake = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)))
    monkeypatch.setattr(vision, "_client", lambda: fake)
    read = client.post("/api/v1/cases/parse", files={"file": ("x.pdf", b"%PDF-1.4 scan", "application/pdf")}).json()
    assert sent["pdf"] == b"%PDF-1.4 scan" and '"pattern"' not in sent["schema"] and "salary_history" in sent["schema"]
    assert read["sample"] is None and not read["needs_manual_entry"] and "model AI" in read["message"]
    assert CaseInput.model_validate(read["extracted"]).plan == case.plan
    assert read["sha256"] == hashlib.sha256(b"%PDF-1.4 scan").hexdigest()
    assert client.post("/api/v1/cases/evaluate", json={"plan": read["extracted"]["plan"]}).json()["entitled"]
    fixed = {**read["extracted"], "title": "Poprawione przez użytkownika"}
    fixed["plan"]["family"]["mother"]["base_monthly"] = "5000.00"
    checked = client.post(f"/api/v1/cases/evaluate?upload={read['sha256']}", json=fixed).json()
    assert checked["result"]["bases"]["mother"] == "5000.00"
    assert client.post("/api/v1/cases/evaluate?upload=not-a-hash", json=fixed).status_code == 422

    async def broken(**_):
        return SimpleNamespace(text='{"plan": {"family": {}}}')  # schema-valid JSON is not enough: Pydantic rejects it

    fake.aio.models.generate_content = broken
    again = client.post("/api/v1/cases/parse", files={"file": ("x.pdf", b"%PDF-1.4 scan", "application/pdf")}).json()
    assert again["extracted"]["title"] == fixed["title"] and "już wgrany" in again["message"]  # model not called
    assert again["extracted"]["plan"]["family"]["mother"]["base_monthly"] == "5000.00"  # the user's correction
    failed = client.post("/api/v1/cases/parse", files={"file": ("y.pdf", b"%PDF-1.4 new", "application/pdf")}).json()
    assert failed["extracted"] is None and failed["needs_manual_entry"] and "nie odczytał" in failed["message"]
