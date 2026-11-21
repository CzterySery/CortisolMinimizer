"""Unit tests for paperwork: payer, documents, recipients, due dates. Pure functions, seed params, no database."""
from datetime import date, timedelta
from decimal import Decimal

from app.calc.paperwork import documents
from app.calc.plan import compute_plan, payer
from app.params import Params
from app.repositories import DATA
from app.schemas import Block, Family, Parent, Plan

P = Params.model_validate_json((DATA / "params.json").read_text(encoding="utf-8"))
BIRTH = date(2027, 3, 1)


def at(days: int) -> date:
    return BIRTH + timedelta(days=days)


def blk(who, kind, start, days, fraction="0"):
    return Block(who=who, kind=kind, start=start, days=days, work_fraction=Decimal(fraction))


def parent(employment="employee", insured=0, **kw):
    return Parent(employment=employment, base_monthly=Decimal(6000), payer_insured_count=insured,
                  voluntary_sickness=employment != "employee", **kw)


def docs(*blocks, mother=None, father=None, variant="standard", **fam):
    family = Family(mother=mother or parent(), father=father or parent(), due_date=BIRTH, **fam)
    return documents(Plan(family=family, blocks=list(blocks), rate_variant=variant), P)


def rows(found):
    return {(d.form.split(":")[0], d.who, d.recipient, d.due_by) for d in found}


def test_payer_follows_art_61():
    assert payer(parent(insured=21), P) == "employer"
    assert payer(parent(insured=20), P) == "zus"
    assert payer(parent("contract", insured=50), P) == "employer"
    assert payer(parent("self_employed", insured=50), P) == "zus"


def test_employees_apply_to_the_employer_and_a_small_one_sends_z3():
    found = docs(blk("mother", "maternity", BIRTH, 140), blk("father", "paternity", BIRTH, 14),
                 blk("mother", "parental", at(140), 120), blk("father", "parental", at(260), 63),
                 father=parent(insured=50), variant="averaged")
    assert rows(found) == {
        ("Wniosek o urlop macierzyński", "mother", "employer", None),
        ("Z-3", "mother", "zus", None),  # mother's employer has <= 20 insured: ZUS pays
        ("Wniosek o urlop ojcowski", "father", "employer", at(-7)),
        ("Wniosek o urlop rodzicielski", "mother", "employer", at(140 - 21)),
        ("Wniosek o urlop rodzicielski", "father", "employer", at(260 - 21)),
        ("Wniosek o zasiłek macierzyński w wysokości 81,5%", "mother", "employer", at(21)),
        ("Odpis skrócony aktu urodzenia", "father", "usc", None),  # his employer pays; ZUS reads the registry
    }
    z3 = next(d for d in found if d.form.startswith("Z-3"))
    assert "macierzyńskiego" in z3.form and "z rejestru" in z3.note and z3.rule.startswith("art. 61 ust. 3")
    # ordered by due date; undated documents sit at their period's start
    assert (found[0].form, found[-1].form, found[-1].who) == ("Wniosek o urlop ojcowski", "Wniosek o urlop rodzicielski",
                                                              "father")


def test_non_employees_send_zam_and_the_contracting_party_adds_z3a():
    found = docs(blk("mother", "sick", at(-60), 10), blk("mother", "maternity", BIRTH, 140),
                 blk("father", "paternity", at(20), 7),
                 mother=parent("self_employed"), father=parent("contract"))
    assert rows(found) == {
        ("e-ZLA (zwolnienie lekarskie)", "mother", "zus", None),
        ("ZAS-53", "mother", "zus", None),
        ("ZAM", "mother", "zus", None),
        ("ZAM", "father", "zus", at(19)),  # before the first day
        ("Z-3a", "father", "zus", None),
    }
    ezla = next(d for d in found if d.form.startswith("e-ZLA"))
    assert "kodem B" in ezla.note and ezla.note.startswith(f"Okres {at(-60).isoformat()}")


def test_maternity_handover_needs_both_applications_with_notice():
    found = docs(blk("mother", "maternity", BIRTH, 98), blk("father", "maternity", at(98), 42),
                 mother=parent(insured=30), father=parent(insured=30))
    assert ("Wniosek o pozostałą część urlopu macierzyńskiego", "father", "employer", at(98 - 14)) in rows(found)
    assert ("Wniosek o rezygnację z części urlopu macierzyńskiego", "mother", "employer", at(98 - 7)) in rows(found)
    assert not any(d.form.startswith("Z-3") for d in found)  # big employers pay themselves


def test_employee_sick_pay_needs_z3_only_past_the_employer_days():
    short = docs(blk("mother", "sick", at(-200), 20))
    assert not any(d.form.startswith("Z-3") for d in short)
    long = docs(blk("mother", "sick", at(-200), 40))
    z3 = next(d for d in long if d.form.startswith("Z-3"))
    assert "chorobowego" in z3.form and "ZAS-12" in z3.note


def test_part_time_supplementary_care_and_za_zyciem():
    found = docs(blk("mother", "maternity", BIRTH, 140), blk("mother", "supplementary", at(140), 14),
                 blk("father", "parental", at(200), 60, "0.5"), blk("father", "care", date(2028, 2, 1), 3),
                 za_zyciem=True)
    r = rows(found)
    assert ("Wniosek o uzupełniający urlop macierzyński", "mother", "employer", at(139 - 21)) in r
    assert ("Wniosek o łączenie urlopu rodzicielskiego z pracą", "father", "employer", at(200 - 21)) in r
    assert ("Z-15A", "father", "employer", None) in r  # employees file with the employer even when ZUS pays
    parental = next(d for d in found if d.form == "Wniosek o urlop rodzicielski")
    assert "Za życiem" in parental.note


def test_after_insurance_ends_zus_pays():
    found = docs(blk("mother", "job_loss_benefit", at(-60), 60), blk("mother", "maternity", BIRTH, 140),
                 mother=parent(insured=50, insured_until=at(-61)))
    r = rows(found)
    assert ("Wniosek o zasiłek w wysokości zasiłku macierzyńskiego", "mother", "zus", None) in r
    assert not any(d.recipient == "usc" for d in found)  # ZUS pays maternity too (art. 61 ust. 1 pkt 2 lit. d)


def test_uninsured_parent_and_vacation_get_no_benefit_paperwork():
    assert docs(blk("mother", "maternity", BIRTH, 140), blk("father", "vacation", BIRTH, 5),
                mother=parent("none")) == []
    no_voluntary = Parent(employment="contract", base_monthly=Decimal(4000))  # zlecenie without voluntary sickness
    assert docs(blk("father", "paternity", BIRTH, 14), father=no_voluntary) == []


def test_after_the_contract_ends_she_files_zam_with_zus_and_the_former_employer_sends_z3():
    found = docs(blk("mother", "maternity", BIRTH, 140), mother=parent(insured=40, insured_until=at(-60)))
    assert rows(found) == {("ZAM", "mother", "zus", None), ("Z-3", "mother", "zus", None)}
    assert next(d for d in found if d.form.startswith("Z-3")).note.startswith("Wystawia były pracodawca")
    assert (found[0].start, found[0].end) == (BIRTH, at(139))  # the period, for pre-filled forms


def test_plan_explains_the_payer():
    family = Family(mother=parent(insured=25), due_date=BIRTH)
    explain = compute_plan(Plan(family=family, blocks=[blk("mother", "maternity", BIRTH, 140)]), P).explain
    assert any("płatnik składek, bo zgłasza" in e.text and e.rule.startswith("art. 61") for e in explain)
