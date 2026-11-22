"""Regressions from the calculator/ZUS review: art. 30a, 31 and editable statutory pools."""
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app import params, repositories
from app.calc.plan import compute_plan
from app.calc.rules import check
from app.params import Params
from app.schemas import Block, Family, Parent, Plan

P = Params.model_validate_json((repositories.DATA / "params.json").read_text())
BIRTH = date(2027, 3, 1)


def plan(kind="maternity", who="mother", base="6000"):
    return Plan(family=Family(mother=Parent(employment="employee", base_monthly=Decimal(base)),
                             father=Parent(employment="employee", base_monthly=Decimal(base)), due_date=BIRTH),
                blocks=[Block(who=who, kind=kind, start=BIRTH, days=14)])


@pytest.mark.parametrize("applied_on,late", [(date(2027, 3, 22), False), (date(2027, 3, 23), True)])
def test_averaged_rate_checks_the_application_date_not_the_viewing_date(applied_on, late):
    p = plan()
    p.rate_variant = "averaged"
    p.averaged_request_on = applied_on
    p.today = date(2027, 5, 1)
    issues = check(p, compute_plan(p, P), P)
    assert ("averaged.deadline" in {issue.code for issue in issues}) == late


def test_paternity_is_excluded_from_the_parental_benefit_floor():
    paternity = compute_plan(plan("paternity", "father", "300"), P)
    maternity = compute_plan(plan(base="300"), P)
    assert paternity.calendar[0].benefit == Decimal("140.00")  # 14 × 300 / 30
    assert maternity.calendar[0].benefit == Decimal("466.62")  # 14 × 33.33


def test_top_up_does_not_add_money_already_covered_by_the_floor():
    p = plan(base="300")
    p.rate_variant = "averaged"
    result = compute_plan(p, P)
    assert result.top_up == 0
    assert "floor.tax-not-modelled" in {i.code for i in check(p, result, P)}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(repositories, "init", lambda: None)
    monkeypatch.setattr(params, "active", lambda on=None: P)
    from app.main import app
    with TestClient(app) as c:
        yield c


def test_start_has_no_report_and_uses_number_of_children(client):
    p = plan()
    p.family.children = 2
    response = client.post("/api/v1/calc/start", json=p.model_dump(mode="json")).json()
    assert response["blocks"] == [{"who": "mother", "kind": "maternity", "start": "2027-03-01",
                                    "days": 217, "work_fraction": "0", "base_monthly": None,
                                    "rehab_indexation_factor": None, "monthly_tax_advance": None}]
    assert "months" not in response and "bases" not in response


def test_start_does_not_invent_insurance(client):
    p = plan()
    p.family.mother.employment = "none"
    response = client.post("/api/v1/calc/start", json=p.model_dump(mode="json")).json()
    assert response["blocks"] == []


def test_single_gross_salary_is_an_explicit_estimate_not_a_fabricated_history():
    p = plan()
    p.family.mother.base_monthly = None
    p.family.mother.gross_monthly_estimate = Decimal(6000)
    result = compute_plan(p, P)
    assert result.bases["mother"] == Decimal("5177.40")
    assert p.family.mother.salary_history == []
    codes = {issue.code for issue in check(p, result, P)}
    assert "base.estimate" in codes and "base.missing" not in codes
    assert any("szacunek" in e.text.lower() or "orientacyjna" in e.text for e in result.explain)


def test_known_base_has_precedence_over_optional_gross_estimate():
    p = plan()
    p.family.mother.gross_monthly_estimate = Decimal(8000)
    result = compute_plan(p, P)
    assert result.bases["mother"] == Decimal(6000)
    assert "base.estimate" not in {issue.code for issue in check(p, result, P)}


def test_gross_salary_estimate_cannot_be_used_for_jdg():
    p = plan()
    p.family.mother.base_monthly = None
    p.family.mother.employment = "self_employed"
    p.family.mother.gross_monthly_estimate = Decimal(6000)
    with pytest.raises(ValueError, match="umowy o pracę"):
        compute_plan(p, P)
