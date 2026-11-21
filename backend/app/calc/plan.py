"""Plan ledger: family facts + leave/benefit blocks -> money per month, care calendar, remaining pools.
Pure: Plan + Params in, PlanResult out. Legal validation is rules.py, documents paperwork.py."""
from calendar import monthrange
from collections import Counter
from datetime import date, timedelta
from decimal import Decimal

from app.calc.base import benefit_base, money, percent, pln
from app.calc.family import (
    adoption_age_limit,
    adoption_pools,
    event_date,
    maternity_end_after_death,
)
from app.params import Params
from app.schemas import (
    BaseRequest,
    Block,
    CalendarEntry,
    Explain,
    MonthRow,
    Parent,
    Plan,
    PlanResult,
    Pools,
)

ONE = Decimal(1)
WHO = {"mother": "Mama", "father": "Tata"}
KIND = {"sick": "Zwolnienie lekarskie", "rehab": "Świadczenie rehabilitacyjne",
        "job_loss_benefit": "Zasiłek po utracie pracy", "maternity": "Urlop macierzyński",
        "supplementary": "Uzupełniający urlop macierzyński", "paternity": "Urlop ojcowski",
        "parental": "Urlop rodzicielski", "care": "Zasiłek opiekuńczy", "vacation": "Urlop wypoczynkowy"}
RULE = {"maternity": "art. 31 ust. 1, 3", "supplementary": "art. 31 ust. 1", "paternity": "art. 31 ust. 1",
        "parental": "art. 31 ust. 2, 3, 3f", "sick": "art. 11 ust. 1–2", "rehab": "art. 19 ust. 1",
        "job_loss_benefit": "art. 30 ust. 3", "care": "art. 35", "vacation": "KP art. 172"}
MATERNITY_BENEFIT = {"maternity", "supplementary", "parental", "paternity"}  # zasiłek macierzyński (art. 29a)


def last_day(b: Block) -> date:
    return b.start + timedelta(days=b.days - 1)


def plus_years(d: date, n: int) -> date:
    try:
        return d.replace(year=d.year + n)
    except ValueError:  # 29 February
        return d.replace(year=d.year + n, day=28)


def month_range(first: date, last: date):
    y, m = first.year, first.month
    while (y, m) <= (last.year, last.month):
        yield y, m
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def sickness_insured(parent: Parent) -> bool:
    """Employees are insured by law; zlecenie and JDG only with voluntary sickness insurance (art. 1, art. 29)."""
    return parent.employment == "employee" or (parent.employment != "none" and parent.voluntary_sickness)


def parent_base(who: str, parent: Parent, first_event: date, p: Params, explain: list[Explain]) -> Decimal:
    if parent.employment == "none":
        explain.append(Explain(text=f"{WHO[who]}: brak tytułu do ubezpieczenia chorobowego, więc bez wynagrodzenia "
                                    f"i zasiłków.", rule="art. 1, art. 29 ust. 1"))
        return Decimal(0)
    if parent.base_monthly is not None:
        explain.append(Explain(text=f"{WHO[who]}: podstawa wymiaru zasiłku {pln(parent.base_monthly)} (podana).",
                               rule="art. 36, art. 48"))
        return parent.base_monthly
    if parent.gross_monthly_estimate is not None:
        if parent.employment != "employee":
            raise ValueError("Szybki szacunek z pensji brutto dotyczy umowy o pracę. Dla JDG lub zlecenia podaj "
                             "podstawę zasiłku albo historię podstaw składek.")
        # Reuse contribution deductions and the full-time floor; do not invent twelve pay-history rows.
        estimate = benefit_base(BaseRequest(employment=parent.employment, event_date=first_event,
                                           contract_monthly=parent.gross_monthly_estimate,
                                           full_time=parent.full_time), p).base
        explain.append(Explain(text=f"{WHO[who]}: orientacyjna podstawa {pln(estimate)} z jednej pensji brutto "
                                    f"{pln(parent.gross_monthly_estimate)}. To szacunek przy założeniu podobnego "
                                    "wynagrodzenia w okresie odniesienia, bez odtwarzania historii wypłat.",
                               rule="założenie szacunku; art. 36–38"))
        return estimate
    if not parent.salary_history:
        # case files rarely state every base: count 0 zł and let rules.py warn (base.missing) instead of failing
        explain.append(Explain(text=f"{WHO[who]}: brak podstawy wymiaru i wynagrodzeń, więc kwoty liczone jako 0 zł.",
                               rule="art. 36"))
        return Decimal(0)
    # shortcut: one base per parent for the whole plan, taken at the first benefit; art. 43 keeps it across
    # benefits without a 1-month break, but a longer break should recompute it
    result = benefit_base(BaseRequest(employment=parent.employment, event_date=first_event,
                                      months=parent.salary_history, full_time=parent.full_time), p)
    explain.append(Explain(text=f"{WHO[who]}: podstawa wymiaru zasiłku {pln(result.base)} z historii wynagrodzeń "
                                f"(pierwsze świadczenie od {first_event.isoformat()}).", rule="art. 36, art. 43"))
    return result.base


