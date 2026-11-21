"""Unit tests for legal validation. Pure functions, params from the seed file, no database."""
from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.calc.plan import compute_plan
from app.calc.rules import check, supplementary_weeks
from app.params import Params
from app.repositories import DATA
from app.schemas import Adoption, Block, Family, Hospitalization, MonthPay, Parent, Plan

P = Params.model_validate_json((DATA / "params.json").read_text(encoding="utf-8"))
BIRTH = date(2027, 3, 1)


def at(days: int) -> date:
    return BIRTH + timedelta(days=days)


def blk(who, kind, start, days, fraction="0"):
    return Block(who=who, kind=kind, start=start, days=days, work_fraction=Decimal(fraction))


MATERNITY = blk("mother", "maternity", BIRTH, 140)
LEGAL_PLAN = [MATERNITY, blk("father", "paternity", BIRTH, 14), blk("mother", "parental", at(140), 120),
              blk("father", "parental", at(260), 63)]


def issues(blocks, *, today=None, variant="standard", mother=None, father="employee", **fam):
    family = Family(mother=mother or Parent(employment="employee", base_monthly=Decimal(6000)),
                    father=Parent(employment=father, base_monthly=Decimal(8000)) if father else None,
                    due_date=BIRTH, **fam)
    plan = Plan(family=family, blocks=blocks, rate_variant=variant, today=today)
    return check(plan, compute_plan(plan, P), P)


def codes(*args, **kw):
    return {i.code for i in issues(*args, **kw)}


def test_legal_plan_has_no_issues():
    assert issues(LEGAL_PLAN) == []


CASES = {
    "overlap": ([MATERNITY, blk("mother", "sick", at(10), 5)], {}, "plan.overlap"),
    "paternity for mother": ([blk("mother", "paternity", BIRTH, 7)], {}, "paternity.father-only"),
    "job loss for father": ([blk("father", "job_loss_benefit", at(-30), 10)], {}, "job-loss-before.who"),
    "job loss after birth": ([blk("mother", "job_loss_benefit", at(-5), 10)], {}, "job-loss-before.after-birth"),
    "paternity before birth": ([blk("father", "paternity", at(-3), 7)], {}, "paternity.before-birth"),
    "care before birth": ([blk("mother", "care", at(-3), 2)], {}, "care-right.before-birth"),
    "not insured": ([MATERNITY], {"mother": Parent(employment="none")}, "insured-parent.not-insured"),
    "no voluntary sickness": ([MATERNITY], {"mother": Parent(employment="contract", base_monthly=Decimal(5000))},
                              "insured-parent.no-voluntary-sickness"),
    "contribution debt": ([MATERNITY], {"mother": Parent(employment="self_employed", voluntary_sickness=True,
                                                         base_monthly=Decimal(5000), contribution_debt=Decimal(100))},
                          "debt.blocks-benefits"),
    "sick waiting period": ([blk("mother", "sick", date(2027, 1, 4), 5)],
                            {"mother": Parent(employment="employee", base_monthly=Decimal(6000),
                                              insured_since=date(2026, 12, 20))}, "sick-right.waiting-period"),
    "maternity too long": ([blk("mother", "maternity", BIRTH, 150)], {}, "maternity-pool.exceeded"),
    "parental pool": ([MATERNITY, blk("mother", "parental", at(140), 224), blk("father", "parental", at(140), 70)], {},
                      "parental-pool.exceeded"),
    "paternity too long": ([blk("father", "paternity", BIRTH, 21)], {}, "paternity.exceeded"),
    "care limit": ([blk("mother", "care", date(2028, 1, 10), 61)], {}, "care-money.limit"),
    "prebirth over 6 weeks": ([blk("mother", "maternity", at(-50), 140)], {}, "prebirth.too-early"),
    "maternity after birth": ([blk("mother", "maternity", at(3), 137)], {}, "maternity-pool.starts-after-birth"),
    "maternity with a gap": ([blk("mother", "maternity", BIRTH, 70), blk("mother", "maternity", at(80), 60)], {},
                             "maternity-pool.not-continuous"),
    "handover before 14 weeks": ([blk("mother", "maternity", BIRTH, 70), blk("father", "maternity", at(70), 70)], {},
                                 "transfer.before-14-weeks"),
    "handover with a gap": ([blk("mother", "maternity", BIRTH, 98), blk("father", "maternity", at(100), 40)], {},
                            "transfer.not-continuous"),
    "supplementary without facts": ([MATERNITY, blk("mother", "supplementary", at(140), 7)], {},
                                    "supplementary.no-hospitalization"),
    "supplementary too long": ([MATERNITY, blk("mother", "supplementary", at(140), 63)],
                               {"hospitalization": Hospitalization(pregnancy_week=26, birth_weight_g=900,
                                                                   hospital_days=50)}, "supplementary.too-long"),
    "supplementary with a gap": ([MATERNITY, blk("mother", "supplementary", at(150), 7)],
                                 {"hospitalization": Hospitalization(pregnancy_week=26, birth_weight_g=900,
                                                                     hospital_days=50)},
                                 "supplementary.not-after-maternity"),
    "supplementary twice": ([MATERNITY, blk("mother", "supplementary", at(140), 7),
                             blk("father", "supplementary", at(147), 7)],
                            {"hospitalization": Hospitalization(pregnancy_week=26, birth_weight_g=900,
                                                                hospital_days=50)}, "supplementary.one-block"),
    "paternity in 3 parts": ([blk("father", "paternity", at(d), 7) for d in (0, 30, 60)], {}, "paternity.parts"),
    "paternity part under a week": ([blk("father", "paternity", BIRTH, 5)], {}, "paternity.part-too-short"),
    "paternity after 12 months": ([blk("father", "paternity", date(2028, 3, 1), 7)], {}, "paternity.too-late"),
    "parental in 6 parts": ([blk("mother", "parental", at(150 + 10 * i), 7) for i in range(6)], {},
                            "parental-parts.too-many"),
    "parental after year 6": ([blk("mother", "parental", date(2034, 1, 2), 7)], {}, "parental-pool.too-late"),
    "other parent's 9 weeks": ([blk("mother", "parental", at(140), 230)], {}, "parental-pool.exclusive"),
    "part-time sick leave": ([blk("mother", "sick", at(200), 7, "0.5")], {}, "part-time.not-parental"),
    "part-time non-employee": ([blk("mother", "parental", at(140), 14, "0.5")],
                               {"mother": Parent(employment="contract", voluntary_sickness=True,
                                                 base_monthly=Decimal(5000))}, "part-time.not-employee"),
    "part-time over half": ([blk("mother", "parental", at(140), 14, "0.6")], {}, "part-time.fraction"),
    "part-time cap": ([blk("mother", "parental", at(140), 580, "0.5")], {}, "part-time.cap"),
    "care by both parents": ([blk("mother", "care", date(2028, 1, 10), 3), blk("father", "care", date(2028, 1, 11), 3)],
                             {}, "care-docs.one-parent"),
    "sick over 270 days in pregnancy": ([blk("mother", "sick", at(-280), 280)], {}, "sick-right.period"),
    "sick over 182 days": ([blk("father", "sick", at(10), 190)], {}, "sick-right.period"),
    "rehab over 12 months": ([blk("father", "rehab", at(10), 400)], {}, "rehab.too-long"),
    "rehab without sickness": ([blk("father", "rehab", at(10), 30)], {}, "rehab.sick-not-exhausted"),
    "adoption": ([MATERNITY], {"adoption": Adoption(kind="adoption", child_age_years=3, accepted_on=BIRTH)},
                 "adoption.birth-date-missing"),
    "benefit before insurance": ([MATERNITY], {"mother": Parent(employment="employee", base_monthly=Decimal(6000),
                                                                insured_since=at(10))}, "insured-parent.not-yet-insured"),
    "insured during pregnancy": ([MATERNITY], {"mother": Parent(employment="employee", base_monthly=Decimal(6000),
                                                                insured_since=at(-100))},
                                 "insured-parent.started-in-pregnancy"),
    "base raised in pregnancy": ([MATERNITY], {"mother": Parent(employment="employee", salary_history=[
        MonthPay(month=f"2026-{m:02d}", gross=Decimal(9000 if m == 9 else 6000)) for m in range(1, 13)])},
                                 "base.raised-in-pregnancy"),
    "insurance ends before birth": ([MATERNITY], {"mother": Parent(employment="contract", voluntary_sickness=True,
                                                                   base_monthly=Decimal(5000), insured_until=at(-10))},
                                    "insured-parent.ends-before-birth"),
}


