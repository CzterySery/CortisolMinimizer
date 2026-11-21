"""Legal validation of a plan: Plan + its PlanResult + Params -> issues. Pure.

Issue codes start with the matching rule id in shared/legal-rules.json (e.g. "paternity.too-late"), so the UI can
link an issue to its evidence. "error" = not allowed (makes a game card unplayable), "warning" = allowed but risky
or late, "info" = not checked. Each code is reported once, for its first occurrence."""
from datetime import date, timedelta
from decimal import Decimal
from itertools import pairwise
from math import ceil

from app.calc.base import pln
from app.calc.plan import KIND, MATERNITY_BENEFIT, ONE, WHO, day_map, last_day, pool_sizes
from app.params import Params
from app.schemas import Block, Issue, Plan, PlanResult

BENEFITS = set(KIND) - {"vacation"}
# periods that need a born child, with the rule id they report under
AFTER_BIRTH = {"care": ("care-right", "art. 32 ust. 1"), "parental": ("parental-pool", "KP art. 182^1a § 1"),
               "paternity": ("paternity", "KP art. 182^3 § 1"), "supplementary": ("supplementary", "KP art. 180^2 § 1")}


def plus_months(d: date, n: int) -> date:
    y, m = divmod(d.month - 1 + n, 12)
    year, month = d.year + y, m + 1
    for day in (d.day, 30, 29, 28):
        try:
            return date(year, month, day)
        except ValueError:
            continue
    raise AssertionError("unreachable")


