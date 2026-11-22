"""Opt-in exceptions must not weaken the ordinary handover or count one day twice."""
from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.calc.paperwork import documents
from app.calc.plan import compute_plan, pool_sizes
from app.calc.rules import check
from app.params import Params
from app.repositories import DATA
from app.schemas import Block, Family, MaternityTakeover, MonthPay, Parent, Plan

P = Params.model_validate_json((DATA / "params.json").read_text())
BIRTH = date(2027, 3, 1)


def block(who, start, days, **extra):
    return Block(who=who, kind="maternity", start=BIRTH + timedelta(days=start), days=days, **extra)


def plan(reason, event, *, end=None, blocks=None, **facts):
    return Plan(family=Family(mother=Parent(employment="employee", base_monthly=Decimal(6000)),
                             father=Parent(employment="employee", base_monthly=Decimal(7000)),
                             due_date=BIRTH, birth_date=BIRTH,
                             maternity_takeover=MaternityTakeover(reason=reason, start=BIRTH + timedelta(days=event),
                                 end=BIRTH + timedelta(days=end) if end is not None else None), **facts),
                blocks=blocks or [])


def errors(p):
    return {i.code for i in check(p, compute_plan(p, P), P) if i.severity == "error"}


def test_death_handover_has_no_eight_week_minimum_and_correct_paperwork():
    p = plan("death", 9, blocks=[block("mother", 0, 10), block("father", 10, 130)])
    assert errors(p) == set()
    docs = documents(p, P)
    assert any("akt zgonu" in d.note for d in docs)
    assert not any("rezygnację" in d.form for d in docs)
    assert "transfer.before-event" in errors(plan("death", 9, blocks=[block("father", 9, 10)]))


@pytest.mark.parametrize("reason", ["incapacity", "abandonment"])
def test_eight_weeks_required_for_insured_mother(reason):
    good = plan(reason, 55, blocks=[block("mother", 0, 56), block("father", 56, 84)])
    assert errors(good) == set()
    early = plan(reason, 48, blocks=[block("mother", 0, 49), block("father", 49, 91)])
    assert "transfer.before-14-weeks" in errors(early)


def test_hospital_is_only_a_temporary_handover_and_mother_can_resume():
    p = plan("hospital", 56, end=69,
             blocks=[block("mother", 0, 56), block("father", 56, 14), block("mother", 70, 70)])
    assert errors(p) == set()
    p.blocks[1].days = 15
    assert "transfer.outside-hospital" in errors(p)


def test_no_event_never_bypasses_ordinary_fourteen_weeks():
    p = plan("death", 9, blocks=[block("mother", 0, 10), block("father", 10, 130)])
    p.family.maternity_takeover = None
    assert "transfer.before-14-weeks" in errors(p)


def test_surviving_twin_keeps_the_single_child_maternity_pool_and_parental_right():
    p = plan("death", 9, blocks=[block("mother", 0, 140)], children=2,
             child_died_on=BIRTH, surviving_children=1)
    p.family.maternity_takeover = None
    p.blocks.append(Block(who="father", kind="parental", start=BIRTH + timedelta(days=140), days=63))
    assert pool_sizes(p, P)[0] == 140 and errors(p) == set()
    p.family.surviving_children = 0
    assert "maternity-pool.after-child-death" in errors(p)


def test_stillbirth_averaged_request_does_not_reduce_maternity():
    p = plan("death", 9, blocks=[block("mother", 0, 56)], child_died_on=BIRTH)
    p.family.maternity_takeover = None
    p.rate_variant = "averaged"
    result = compute_plan(p, P)
    assert result.calendar[0].benefit == Decimal(11200) and result.top_up == 0


def test_verified_period_base_indexation_and_tax_floor_are_opt_in():
    p = plan("death", 9, blocks=[block("mother", 0, 30, base_monthly="9000")])
    p.family.maternity_takeover = None
    assert compute_plan(p, P).calendar[0].benefit == Decimal(9000)
    p.blocks = [Block(who="mother", kind="rehab", start=BIRTH, days=30, rehab_indexation_factor="1.1")]
    assert compute_plan(p, P).calendar[0].benefit == Decimal(5940)
    p.blocks = [Block(who="mother", kind="parental", start=BIRTH, days=30, base_monthly="500",
                     monthly_tax_advance="50", work_fraction="0.5")]
    assert compute_plan(p, P).calendar[0].benefit == Decimal(525)


def test_derived_base_after_a_full_month_gap_requires_confirmation():
    p = plan("death", 9, blocks=[block("mother", 0, 30),
        Block(who="mother", kind="parental", start=BIRTH + timedelta(days=100), days=7)])
    p.family.maternity_takeover = None
    p.family.mother.base_monthly = None
    p.family.mother.salary_history = [MonthPay(month="2027-02", gross=Decimal(6000))]
    assert "base.recalculation-needed" in {i.code for i in check(p, compute_plan(p, P), P)}
    p.blocks[1].base_monthly = Decimal(7000)
    assert "base.recalculation-needed" not in {i.code for i in check(p, compute_plan(p, P), P)}