def day_map(plan: Plan) -> dict[str, dict[date, Block]]:
    """Day -> block per parent. Overlapping blocks of one parent are a rules.py error; the later start wins."""
    blocks = sorted(plan.blocks, key=lambda b: b.start)
    return {who: {b.start + timedelta(n): b for b in blocks if b.who == who for n in range(b.days)}
            for who in ("mother", "father")}


def pool_sizes(plan: Plan, p: Params) -> tuple[int, int]:
    """(maternity, parental) entitlement in days: by number of children and Za życiem (KP art. 180, 182^1a)."""
    f, pp, weeks = plan.family, p.parental, p.maternity.weeks_by_children
    multiple = f.children > 1
    parental = ((pp.weeks_za_zyciem_multiple if multiple else pp.weeks_za_zyciem_single) if f.za_zyciem
                else (pp.weeks_multiple if multiple else pp.weeks_single))
    maternity = weeks[min(f.children, len(weeks)) - 1] * 7
    if end := maternity_end_after_death(plan, p):  # the mother's days before the birth stay hers (KP art. 180 § 2)
        birth = event_date(plan)
        prebirth = sum(max(0, min(b.days, (birth - b.start).days)) for b in plan.blocks
                       if b.kind == "maternity" and b.who == "mother")
        maternity = min(maternity, prebirth + (end - birth).days + 1)
    return adoption_pools(plan, p, maternity, parental * 7)