def check(plan: Plan, result: PlanResult, p: Params) -> list[Issue]:
    f = plan.family
    birth = f.birth_date or f.due_date
    parents = {"mother": f.mother} | ({"father": f.father} if f.father else {})
    days = day_map(plan)
    issues: dict[str, Issue] = {}

    def add(code: str, severity: str, text: str, rule: str) -> None:
        issues.setdefault(code, Issue(code=code, severity=severity, text=text, rule=rule))

    def span(b: Block) -> str:
        return f"{WHO[b.who]}, {KIND[b.kind].lower()} {b.start.isoformat()} – {last_day(b).isoformat()}"

    if f.adoption:
        add("adoption.not-checked", "info", "Przyjęcie dziecka: kwoty i wymiary są liczone jak przy urodzeniu, ale wiek "
            "dziecka i terminy właściwe dla adopcji i pieczy nie są jeszcze sprawdzane.", "KP art. 183")

    # --- one parent, one thing at a time; who may take what ---
    for who in parents:
        own = sorted((b for b in plan.blocks if b.who == who), key=lambda b: b.start)
        for a, b in pairwise(own):
            if b.start <= last_day(a):
                add("plan.overlap", "error", f"Okresy nachodzą na siebie: {span(a)} oraz {span(b)}.",
                    "jeden rodzic, jedno świadczenie naraz")
    for b in plan.blocks:
        if b.kind == "paternity" and b.who != "father":
            add("paternity.father-only", "error", "Urlop ojcowski przysługuje tylko ojcu dziecka.", "KP art. 182^3 § 1")
        if b.kind == "job_loss_benefit":
            if b.who != "mother" or parents[b.who].employment != "employee":
                add("job-loss-before.who", "error", "Zasiłek w wysokości macierzyńskiego po likwidacji pracodawcy "
                    "przysługuje pracownicy w ciąży.", "art. 30 ust. 3")
            if last_day(b) >= birth:
                add("job-loss-before.after-birth", "error", f"{span(b)}: ten zasiłek przysługuje tylko do dnia porodu.",
                    "art. 30 ust. 3")
        if b.kind in AFTER_BIRTH and b.start < birth:
            rule_id, rule = AFTER_BIRTH[b.kind]
            add(f"{rule_id}.before-birth", "error", f"{span(b)}: ten okres może zacząć się dopiero po narodzinach "
                "dziecka.", rule)

    # --- insurance: no title or no sickness insurance means no benefits (art. 2a, 4, 29); risks from brief part H ---
    pregnancy = f.due_date - timedelta(weeks=p.maternity.pregnancy_weeks)
    for who, parent in parents.items():
        taken = sorted((b for b in plan.blocks if b.who == who and b.kind in BENEFITS), key=lambda b: b.start)
        if not taken:
            continue
        since, until = parent.insured_since, parent.insured_until
        if since and taken[0].start < since:
            add("insured-parent.not-yet-insured", "error", f"{span(taken[0])}: zaczyna się przed początkiem "
                f"ubezpieczenia ({since.isoformat()}).", "art. 29 ust. 1")
        if since and pregnancy < since <= birth:
            add("insured-parent.started-in-pregnancy", "warning", f"{WHO[who]}: ubezpieczenie zaczęło się w czasie "
                f"ciąży ({since.isoformat()}). ZUS może sprawdzić, czy umowa lub działalność nie jest pozorna; wtedy "
                "stwierdzi niepodleganie ubezpieczeniu i zasiłki nie przysługują.", "zadanie ZUS, cz. H pkt 1")
        in_pregnancy = [m for m in parent.salary_history if f"{pregnancy:%Y-%m}" <= m.month <= f"{birth:%Y-%m}"]
        before = [m.gross for m in parent.salary_history if m.month < f"{pregnancy:%Y-%m}"]
        raised = [m for m in in_pregnancy if before and m.gross > max(before)]
        if raised:
            add("base.raised-in-pregnancy", "warning", f"{WHO[who]}: w czasie ciąży wynagrodzenie (podstawa składek) "
                f"wzrosło ({raised[0].month}: {pln(raised[0].gross)}). ZUS może sprawdzić, czy podwyżka nie miała "
                "tylko podnieść zasiłku, i ustalić niższą podstawę.", "zadanie ZUS, cz. H pkt 2")
        # shortcut: only the birth date is checked; benefits after an insurance that ended later (and the
        # father's) need the art. 7 / art. 29 exceptions modelled first
        maternity_type = any(b.kind in MATERNITY_BENEFIT for b in taken)
        job_loss = any(b.kind == "job_loss_benefit" for b in taken)  # art. 30 ust. 1 pkt 1 covers that case
        if who == "mother" and until and until < birth and maternity_type and not job_loss:
            if parent.employment == "employee":
                add("insured-parent.ends-before-birth", "warning", f"Mama: umowa kończy się {until.isoformat()}, "
                    "przed porodem. Umowa na czas określony lub na okres próbny dłuższy niż miesiąc, która skończyłaby "
                    "się po 3. miesiącu ciąży, przedłuża się do dnia porodu i zasiłek macierzyński przysługuje; po innym "
                    "rozwiązaniu umowy bez ubezpieczenia w dniu porodu zasiłku nie ma.",
                    "KP art. 177 § 3; art. 30 ust. 4; art. 29 ust. 1")
            elif parent.employment != "none":
                add("insured-parent.ends-before-birth", "error", f"Mama: ubezpieczenie kończy się {until.isoformat()}, "
                    "przed porodem, więc zasiłek macierzyński nie przysługuje. Nie kończ umowy ani działalności i nie "
                    "wyrejestrowuj się z ubezpieczenia chorobowego przed porodem.", "art. 29 ust. 1")
        if parent.employment == "none":
            add("insured-parent.not-insured", "error", f"{WHO[who]} nie ma tytułu do ubezpieczenia chorobowego, więc "
                "zasiłki nie przysługują.", "art. 29 ust. 1")
        elif parent.employment != "employee" and not parent.voluntary_sickness:
            add("insured-parent.no-voluntary-sickness", "error", f"{WHO[who]}: przy umowie zlecenia i działalności "
                "zasiłki przysługują tylko z dobrowolnym ubezpieczeniem chorobowym.", "art. 1, art. 29 ust. 1")
        if parent.employment == "self_employed" and parent.contribution_debt > p.debt_threshold_pct_min_wage * p.min_wage:
            add("debt.blocks-benefits", "error", f"{WHO[who]}: zadłużenie składkowe powyżej 1% płacy minimalnej "
                "blokuje zasiłki do czasu spłaty.", "art. 2a")
        sick = [b for b in taken if b.kind == "sick"]
        if sick and parent.insured_since:
            wait = p.sick.waiting_days_mandatory if parent.employment == "employee" else p.sick.waiting_days_voluntary
            if sick[0].start < parent.insured_since + timedelta(days=wait):
                add("sick-right.waiting-period", "error", f"{span(sick[0])}: zasiłek chorobowy przysługuje po {wait} "
                    "dniach nieprzerwanego ubezpieczenia.", "art. 4 ust. 1")

    # --- pools (KP art. 180, 182^1a, 182^3; ustawa art. 32) ---
    pools = result.pools
    if pools.maternity_days_left < 0:
        add("maternity-pool.exceeded", "error", f"Przekroczony wymiar urlopu macierzyńskiego o "
            f"{-pools.maternity_days_left} dni.", "KP art. 180 § 1")
    if pools.parental_days_left < 0:
        add("parental-pool.exceeded", "error", f"Przekroczony wymiar urlopu rodzicielskiego o "
            f"{-pools.parental_days_left} dni (urlop obojga rodziców naraz liczy się podwójnie).",
            "KP art. 182^1a § 1–2, 6")
    if pools.paternity_days_left < 0:
        add("paternity.exceeded", "error", "Urlop ojcowski trwa najwyżej 2 tygodnie.", "KP art. 182^3 § 1")
    if pools.care_days_left < 0:
        add("care-money.limit", "error", f"Przekroczony roczny limit zasiłku opiekuńczego o {-pools.care_days_left} "
            "dni (limit jest wspólny dla rodziców).", "art. 32 ust. 2")

    # --- maternity (KP art. 180) ---
    mother_maternity = sorted(d for d, b in days["mother"].items() if b.kind == "maternity")
    if len([d for d in mother_maternity if d < birth]) > p.maternity.prebirth_max_weeks * 7:
        add("prebirth.too-early", "error", f"Przed porodem można wykorzystać najwyżej {p.maternity.prebirth_max_weeks} "
            "tygodni urlopu macierzyńskiego.", "KP art. 180 § 2")
    if mother_maternity and not f.adoption:
        if mother_maternity[0] > birth:
            add("maternity-pool.starts-after-birth", "error", "Urlop macierzyński zaczyna się najpóźniej w dniu porodu.",
                "KP art. 183^1 § 2")
        if len(mother_maternity) != (mother_maternity[-1] - mother_maternity[0]).days + 1:
            add("maternity-pool.not-continuous", "error", "Urlop macierzyński mamy musi być ciągły.", "KP art. 180 § 3")
    father_maternity = sorted(d for d, b in days["father"].items() if b.kind == "maternity")
    if father_maternity:
        after_birth = [d for d in mother_maternity if birth <= d < father_maternity[0]]
        if len(after_birth) < p.maternity.mother_personal_weeks * 7:
            add("transfer.before-14-weeks", "error", f"Tata może przejąć macierzyński dopiero po "
                f"{p.maternity.mother_personal_weeks} tygodniach wykorzystanych przez mamę po porodzie (wyjątki: "
                "orzeczenie o niezdolności, pobyt w szpitalu, zgon).", "KP art. 180 § 4–5, art. 29 ust. 3")
        if mother_maternity and father_maternity[0] != mother_maternity[-1] + timedelta(days=1):
            add("transfer.not-continuous", "error", "Tata przejmuje pozostałą część macierzyńskiego bezpośrednio po "
                "rezygnacji mamy.", "KP art. 180 § 4")

    # --- supplementary maternity leave (KP art. 180^2) ---
    supplementary = [b for b in plan.blocks if b.kind == "supplementary"]
    if supplementary:
        b = supplementary[0]
        if len(supplementary) > 1:
            add("supplementary.one-block", "error", "Uzupełniający urlop macierzyński udziela się jednorazowo, jednemu "
                "rodzicowi.", "KP art. 180^2 § 4")
        maternity_end = max((d for w in days for d, x in days[w].items() if x.kind == "maternity"), default=None)
        if maternity_end is None or b.start != maternity_end + timedelta(days=1):
            add("supplementary.not-after-maternity", "error", f"{span(b)}: zaczyna się bezpośrednio po urlopie "
                "macierzyńskim.", "KP art. 180^2 § 1")
        allowed = supplementary_weeks(plan, p)
        if allowed is None:
            add("supplementary.no-hospitalization", "error", "Uzupełniający urlop wymaga danych o porodzie i pobycie "
                "dziecka w szpitalu (tydzień ciąży, masa urodzeniowa, dni w szpitalu).", "KP art. 180^2 § 1")
        elif sum(x.days for x in supplementary) > allowed * 7:
            add("supplementary.too-long", "error", f"Przysługuje {allowed} tyg. uzupełniającego urlopu (tydzień za "
                "każdy rozpoczęty tydzień pobytu w szpitalu).", "KP art. 180^2 § 1, 3")

    # --- paternity (KP art. 182^3) ---
    paternity = sorted((b for b in plan.blocks if b.kind == "paternity" and b.who == "father"), key=lambda b: b.start)
    if len(paternity) > p.paternity.max_parts:
        add("paternity.parts", "error", f"Urlop ojcowski można podzielić najwyżej na {p.paternity.max_parts} części.",
            "KP art. 182^3 § 1^1")
    for b in paternity:
        if b.days < p.paternity.min_part_days:
            add("paternity.part-too-short", "error", f"{span(b)}: część urlopu ojcowskiego trwa co najmniej tydzień.",
                "KP art. 182^3 § 1^1")
        if last_day(b) >= plus_months(birth, p.paternity.use_by_child_months):
            add("paternity.too-late", "error", f"{span(b)}: urlop ojcowski trzeba wykorzystać, zanim dziecko skończy "
                f"{p.paternity.use_by_child_months} miesięcy.", "KP art. 182^3 § 1")

    # --- parental (KP art. 182^1a–182^1f) ---
    _, parental_total = pool_sizes(plan, p)
    parental = [b for b in plan.blocks if b.kind == "parental"]
    if len(parental) > p.parental.max_parts:
        add("parental-parts.too-many", "error", f"Urlop rodzicielski można wziąć najwyżej w {p.parental.max_parts} "
            "częściach (liczą się wnioski obojga rodziców).", "KP art. 182^1c, 182^1d § 2")
    deadline = date(birth.year + p.parental.last_child_age_years, 12, 31)
    if any(last_day(b) > deadline for b in parental):
        add("parental-pool.too-late", "error", f"Urlop rodzicielski trzeba wykorzystać do {deadline.isoformat()} (koniec "
            f"roku, w którym dziecko kończy {p.parental.last_child_age_years} lat).", "KP art. 182^1c")
    own_cap = parental_total - p.parental.exclusive_weeks * 7
    for who in parents:
        used = sum((ONE - b.work_fraction for b in days[who].values() if b.kind == "parental"), Decimal(0))
        if used > own_cap:
            add("parental-pool.exclusive", "error", f"{WHO[who]} może wykorzystać najwyżej {own_cap} dni rodzicielskiego: "
                f"{p.parental.exclusive_weeks} tygodni należy wyłącznie do drugiego rodzica.", "KP art. 182^1a § 4")
    part_time = [b for b in plan.blocks if b.work_fraction]
    for b in part_time:
        if b.kind != "parental":
            add("part-time.not-parental", "error", f"{span(b)}: pracę na część etatu łączy się tylko z urlopem "
                "rodzicielskim.", "KP art. 182^1e § 1")
        elif parents[b.who].employment != "employee":
            add("part-time.not-employee", "error", f"{span(b)}: łączenie urlopu z pracą dotyczy pracownika i pracy "
                "u pracodawcy, który udzielił urlopu.", "KP art. 182^1e § 1")
        if b.work_fraction > p.parental.part_time_max_fraction:
            add("part-time.fraction", "error", f"{span(b)}: praca w trakcie urlopu najwyżej na pół etatu.",
                "KP art. 182^1e § 1")
    if any(b.kind == "parental" for b in part_time):
        pp, multiple = p.parental, f.children > 1
        cap = ((pp.part_time_cap_weeks_za_zyciem_multiple if multiple else pp.part_time_cap_weeks_za_zyciem_single)
               if f.za_zyciem else (pp.part_time_cap_weeks_multiple if multiple else pp.part_time_cap_weeks_single))
        if sum(b.days for b in parental) > cap * 7:
            add("part-time.cap", "error", f"Wydłużony przez pracę urlop rodzicielski trwa najwyżej {cap} tygodni.",
                "KP art. 182^1f")

    # --- care allowance: one parent per day (ustawa art. 34) ---
    if "father" in parents:
        both = sorted(d for d, b in days["mother"].items() if b.kind == "care"
                      and days["father"].get(d) and days["father"][d].kind == "care")
        if both:
            add("care-docs.one-parent", "error", f"{both[0].isoformat()}: za ten sam dzień zasiłek opiekuńczy dostaje "
                "tylko jeden rodzic.", "art. 34")

    # --- sickness benefit period and rehabilitation (ustawa art. 8, 18) ---
    for who in parents:
        sick = sorted(d for d, b in days[who].items() if b.kind == "sick")
        before, after = [d for d in sick if d < birth], [d for d in sick if d >= birth]
        # shortcut: counts every sick day in the plan; the 60-day break rule (art. 9 ust. 2) is not applied
        if who == "mother" and len(before) > p.sick.period_days_pregnancy:
            add("sick-right.period", "error", f"Zasiłek chorobowy w ciąży przysługuje najwyżej "
                f"{p.sick.period_days_pregnancy} dni.", "art. 8 ust. 1")
        if len(after if who == "mother" else sick) > p.sick.period_days:
            add("sick-right.period", "error", f"{WHO[who]}: zasiłek chorobowy przysługuje najwyżej "
                f"{p.sick.period_days} dni.", "art. 8 ust. 1")
        rehab = sorted(d for d, b in days[who].items() if b.kind == "rehab")
        if rehab:
            if rehab[-1] >= plus_months(rehab[0], p.rehab.max_months):
                add("rehab.too-long", "error", f"Świadczenie rehabilitacyjne przysługuje najwyżej "
                    f"{p.rehab.max_months} miesięcy.", "art. 18 ust. 2")
            limit = p.sick.period_days_pregnancy if rehab[0] < birth else p.sick.period_days
            if len([d for d in sick if d < rehab[0]]) < limit:
                add("rehab.sick-not-exhausted", "warning", "Świadczenie rehabilitacyjne przysługuje po wyczerpaniu "
                    "zasiłku chorobowego; plan nie pokazuje pełnego okresu zasiłkowego.", "art. 18 ust. 1")

    if plan.today:
        _deadlines(plan, birth, days, p, add)
    return list(issues.values())