@pytest.mark.parametrize(("blocks", "facts", "code"), CASES.values(), ids=CASES.keys())
def test_each_rule_triggers(blocks, facts, code):
    assert code in codes(blocks, **facts)


def test_severities_and_single_report_per_code():
    found = issues([blk("father", "rehab", at(10), 30), blk("father", "paternity", BIRTH, 5),
                    blk("father", "paternity", at(40), 5)])
    assert {i.code: i.severity for i in found}["rehab.sick-not-exhausted"] == "warning"
    assert [i.code for i in found].count("paternity.part-too-short") == 1


def test_deadlines_only_with_today():
    late = [blk("father", "paternity", at(33), 7), blk("mother", "parental", at(140), 30, "0.5")]
    assert codes(late, variant="averaged") == set()  # no `today`, no deadline checks
    found = codes(late, today=at(30), variant="averaged")
    assert {"averaged.deadline", "paternity.notice"} <= found
    found = codes([MATERNITY, blk("mother", "parental", at(140), 30, "0.5")], today=at(130))
    assert {"parental-docs.notice", "part-time.notice"} <= found
    handover = [blk("mother", "maternity", BIRTH, 98), blk("father", "maternity", at(98), 42)]
    assert "transfer.notice" in codes(handover, today=at(90))
    assert "transfer.notice" not in codes(handover, today=at(80))


def test_contract_end_before_birth_is_a_warning_for_employees():
    # a fixed-term contract may be extended to the birth (KP art. 177 § 3), so only a warning
    mother = Parent(employment="employee", base_monthly=Decimal(6000), insured_until=at(-10))
    assert {i.code: i.severity for i in issues([MATERNITY], mother=mother)} == {
        "insured-parent.ends-before-birth": "warning"}
    lost_job = [blk("mother", "job_loss_benefit", at(-9), 9), MATERNITY]  # art. 30 ust. 1: still entitled
    assert "insured-parent.ends-before-birth" not in codes(lost_job, mother=mother)


def test_supplementary_entitlement_table():
    def weeks(week, grams, days):
        return supplementary_weeks(Plan(family=Family(
            mother=Parent(employment="employee", base_monthly=Decimal(6000)), due_date=BIRTH,
            hospitalization=Hospitalization(pregnancy_week=week, birth_weight_g=grams, hospital_days=days))), P)
    assert weeks(26, 900, 50) == 8  # before week 28: a week per started week of stay, up to 15
    assert weeks(30, 900, 120) == 15  # <= 1000 g counts as the extreme case too
    assert weeks(32, 1500, 70) == 8  # weeks 28-36 and > 1000 g: up to 8
    assert weeks(39, 3200, 10) == 2  # at term
    assert weeks(39, 3200, 1) == 0  # at term, under 2 days
    assert supplementary_weeks(Plan(family=Family(mother=Parent(employment="employee"), due_date=BIRTH)), P) is None