def compute_plan(plan: Plan, p: Params, *, horizon: tuple[date, date] | None = None) -> PlanResult:
    family = plan.family
    birth = event_date(plan)
    parents = {"mother": family.mother} | ({"father": family.father} if family.father else {})
    if any(b.who not in parents for b in plan.blocks):
        raise ValueError("Plan zawiera okres taty, a rodzina nie ma drugiego rodzica.")
    blocks = sorted(plan.blocks, key=lambda b: b.start)
    explain: list[Explain] = []

    base = {who: parent_base(who, parent, min((b.start for b in blocks if b.who == who), default=birth), p, explain)
            for who, parent in parents.items()}
    days = {who: d for who, d in day_map(plan).items() if who in parents}
    applicant = family.adoption.applicant if family.adoption else "mother"
    other = "father" if applicant == "mother" else "mother"

    # The other parent's exclusive 9 weeks (counted from their first parental day) stay at 70% (art. 31 ust. 3f)
    father_exclusive: set[tuple[str, date]] = set()
    prior_other = (getattr(family.adoption, f"previous_parental_{other}_days") if family.adoption else 0)
    left = Decimal(max(0, p.parental.exclusive_weeks * 7 - prior_other))
    for d in sorted(days.get(other, {})):
        b = days[other][d]
        if b.kind == "parental" and left > 0:
            father_exclusive.add((other, d))
            left -= ONE - b.work_fraction

    averaged = plan.rate_variant == "averaged"
    year_one_end = plus_years(birth, 1)
    # art. 31 ust. 3g/4: without a single averaged-rate parental day in year 1, parental drops to 70%
    # and the maternity period gets a one-off top-up to 100%
    averaged_kept = averaged and any(b.kind == "parental" and birth <= d < year_one_end and (who, d) not in father_exclusive
                                     for who in days for d, b in days[who].items())

    def rate(who: str, b: Block, d: date, rehab_day: int) -> Decimal:
        r = p.rates
        match b.kind:
            # shortcut: the 81.5% variant covers the mother's maternity; a father taking over maternity
            # leave gets 100% (his own application) - confirm against the samples
            case "maternity":
                return r.averaged if averaged and who == applicant else r.maternity
            case "parental":
                return r.averaged if averaged_kept and (who, d) not in father_exclusive else r.parental
            case "sick":
                return r.sick_pregnancy if not family.adoption and d < birth else r.sick
            case "rehab":
                # shortcut: no quarterly indexation of the base (art. 19 ust. 2), needs ZUS-published indices
                if not family.adoption and d < birth:
                    return r.rehab_pregnancy
                return r.rehab_first_period if rehab_day <= p.rehab.first_period_days else r.rehab
            case "supplementary":
                return r.supplementary
            case "paternity":
                return r.paternity
            case "job_loss_benefit":
                return r.job_loss
            case _:
                return r.care

    floor_day = money(p.parental_benefit_floor / 30)
    adoption_entitled = not family.adoption or pool_sizes(plan, p) != (0, 0)
    adoption_limit = adoption_age_limit(plan, p)
    amount: dict[str, dict[date, Decimal]] = {}
    block_benefit: dict[int, Decimal] = {}  # id(block) -> benefit paid for it (what a ZUS decision shows)
    for who in parents:
        amount[who], rehab_day, seen = {}, 0, {}
        for d in sorted(days[who]):
            b = days[who][d]
            if b.kind == "vacation" or not sickness_insured(parents[who]):  # paid leave / no sickness insurance
                continue
            if family.adoption and b.kind in MATERNITY_BENEFIT:
                if not adoption_entitled or d < birth:
                    continue
                a = family.adoption
                if b.kind == "paternity" and (a.kind != "adoption" or a.court_final_on is None
                        or d < a.court_final_on or d >= plus_years(a.court_final_on, 1)
                        or (adoption_limit and d >= adoption_limit)):
                    continue
                if b.kind == "parental" and adoption_limit and d >= adoption_limit:
                    continue
            rehab_day += b.kind == "rehab"
            r = rate(who, b, d, rehab_day)
            daily = money(base[who] * r / 30)  # art. 36 ust. 3: one day = 1/30 of the monthly base
            # art. 31 ust. 3a floor for insured parents; shortcut: not applied on part-time days (art. 31 ust. 4a)
            if b.kind in MATERNITY_BENEFIT - {"paternity"} and base[who] > 0 and not b.work_fraction:
                daily = max(daily, floor_day)
            amount[who][d] = money(daily * (ONE - b.work_fraction))
            seen.setdefault(id(b), (b, Counter()))[1][(r, amount[who][d])] += 1
        for key, (b, rates) in seen.items():
            block_benefit[key] = sum((a * n for (_, a), n in rates.items()), Decimal(0))
            paid = ", ".join(f"{percent(r)} podstawy: {n} dni × {pln(a)}" for (r, a), n in rates.items())
            part = f", praca {percent(b.work_fraction)} etatu" if b.work_fraction else ""
            explain.append(Explain(text=f"{WHO[who]}: {KIND[b.kind]} {b.start.isoformat()} – {last_day(b).isoformat()}"
                                        f"{part}: {paid}.", rule=RULE[b.kind]))
        explain.extend(_sick_payer(who, parents[who], days[who], p))
        if base[who] > 0 and amount[who]:
            explain.append(_payer_explain(who, parents[who], p))

    if averaged:
        explain.append(Explain(
            text="Wariant uśredniony: 81,5% za macierzyński i rodzicielski, ale wyłączne 9 tygodni drugiego rodzica 70%."
            if averaged_kept else
            "Wariant uśredniony bez ani jednego dnia rodzicielskiego w pierwszym roku dziecka: rodzicielski 70%.",
            rule="art. 31 ust. 3, 3f" if averaged_kept else "art. 31 ust. 3g"))
    top_up = Decimal(0)
    if averaged and not averaged_kept and base.get(applicant, Decimal(0)) > 0:
        # Compare with what was actually computed, including the floor; never top up unpaid/invalid days.
        standard_day = max(money(base[applicant] * p.rates.maternity / 30), floor_day)
        top_up = money(sum((max(Decimal(0), standard_day - amount[applicant][d])
                            for d, b in days[applicant].items()
                            if b.kind == "maternity" and d in amount[applicant]), Decimal(0)))
        explain.append(Explain(text=f"Jednorazowe wyrównanie macierzyńskiego do 100% (na wniosek), po uwzględnieniu "
                                    f"wyliczonego podwyższenia: {pln(top_up)}.", rule="art. 31 ust. 4"))

    target = money(p.game.budget_target_ratio * sum(base.values()))
    explain.append(Explain(text=f"Cel budżetu: {percent(p.game.budget_target_ratio)} dochodu rodziny bez urlopów, "
                                f"czyli {pln(target)} miesięcznie. Wynagrodzenie to podstawa wymiaru (po składkach, "
                                f"przed PIT), proporcjonalnie do dni bez urlopu.", rule="założenie kalkulatora"))

    all_days = [d for who in days for d in days[who]] + [birth]
    months = []
    # A game compares every alternative over the same horizon, including months spent working.
    first, last = horizon if horizon is not None else (min(all_days), max(all_days))
    for y, m in month_range(first, last):
        n = monthrange(y, m)[1]
        salary, benefit = {}, {}
        for who in parents:
            present = Decimal(0)
            for day in range(1, n + 1):
                b = days[who].get(date(y, m, day))
                present += ONE if b is None or b.kind == "vacation" else b.work_fraction
            # shortcut: salary prorated by calendar days; payroll's 1/30-per-absence rule differs in partial months
            salary[who] = money(base[who] * present / n)
            benefit[who] = sum((a for d, a in amount[who].items() if (d.year, d.month) == (y, m)), Decimal(0))
        total = sum(salary.values()) + sum(benefit.values())
        months.append(MonthRow(month=f"{y:04d}-{m:02d}", salary=salary, benefit=benefit, total=total,
                               below_target=total < target))

    calendar = [CalendarEntry(who=b.who, kind=b.kind, start=b.start, end=last_day(b),
                              benefit=block_benefit.get(id(b), Decimal(0))) for b in blocks]
    return PlanResult(months=months, calendar=calendar, pools=_pools(plan, days, p), documents=[], issues=[],
                      explain=explain, top_up=top_up, bases=base)