def supplementary_weeks(plan: Plan, p: Params) -> int | None:
    """Supplementary leave entitlement in weeks from the hospitalization facts (KP art. 180^2 § 1, 3)."""
    h, s = plan.family.hospitalization, p.supplementary
    if h is None:
        return None
    weeks = ceil(h.hospital_days / 7)  # an incomplete week rounds up
    # shortcut: hospital_days must already count only the qualifying window (days 5..end of week 8 at term);
    # exact stay intervals aren't modelled yet
    if h.pregnancy_week < s.extreme.before_pregnancy_week or h.birth_weight_g <= s.extreme.max_weight_g:
        return min(weeks, s.extreme.cap_weeks)
    if h.pregnancy_week < s.preterm.before_pregnancy_week:
        return min(weeks, s.preterm.cap_weeks)
    return min(weeks, s.term.cap_weeks) if h.hospital_days >= s.term.min_stay_days else 0


def _deadlines(plan: Plan, birth: date, days, p: Params, add) -> None:
    """Application deadlines measured from `plan.today`; only for periods that haven't started yet."""
    today, d = plan.today, p.deadlines
    if plan.rate_variant == "averaged" and today > birth + timedelta(days=d.averaged_request_days_after_birth):
        add("averaged.deadline", "error", f"Wniosek o 81,5% można złożyć najpóźniej "
            f"{d.averaged_request_days_after_birth} dni po porodzie.", "art. 30a ust. 1")
    notices = {"paternity": (p.paternity.notice_days, "paternity.notice", "KP art. 182^3 § 2"),
               "parental": (d.parental_notice_days, "parental-docs.notice", "KP art. 182^1d § 1")}
    for b in plan.blocks:
        if b.start < today:
            continue
        if b.kind in notices:
            notice, code, rule = notices[b.kind]
            if b.start - timedelta(days=notice) < today:
                add(code, "warning", f"{WHO[b.who]}: wniosek o {KIND[b.kind].lower()} od {b.start.isoformat()} trzeba "
                    f"złożyć co najmniej {notice} dni wcześniej; pracodawca może się zgodzić na krótszy termin.", rule)
        if b.kind == "maternity" and b.who == "father" and b.start - timedelta(
                days=d.maternity_takeover_notice_days) < today:
            add("transfer.notice", "warning", f"Wniosek taty o pozostałą część macierzyńskiego od {b.start.isoformat()} "
                f"składa się co najmniej {d.maternity_takeover_notice_days} dni wcześniej, a rezygnację mamy co najmniej "
                f"{d.maternity_resign_notice_days} dni przed jej powrotem do pracy.", "KP art. 180 § 8–9")
        if b.work_fraction and b.start - timedelta(days=d.part_time_notice_days) < today:
            add("part-time.notice", "warning", f"Wniosek o pracę w trakcie rodzicielskiego od {b.start.isoformat()} "
                f"składa się co najmniej {d.part_time_notice_days} dni wcześniej.", "KP art. 182^1e § 2")
        if b.kind == "supplementary":
            maternity_end = max((x for w in days for x, blk in days[w].items() if blk.kind == "maternity"), default=None)
            if maternity_end and maternity_end - timedelta(days=d.supplementary_notice_days_before_maternity_end) < today:
                add("supplementary.notice", "warning", f"Wniosek o uzupełniający urlop składa się co najmniej "
                    f"{d.supplementary_notice_days_before_maternity_end} dni przed końcem macierzyńskiego.",
                    "KP art. 180^2 § 4")
