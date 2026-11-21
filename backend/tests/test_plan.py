"""Unit tests for the plan ledger. Pure function, params from the seed file, no database.
Daily amounts: mother base 6000 -> 200.00 (100%), 163.00 (81.5%), 160.00 (80%), 140.00 (70%);
father base 8000 -> 266.67 (100%), 217.33 (81.5%), 186.67 (70%)."""
from datetime import date
from decimal import Decimal

import pytest

from app.calc.plan import compute_plan
from app.params import Params
from app.repositories import DATA
from app.schemas import Block, Family, MonthPay, Parent, Plan

P = Params.model_validate_json((DATA / "params.json").read_text(encoding="utf-8"))
BIRTH = date(2027, 3, 1)
MATERNITY = Block(who="mother", kind="maternity", start=BIRTH, days=140)  # 20 weeks, ends 2027-07-18


def family(mother="6000", father="8000", **kw) -> Family:
    return Family(mother=Parent(employment="employee", base_monthly=Decimal(mother)),
                  father=Parent(employment="employee", base_monthly=Decimal(father)) if father else None,
                  due_date=BIRTH, **kw)


def run(*blocks, variant="standard", **fam):
    return compute_plan(Plan(family=family(**fam), blocks=list(blocks), rate_variant=variant), P)


def month(result, ym):
    return next(m for m in result.months if m.month == ym)


def test_maternity_standard_month_by_month():
    r = run(MATERNITY)
    assert [m.month for m in r.months] == ["2027-03", "2027-04", "2027-05", "2027-06", "2027-07"]
    march, july = month(r, "2027-03"), month(r, "2027-07")
    assert march.benefit["mother"] == Decimal("6200.00") and march.salary["mother"] == 0  # 31 days x 200.00
    assert march.total == Decimal("14200.00") and not march.below_target  # target 0.8 x 14000 = 11200
    assert july.benefit["mother"] == Decimal("3600.00") and july.salary["mother"] == Decimal("2516.13")  # 6000 x 13/31
    assert r.pools.maternity_days_left == 0 and r.pools.parental_days_left == 287
    assert r.calendar[0].end == date(2027, 7, 18)


def test_averaged_rate_and_fathers_exclusive_weeks_at_70():
    r = run(MATERNITY,
            Block(who="mother", kind="parental", start=date(2027, 7, 19), days=30),
            Block(who="father", kind="parental", start=date(2027, 9, 1), days=70), variant="averaged")
    assert month(r, "2027-03").benefit["mother"] == Decimal("5053.00")  # 31 x 163.00
    assert month(r, "2027-09").benefit["father"] == Decimal("5600.10")  # 30 x 186.67, exclusive part
    # Nov: days 62-63 still exclusive (2 x 186.67), then 7 days at 81.5% (7 x 217.33)
    assert month(r, "2027-11").benefit["father"] == Decimal("1894.65")
    assert r.top_up == 0
    assert r.pools.exclusive_days_left == {"mother": 33, "father": 0}
    assert r.pools.parental_days_left == 187 and r.pools.parental_parts_used == 2


def test_averaged_without_parental_in_year_one_drops_to_70_and_tops_up():
    r = run(MATERNITY, Block(who="mother", kind="parental", start=date(2028, 3, 1), days=10), variant="averaged")
    assert month(r, "2027-03").benefit["mother"] == Decimal("5053.00")  # still paid at 81.5% ...
    assert month(r, "2028-03").benefit["mother"] == Decimal("1400.00")  # ... parental at 70% (art. 31 ust. 3g)
    assert r.top_up == Decimal("5180.00")  # 140 x (200.00 - 163.00), art. 31 ust. 4