def payer(parent: Parent, p: Params) -> str:
    """Who sets and pays the benefits (art. 61 ust. 1): a payer reporting more than 20 people to sickness insurance
    (employer or contracting party), otherwise ZUS; always ZUS for JDG."""
    big = parent.employment in ("employee", "contract") and parent.payer_insured_count > p.payer_threshold_insured
    return "employer" if big else "zus"


def _payer_explain(who: str, parent: Parent, p: Params) -> Explain:
    n = p.payer_threshold_insured
    if payer(parent, p) == "employer":
        why = f"płatnik składek, bo zgłasza do ubezpieczenia chorobowego ponad {n} osób"
    elif parent.employment == "self_employed":
        why = "ZUS (działalność gospodarcza)"
    else:
        why = f"ZUS, bo płatnik składek zgłasza do ubezpieczenia chorobowego najwyżej {n} osób"
    return Explain(text=f"{WHO[who]}: zasiłki ustala i wypłaca {why}.", rule="art. 61 ust. 1–2")


def _sick_payer(who: str, parent: Parent, days: dict[date, Block], p: Params) -> list[Explain]:
    """Sick days: an employee gets sick pay from the employer first (33 days a year, 14 from age 50), then the
    sickness benefit. Same amount either way; who pays the benefit is art. 61 (`payer`)."""
    if parent.employment != "employee":
        sick = sum(1 for b in days.values() if b.kind == "sick")
        return [Explain(text=f"{WHO[who]}: zasiłek chorobowy od pierwszego dnia ({sick} dni).",
                        rule="art. 12 ust. 1")] if sick else []
    limit = p.sick.employer_days_50plus if parent.age >= 50 else p.sick.employer_days
    # shortcut: assumes no sick days earlier in the same calendar year outside this plan
    per_year = Counter(d.year for d, b in days.items() if b.kind == "sick")
    return [Explain(text=f"{WHO[who]}: w {y} r. {min(n, limit)} dni wynagrodzenia chorobowego od pracodawcy, "
                         f"{max(0, n - limit)} dni zasiłku chorobowego (ta sama kwota).", rule="KP art. 92, art. 12")
            for y, n in sorted(per_year.items())]


def _pools(plan: Plan, days: dict[str, dict[date, Block]], p: Params) -> Pools:
    def used(kind: str, whos) -> Decimal:  # part-time days use (1 - work_fraction) of a day (KP art. 182^1f)
        return sum((ONE - b.work_fraction for w in whos for b in days.get(w, {}).values() if b.kind == kind),
                   Decimal(0))

    maternity, parental = pool_sizes(plan, p)
    pp = p.parental
    care_per_year = Counter(d.year for w in days for d, b in days[w].items() if b.kind == "care")
    prior = ({"mother": plan.family.adoption.previous_parental_mother_days,
              "father": plan.family.adoption.previous_parental_father_days} if plan.family.adoption else {})
    return Pools(
        maternity_days_left=int(maternity - used("maternity", days)),
        parental_days_left=int(parental - used("parental", days)),
        exclusive_days_left={w: int(max(Decimal(0), pp.exclusive_weeks * 7 - used("parental", [w]) - prior.get(w, 0)))
                             for w in days},
        paternity_days_left=int(p.paternity.days - used("paternity", ["father"])),
        parental_parts_used=sum(1 for b in plan.blocks if b.kind == "parental"),
        care_days_left=p.care.days_per_year_child_under_14 - max(care_per_year.values(), default=0),
    )
