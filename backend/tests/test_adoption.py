"""Adoption/foster boundaries: KP art. 183, 182³; paperwork regulation § 16, leave regulation § 18."""
from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.calc.family import event_date
from app.calc.paperwork import documents
from app.calc.plan import compute_plan, pool_sizes
from app.calc.rules import check
from app.params import Params
from app.repositories import DATA
from app.schemas import AdoptedChild, Adoption, Block, Family, Parent, Plan

P = Params.model_validate_json((DATA / "params.json").read_text())
EVENT = date(2027, 3, 1)


def plan(*, dob=date(2020, 6, 1), kind="adoption", blocks=None, za=False, **adoption):
    a = {"kind": kind, "accepted_on": EVENT}
    if kind == "adoption":
        a["court_applied_on"] = EVENT
    a.update(adoption)
    return Plan(family=Family(mother=Parent(employment="employee", base_monthly=Decimal(6000)),
                             father=Parent(employment="employee", base_monthly=Decimal(8000)),
                             due_date=EVENT, birth_date=dob, adoption=Adoption(**a), za_zyciem=za),
                blocks=blocks or [])


def block(who="mother", kind="maternity", start=EVENT, days=140, fraction="0"):
    return Block(who=who, kind=kind, start=start, days=days, work_fraction=Decimal(fraction))


def codes(p):
    return {i.code for i in check(p, compute_plan(p, P), P)}


@pytest.mark.parametrize("kind,age,deferred,valid", [
    ("adoption", 13, False, True), ("adoption", 14, False, False),
    ("foster", 6, False, True), ("foster", 7, False, False),
    ("foster", 9, True, True), ("foster", 10, True, False),
])
def test_age_boundary_is_exact(kind, age, deferred, valid):
    p = plan(kind=kind, dob=date(2027 - age, 3, 1), school_deferred=deferred)
    assert ("adoption.age-limit" not in codes(p)) == valid
    assert (pool_sizes(p, P)[0] > 0) == valid


def test_standard_pools_and_money_use_acceptance_not_birth():
    p = plan(blocks=[block()])
    assert pool_sizes(p, P) == (140, 287)
    result = compute_plan(p, P)
    assert result.calendar[0].benefit == Decimal(28000)
    assert result.months[0].month == "2027-03"
    assert codes(p) == set()


@pytest.mark.parametrize("za,parental", [(False, 266), (True, 434)])
def test_nine_week_guarantee_and_short_parental_pool(za, parental):
    p = plan(dob=date(2013, 3, 20), za=za, blocks=[block(days=63)])
    assert pool_sizes(p, P) == (63, parental)
    assert "maternity-pool.exceeded" not in codes(p)
    assert "parental-pool.too-late" in codes(plan(dob=date(2013, 3, 20), blocks=[
        block(kind="parental", start=date(2027, 3, 20), days=7)]))


def test_missing_facts_professional_foster_and_late_start_are_explicit():
    assert "adoption.birth-date-missing" in codes(plan(dob=None))
    assert "adoption.court-date-missing" in codes(plan(court_applied_on=None))
    assert pool_sizes(plan(kind="foster", professional_foster=True), P) == (0, 0)
    assert "adoption.start-too-late" in codes(plan(blocks=[block(start=EVENT + timedelta(days=22))]))
    assert "adoption.before-event" in codes(plan(blocks=[block(start=EVENT - timedelta(days=1))]))
    assert compute_plan(plan(dob=None, blocks=[block()]), P).calendar[0].benefit == 0


def test_court_application_is_needed_as_well_as_acceptance():
    p = plan(court_applied_on=EVENT + timedelta(days=10), blocks=[block()])
    assert event_date(p) == EVENT + timedelta(days=10)
    assert "adoption.before-event" in codes(p)


def test_prior_foster_use_does_not_reset_shared_or_exclusive_pools():
    p = plan(previous_maternity_days=70, previous_parental_mother_days=100, previous_parental_father_days=63)
    assert pool_sizes(p, P) == (70, 124)
    assert compute_plan(p, P).pools.exclusive_days_left == {"mother": 0, "father": 0}
    p.blocks = [block(kind="parental", days=125)]
    assert "parental-pool.exceeded" in codes(p)


def test_paternity_requires_final_adoption_and_its_own_clock():
    b = block(who="father", kind="paternity", days=14)
    assert "adoption.paternity-no-final-order" in codes(plan(blocks=[b]))
    assert "paternity.too-late" not in codes(plan(court_final_on=EVENT, blocks=[b]))
    assert "adoption.paternity-no-final-order" in codes(plan(kind="foster", blocks=[b]))
    b.start = date(2028, 3, 1)
    assert "paternity.too-late" in codes(plan(court_final_on=EVENT, blocks=[b]))


def test_adopting_father_can_be_the_averaged_rate_applicant():
    p = plan(applicant="father", blocks=[block(who="father")])
    p.rate_variant = "averaged"
    assert compute_plan(p, P).calendar[0].benefit == Decimal("217.33") * 140
    assert not any(c.startswith("transfer.") for c in codes(p))
    docs = documents(p, P)
    assert any(d.who == "father" and "81,5%" in d.form for d in docs)


def test_adoption_paperwork_has_court_evidence_and_correct_deadline():
    docs = documents(plan(blocks=[block()]), P)
    request = next(d for d in docs if "na warunkach" in d.form)
    assert request.due_by == EVENT + timedelta(days=7)
    assert "sądu" in request.note
    assert not any(d.recipient == "usc" for d in docs)


def test_foster_deferral_and_part_time_paperwork():
    p = plan(kind="foster", dob=date(2018, 6, 1), school_deferred=True,
             blocks=[block(kind="parental", days=100, fraction="0.5")])
    assert "parental-pool.too-late" not in codes(p)
    assert compute_plan(p, P).pools.parental_days_left == 237
    docs = documents(p, P)
    assert any("odroczeniu" in d.note for d in docs)
    assert any("łączenie" in d.form for d in docs)


def test_siblings_age_out_without_a_fictitious_shared_birthday():
    p = plan(kind="foster", children=[AdoptedChild(birth_date=date(2020, 3, 20)),
                                     AdoptedChild(birth_date=date(2022, 1, 1))])
    p.family.children = 2
    # Older child turns 7 on day 19: the remaining eligible child supports 20 weeks total, not 31.
    assert pool_sizes(p, P) == (140, 301)
    p.family.adoption.children = []
    assert "adoption.children-missing" in codes(p)
    assert pool_sizes(p, P) == (0, 0)


def test_simultaneous_parental_days_keep_the_applicants_averaged_rate():
    p = plan(blocks=[block(kind="parental", days=7), block(who="father", kind="parental", days=7)])
    p.rate_variant = "averaged"
    result = compute_plan(p, P)
    assert result.calendar[0].benefit == Decimal(163) * 7
    assert result.calendar[1].benefit == Decimal("186.67") * 7
