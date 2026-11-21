"""Paperwork: what each parent files, with whom and by when. Pure: Plan + Params in, documents out.

Sources: who pays (ustawa art. 61), the 2026 regulation on documents for benefits ("rozp. dok."), the regulation on
leave applications ("rozp. wn."), notice periods from the Labour Code and the brief's form names. ZUR, ZAO and Z-3b
were merged into ZAM or abolished on 2026-10-24. Employees apply to their employer; when ZUS pays, the employer adds a
Z-3. Everyone else sends ZAM to whoever pays, and a contracting party that doesn't pay adds a Z-3a."""
from collections import Counter
from datetime import date, timedelta
from functools import partial

from app.calc.base import percent
from app.calc.plan import MATERNITY_BENEFIT, last_day, payer
from app.params import Params
from app.schemas import Block, Document, Parent, Plan

BENEFIT = {"sick": "zasiłku chorobowego", "rehab": "świadczenia rehabilitacyjnego", "care": "zasiłku opiekuńczego"} | {
    k: "zasiłku macierzyńskiego" for k in MATERNITY_BENEFIT}
FROM_REGISTRY = " ZUS sam pobierze akt urodzenia z rejestru: wystarczą dane dziecka (imię, nazwisko, PESEL)."
DAY = timedelta(days=1)


def documents(plan: Plan, p: Params) -> list[Document]:
    f = plan.family
    birth = f.birth_date or f.due_date
    parents = {"mother": f.mother} | ({"father": f.father} if f.father else {})
    blocks = sorted((b for b in plan.blocks if b.who in parents), key=lambda b: b.start)
    maternity_end = max((last_day(b) for b in blocks if b.kind == "maternity"), default=None)
    found: dict[tuple, tuple[date, Document]] = {}

    def add(who: str, form: str, recipient: str, rule: str, note: str = "", due: date | None = None,
            order: date | None = None) -> None:
        doc = Document(form=form, who=who, recipient=recipient, due_by=due, rule=rule, note=note.strip())
        found.setdefault((form, who, recipient, due, note), (due or order or birth, doc))

    for b in blocks:
        parent = parents[b.who]
        if parent.employment == "none" or b.kind == "vacation":
            continue  # no insurance means no benefit (rules.py flags it); paid leave needs no benefit paperwork
        _block(b, parent, parents, plan, p, birth, maternity_end, partial(add, order=b.start))

    mother = parents["mother"]
    if plan.rate_variant == "averaged" and mother.employment != "none":
        employee = mother.employment == "employee"
        add("mother", "Wniosek o zasiłek macierzyński w wysokości 81,5%", "employer" if employee else payer(mother, p),
            "art. 30a ust. 1", "Wniosek pisemny; obejmuje macierzyński i cały rodzicielski poza 9 tygodniami taty."
            + ("" if employee else " Zaznacz tę opcję we wniosku ZAM."),
            due=birth + timedelta(days=p.deadlines.averaged_request_days_after_birth))

    # an employer that pays a maternity-type benefit needs the birth certificate; ZUS fetches it (rozp. dok. § 13 ust. 2)
    by_employer = [b.who for b in blocks if b.kind in MATERNITY_BENEFIT and parents[b.who].employment != "none"
                   and _pays(b, parents[b.who], p) == "employer"]
    if by_employer:
        add(by_employer[0], "Odpis skrócony aktu urodzenia", "usc", "rozp. dok. § 13 ust. 1 pkt 2; rozp. wn. § 22",
            "Zamów w USC po zgłoszeniu urodzenia; pracodawca, który wypłaca zasiłek, potrzebuje go do wniosku "
            "(chyba że ma go już w aktach osobowych).", order=birth)
    return [doc for _, doc in sorted(found.values(), key=lambda x: x[0])]


def _pays(b: Block, parent: Parent, p: Params) -> str:
    """Payer for one period: ZUS after the insurance ended (art. 61 ust. 1 pkt 2 lit. d), otherwise `payer`."""
    ended = b.kind == "job_loss_benefit" or (parent.insured_until is not None and b.start > parent.insured_until)
    return "zus" if ended else payer(parent, p)


