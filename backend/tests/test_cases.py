"""Golden tests: ZUS sample cases transcribed into numbers (data/samples.json) must give ZUS's own outcome, and where
ZUS printed a payout, the same base and monthly amounts to the grosz. No database, no sample documents in the repo."""
import hashlib

import pytest
from fastapi.testclient import TestClient

from app import params, repositories
from app.api import cases
from app.calc.plan import compute_plan
from app.calc.rules import check
from app.params import Params
from app.repositories import seed_params

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
    pdf = b"%PDF-1.4 sample bundle"
    known = SAMPLES["jdg-81-5"].model_copy(update={"sha256": [hashlib.sha256(pdf).hexdigest()]})
    monkeypatch.setattr(cases, "_samples", lambda: [known])
    hit = client.post("/api/v1/cases/parse", files={"file": ("a.pdf", pdf, "application/pdf")}).json()
    assert hit["sample"]["id"] == "jdg-81-5" and not hit["needs_manual_entry"]
    miss = client.post("/api/v1/cases/parse", files={"file": ("b.pdf", b"%PDF-1.4 other", "application/pdf")}).json()
    assert miss["sample"] is None and miss["needs_manual_entry"] and "nie używa OCR" in miss["message"]
    assert client.post("/api/v1/cases/parse", files={"file": ("c.txt", b"hello", "text/plain")}).status_code == 422