def test_floor_applies_to_insured_full_leave_only():
    r = run(Block(who="mother", kind="parental", start=BIRTH, days=10),
            Block(who="mother", kind="parental", start=date(2027, 4, 1), days=2, work_fraction=Decimal("0.5")),
            mother="1000")
    assert month(r, "2027-03").benefit["mother"] == Decimal("333.30")  # 23.33 raised to 1000/30 = 33.33
    assert month(r, "2027-04").benefit["mother"] == Decimal("23.34")  # part-time: 23.33 x 0.5 = 11.67, no floor
    uninsured = compute_plan(Plan(family=Family(mother=Parent(employment="none"), due_date=BIRTH),
                                  blocks=[MATERNITY]), P)
    assert month(uninsured, "2027-03").benefit["mother"] == 0


def test_part_time_parental_reduces_benefit_and_pool():
    r = run(Block(who="mother", kind="parental", start=date(2027, 8, 1), days=14, work_fraction=Decimal("0.5")))
    aug = month(r, "2027-08")
    assert aug.benefit["mother"] == Decimal("980.00")  # 14 x 140.00 x 0.5
    assert aug.salary["mother"] == Decimal("4645.16")  # 6000 x (17 + 14 x 0.5) / 31
    assert r.pools.parental_days_left == 280  # 14 days at half time use 7


def test_sick_rate_depends_on_pregnancy_and_employer_pays_first_33_days():
    r = run(Block(who="mother", kind="sick", start=date(2027, 1, 4), days=40),
            Block(who="mother", kind="sick", start=date(2027, 8, 2), days=5))
    assert month(r, "2027-01").benefit["mother"] == Decimal("5600.00")  # 28 x 200.00 (100% in pregnancy)
    assert month(r, "2027-08").benefit["mother"] == Decimal("800.00")  # 5 x 160.00 (80% after birth)
    payer = next(e.text for e in r.explain if "wynagrodzenia chorobowego" in e.text)
    assert "33 dni wynagrodzenia chorobowego" in payer and "12 dni zasiłku" in payer


def test_rehab_90_then_75_percent():
    r = run(Block(who="mother", kind="rehab", start=date(2027, 8, 1), days=100))
    assert sum(m.benefit["mother"] for m in r.months) == Decimal("17700.00")  # 90 x 180.00 + 10 x 150.00


def test_care_vacation_and_paternity():
    r = run(Block(who="mother", kind="care", start=date(2028, 2, 1), days=5),
            Block(who="mother", kind="vacation", start=date(2027, 8, 1), days=10),
            Block(who="father", kind="paternity", start=BIRTH, days=14))
    assert month(r, "2028-02").benefit["mother"] == Decimal("800.00")  # 5 x 160.00 (80%)
    aug = month(r, "2027-08")
    assert aug.benefit["mother"] == 0 and aug.salary["mother"] == Decimal("6000.00")  # paid leave
    march = month(r, "2027-03")
    assert march.benefit["father"] == Decimal("3733.38") and march.salary["father"] == Decimal("4387.10")
    assert r.pools.paternity_days_left == 0 and r.pools.care_days_left == 55


def test_pool_sizes_depend_on_children_and_za_zyciem():
    assert run(children=2).pools.maternity_days_left == 31 * 7
    assert run(children=2).pools.parental_days_left == 43 * 7
    assert run(za_zyciem=True).pools.parental_days_left == 65 * 7
    assert run(children=2, za_zyciem=True).pools.parental_days_left == 67 * 7
    assert [m.month for m in run().months] == ["2027-03"]  # no blocks: just the birth month


def test_base_from_salary_history_and_input_errors():
    history = [MonthPay(month=f"2026-{m:02d}", gross=Decimal(6000)) for m in range(1, 13)]
    r = compute_plan(Plan(family=Family(mother=Parent(employment="employee", salary_history=history), due_date=BIRTH),
                          blocks=[MATERNITY]), P)
    assert month(r, "2027-04").benefit["mother"] == Decimal("5177.40")  # 30 x 172.58 (base 5177.40)
    with pytest.raises(ValueError, match="drugiego rodzica"):
        run(Block(who="father", kind="paternity", start=BIRTH, days=7), father=None)
    with pytest.raises(ValueError, match="podstawę wymiaru"):
        compute_plan(Plan(family=Family(mother=Parent(employment="employee"), due_date=BIRTH)), P)