def _block(b: Block, parent: Parent, parents: dict[str, Parent], plan: Plan, p: Params, birth: date,
           maternity_end: date | None, add) -> None:
    who, kind = b.who, b.kind
    employee, jdg = parent.employment == "employee", parent.employment == "self_employed"
    pays = _pays(b, parent, p)
    registry = FROM_REGISTRY if pays == "zus" and kind in MATERNITY_BENEFIT else ""
    period = f"Okres {b.start.isoformat()} – {last_day(b).isoformat()}. "

    if kind == "sick":
        add(who, "e-ZLA (zwolnienie lekarskie)", "zus", "rozp. dok. § 2",
            period + "Wystawia lekarz i wysyła elektronicznie do ZUS i płatnika, nic nie zanosisz."
            + (" W ciąży z kodem B, wtedy zasiłek wynosi 100%." if who == "mother" and b.start < birth else ""))
        if jdg:
            add(who, "ZAS-53: wniosek o zasiłek chorobowy", "zus", "rozp. dok. § 2, zał. 1", period.strip())
    elif kind == "rehab":
        add(who, "ZNp-7: wniosek o świadczenie rehabilitacyjne", "zus", "rozp. dok. § 11 ust. 1",
            "Dołącz zaświadczenie lekarza prowadzącego o stanie zdrowia (wystawione najwyżej miesiąc przed wnioskiem)"
            + ("." if jdg else " i wywiad zawodowy z miejsca pracy."))
    elif kind == "job_loss_benefit":
        add(who, "Wniosek o zasiłek w wysokości zasiłku macierzyńskiego", "zus", "art. 30 ust. 3; rozp. dok. § 17",
            "Dołącz zaświadczenie lekarskie o ciąży w czasie zatrudnienia, świadectwo pracy z przyczyną (upadłość, "
            "likwidacja lub śmierć pracodawcy) i oświadczenie, że nie zapewniono Ci innego zatrudnienia.")
    elif kind == "care":
        # an employee files with the employer even when ZUS pays (the employer forwards it)
        add(who, "Z-15A: wniosek o zasiłek opiekuńczy", "employer" if employee else pays, "rozp. dok. § 34, § 36, zał. 7",
            period + "Dołącz e-ZLA na opiekę nad dzieckiem od lekarza albo dokument zdarzenia (np. oświadczenie o "
            "nieprzewidzianym zamknięciu żłobka). Za ten sam dzień zasiłek dostaje tylko jeden rodzic.")
    elif kind == "maternity" and who == "mother":
        if not employee:
            add(who, "ZAM: wniosek o zasiłek macierzyński", pays, "rozp. dok. § 12, § 13, zał. 6",
                ("Za okres przed porodem dołącz zaświadczenie lekarskie o przewidywanej dacie porodu."
                 if b.start < birth else "") + registry)
        elif b.start < birth:
            add(who, "Wniosek o część urlopu macierzyńskiego przed porodem", "employer", "KP art. 180 § 2; rozp. wn. § 2",
                "Dołącz zaświadczenie lekarskie o przewidywanej dacie porodu.", due=b.start)
        else:
            add(who, "Wniosek o urlop macierzyński", "employer", "KP art. 180 § 1; rozp. dok. § 13",
                "Jeśli rodzicielski zaczyna się zaraz po nim, wystarczy jeden wniosek o oba urlopy.")
    elif kind == "maternity":  # the father takes over the rest of maternity leave (KP art. 180 § 4)
        if employee:
            add(who, "Wniosek o pozostałą część urlopu macierzyńskiego", "employer", "KP art. 180 § 9; rozp. wn. § 5",
                "Dołącz odpis skrócony aktu urodzenia i oświadczenie mamy o rezygnacji z pozostałej części urlopu.",
                due=b.start - timedelta(days=p.deadlines.maternity_takeover_notice_days))
        else:
            add(who, "ZAM: wniosek o zasiłek macierzyński", pays, "rozp. dok. § 20 ust. 1",
                "Dołącz zaświadczenie płatnika zasiłku mamy o okresie i stawce wypłaconego jej zasiłku." + registry)
        mother = parents["mother"]
        if mother.employment == "employee":
            add("mother", "Wniosek o rezygnację z części urlopu macierzyńskiego", "employer",
                "KP art. 180 § 8; rozp. wn. § 3", "Dołącz kopię wniosku taty o pozostałą część urlopu.",
                due=b.start - timedelta(days=p.deadlines.maternity_resign_notice_days))
        elif mother.employment != "none":
            add("mother", "Wniosek o rezygnację z zasiłku macierzyńskiego", payer(mother, p),
                "rozp. dok. § 18 ust. 1 pkt 3", f"Podaj datę rezygnacji: {b.start.isoformat()}.")
    elif kind == "supplementary":
        if employee:
            due = maternity_end and maternity_end - timedelta(days=p.deadlines.supplementary_notice_days_before_maternity_end)
            add(who, "Wniosek o uzupełniający urlop macierzyński", "employer", "KP art. 180^2 § 4–5; rozp. wn. § 14",
                "Dołącz zaświadczenie ze szpitala o pobycie dziecka.", due=due)
        else:
            add(who, "ZAM: wniosek o zasiłek za uzupełniający urlop macierzyński", pays, "rozp. dok. § 26",
                "Złóż przed końcem zasiłku za urlop macierzyński. Dołącz zaświadczenie ze szpitala i oświadczenie, że "
                "drugi rodzic nie skorzysta z tego okresu." + registry, due=maternity_end)
    elif kind == "paternity":
        if employee:
            add(who, "Wniosek o urlop ojcowski", "employer", "KP art. 182^3 § 2; rozp. wn. § 17",
                "Dołącz odpis skrócony aktu urodzenia (jeśli nie ma go w aktach osobowych) i oświadczenie o wcześniej "
                "wykorzystanym urlopie ojcowskim.", due=b.start - timedelta(days=p.paternity.notice_days))
        else:
            add(who, "ZAM: wniosek o zasiłek za urlop ojcowski", pays, "rozp. dok. § 33 ust. 1",
                "Złóż przed pierwszym dniem; dołącz oświadczenie, czy zasiłek za ten okres był pobrany z innego tytułu."
                + registry, due=b.start - DAY)
    elif kind == "parental":
        za_zyciem = " Dołącz zaświadczenie „Za życiem”." if plan.family.za_zyciem else ""
        if employee:
            add(who, "Wniosek o urlop rodzicielski", "employer", "KP art. 182^1d § 1; rozp. wn. § 15",
                "Podaj dotąd wykorzystane części i okresy urlopu drugiego rodzica." + za_zyciem,
                due=b.start - timedelta(days=p.deadlines.parental_notice_days))
            if b.work_fraction:
                add(who, "Wniosek o łączenie urlopu rodzicielskiego z pracą", "employer",
                    "KP art. 182^1e § 2; rozp. wn. § 16",
                    f"Praca na {percent(b.work_fraction)} etatu; urlop wydłuża się proporcjonalnie.",
                    due=b.start - timedelta(days=p.deadlines.part_time_notice_days))
        else:
            add(who, "ZAM: wniosek o zasiłek za urlop rodzicielski", pays, "rozp. dok. § 29 pkt 3, § 30 ust. 1 pkt 4",
                "Złóż przed pierwszym dniem; podaj liczbę dotąd wypłaconych części i ich stawkę." + za_zyciem + registry,
                due=b.start - DAY)

    # payer certificate: when ZUS pays, the employer (Z-3) or contracting party (Z-3a) certifies pay and periods
    if pays == "zus" and not jdg and kind != "job_loss_benefit" and (kind != "sick" or _zus_sick(b, parent, plan, p)):
        form, issuer = ("Z-3", "pracodawca") if employee else ("Z-3a", "zleceniodawca")
        add(who, f"{form}: zaświadczenie płatnika składek do {BENEFIT[kind]}", "zus",
            f"art. 61 ust. 3; rozp. dok. § 3 ust. 1 pkt {1 if employee else 2}",
            f"Wystawia {issuer} (zgłasza najwyżej {p.payer_threshold_insured} osób) i wysyła do ZUS."
            + (" Na kolejne zwolnienia wystarczy ZAS-12." if employee and kind == "sick" else "") + registry)


def _zus_sick(b: Block, parent: Parent, plan: Plan, p: Params) -> bool:
    """An employee's sick days go past the employer-paid days in some year, so a sickness benefit is due."""
    if parent.employment != "employee":
        return True
    limit = p.sick.employer_days_50plus if parent.age >= 50 else p.sick.employer_days
    # shortcut: like plan.py, assumes no sick days earlier in the same calendar year outside this plan
    per_year = Counter((x.start + timedelta(days=n)).year for x in plan.blocks
                       if x.who == b.who and x.kind == "sick" for n in range(x.days))
    return any(n > limit for n in per_year.values())
