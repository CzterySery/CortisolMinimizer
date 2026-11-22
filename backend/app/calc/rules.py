"""Legal validation of a plan: Plan + its PlanResult + Params -> issues. Pure.

Issue codes start with the matching rule id in shared/legal-rules.json (e.g. "paternity.too-late"), so the UI can
link an issue to its evidence. "error" = not allowed (makes a game card unplayable), "warning" = allowed but risky
or late, "info" = not checked. Each code is reported once, for its first occurrence."""
from datetime import date, timedelta
from decimal import Decimal
from itertools import pairwise
from math import ceil

from app.calc.base import pln
from app.calc.family import adoption_age_limit, event_date, maternity_end_after_death, plus_years
from app.calc.plan import (
    KIND,
    MATERNITY_BENEFIT,
    ONE,
    WHO,
    day_map,
    last_day,
    pool_sizes,
    sickness_insured,
)
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
    birth = event_date(plan)
    takeover = f.maternity_takeover
    parents = {"mother": f.mother} | ({"father": f.father} if f.father else {})
    days = day_map(plan)
    issues: dict[str, Issue] = {}

    def add(code: str, severity: str, text: str, rule: str) -> None:
        issues.setdefault(code, Issue(code=code, severity=severity, text=text, rule=rule))

    def span(b: Block) -> str:
        return f"{WHO[b.who]}, {KIND[b.kind].lower()} {b.start.isoformat()} – {last_day(b).isoformat()}"

    if f.adoption:
        a = f.adoption
        limit = adoption_age_limit(plan, p)
        if a.applicant not in parents:
            add("adoption.applicant-missing", "error", "Dodaj do rodziny rodzica wskazanego jako wnioskodawca.",
                "art. 30a ust. 2")
        if f.birth_date is None and not a.children:
            add("adoption.birth-date-missing", "error", "Podaj dokładną datę urodzenia dziecka; sam wiek w latach "
                "nie wystarcza do sprawdzenia granic uprawnienia.", "KP art. 183 § 1–3")
        elif (f.birth_date and f.birth_date > a.accepted_on) or any(c.birth_date > a.accepted_on for c in a.children):
            add("adoption.before-birth", "error", "Data przyjęcia nie może poprzedzać urodzenia dziecka.", "KP art. 183")
        if (f.children > 1 and not a.children) or (a.children and len(a.children) != f.children):
            add("adoption.children-missing", "error", "Przy wielu dzieciach podaj datę urodzenia i odroczenie "
                "szkolne osobno dla każdego przyjętego dziecka.", "KP art. 183 § 1–3")
        if a.kind == "adoption" and a.court_applied_on is None:
            add("adoption.court-date-missing", "error", "Podaj datę wystąpienia do sądu o przysposobienie.",
                "KP art. 183 § 1¹")
        if a.court_final_on and a.court_applied_on and a.court_final_on < a.court_applied_on:
            add("adoption.court-dates", "error", "Prawomocność przysposobienia nie może poprzedzać wniosku do sądu.",
                "KP art. 182³ § 1 pkt 2")
        if a.kind == "foster" and a.professional_foster:
            add("adoption.professional-foster", "error", "Ta ścieżka nie obejmuje zawodowej rodziny zastępczej.",
                "KP art. 183 § 1")
        if limit and birth >= limit:
            add("adoption.age-limit", "error", f"W dniu przyjęcia i spełnienia przesłanek dziecko osiągnęło już "
                f"granicę wieku ({limit.isoformat()}).", "KP art. 183 § 1–3")
        maternity = [b for b in plan.blocks if b.kind == "maternity"]
        if maternity:
            start = min(b.start for b in maternity)
            if start < birth:
                add("adoption.before-event", "error", "Urlop nie może zacząć się przed przyjęciem dziecka i, "
                    "przy adopcji, wystąpieniem do sądu.", "KP art. 183 § 1, 1¹")
            if (any(parents[b.who].employment == "employee" for b in maternity if b.who in parents)
                    and start > birth + timedelta(days=p.adoption.start_days)):
                add("adoption.start-too-late", "error", f"Urlop na warunkach macierzyńskiego rozpoczyna się "
                    f"najpóźniej {p.adoption.start_days} dni od spełnienia przesłanek.", "KP art. 183 § 6")
            if any(b.who != c.who and b.start <= last_day(c) and c.start <= last_day(b)
                   for b in maternity for c in maternity):
                add("adoption.maternity-overlap", "error", "Rodzice nie mogą jednocześnie korzystać z tej samej "
                    "puli urlopu na warunkach macierzyńskiego.", "KP art. 183 § 2")
            ordered = sorted(maternity, key=lambda b: b.start)
            if len({b.who for b in ordered}) > 1:
                first = ordered[0].who
                taken = sum(b.days for b in ordered if b.who == first and b.start < next(
                    x.start for x in ordered if x.who != first))
                if taken < p.maternity.mother_personal_weeks * 7:
                    add("transfer.before-14-weeks", "error", "W zwykłym przekazaniu urlopu na warunkach "
                        "macierzyńskiego pierwszy opiekun wykorzystuje co najmniej 14 tygodni.", "KP art. 183 § 2")
        if plan.today and plan.today > birth + timedelta(days=p.adoption.application_days):
            add("adoption.application-late", "warning", f"Termin złożenia wniosku o urlop wynosi "
                f"{p.adoption.application_days} dni od spełnienia przesłanek.", "KP art. 183 § 6")

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
        if b.kind in AFTER_BIRTH and f.child_died_on and not f.surviving_children and last_day(b) > f.child_died_on:
            rule_id, rule = AFTER_BIRTH[b.kind]
            add(f"{rule_id}.after-child-death", "error", f"{span(b)}: ten okres służy opiece nad dzieckiem, więc nie "
                "przysługuje po jego śmierci. Mamie zostaje urlop macierzyński (KP art. 180^1).", rule)

    # --- insurance: no title or no sickness insurance means no benefits (art. 2a, 4, 29); risks from brief part H ---
    pregnancy = f.due_date - timedelta(weeks=p.maternity.pregnancy_weeks)
    for who, parent in parents.items():
        taken = sorted((b for b in plan.blocks if b.who == who and b.kind in BENEFITS), key=lambda b: b.start)
        if not taken:
            continue
        since, until = parent.insured_since, parent.insured_until
        if (parent.base_monthly is None and parent.gross_monthly_estimate is None
                and not parent.salary_history and sickness_insured(parent)
                and any(b.base_monthly is None for b in taken)):
            add("base.missing", "warning", f"{WHO[who]}: brak podstawy wymiaru i wynagrodzeń z Z-3, więc kwoty zasiłków "
                "nie mogą być oszacowane. Uzupełnij dane; brak kwoty nie oznacza zerowego dochodu.", "art. 36")
        if parent.base_monthly is None and parent.gross_monthly_estimate is not None:
            add("base.estimate", "warning", f"{WHO[who]}: kwoty są szacunkiem z jednej pensji brutto. ZUS co do "
                "zasady używa średniej z 12 miesięcy, a przy krótszym ubezpieczeniu z pełnych miesięcy. "
                "Premie, zmiany pensji i nieobecności mogą zmienić wynik.", "art. 36–38")
        # ZUS refuses a non-employee's benefit for a period after the insurance ended (sample case: JDG closed
        # after the maternity period, parental refused); employees: see the shortcut below
        ended = [b for b in taken if until and b.start > until and b.kind != "job_loss_benefit"]
        if ended and parent.employment != "employee":
            add("insured-parent.ended", "error", f"{span(ended[0])}: ubezpieczenie chorobowe ustało {until.isoformat()}, "
                "więc za ten okres zasiłek nie przysługuje.", "art. 29 ust. 1")
        if since and taken[0].start < since:
            add("insured-parent.not-yet-insured", "error", f"{span(taken[0])}: zaczyna się przed początkiem "
                f"ubezpieczenia ({since.isoformat()}).", "art. 29 ust. 1")
        if not f.adoption and since and pregnancy < since <= birth:
            add("insured-parent.started-in-pregnancy", "warning", f"{WHO[who]}: ubezpieczenie zaczęło się w czasie "
                f"ciąży ({since.isoformat()}). ZUS może sprawdzić, czy umowa lub działalność nie jest pozorna; wtedy "
                "stwierdzi niepodleganie ubezpieczeniu i zasiłki nie przysługują.", "zadanie ZUS, cz. H pkt 1")
        in_pregnancy = [m for m in parent.salary_history if f"{pregnancy:%Y-%m}" <= m.month <= f"{birth:%Y-%m}"]
        before = [m.gross for m in parent.salary_history if m.month < f"{pregnancy:%Y-%m}"]
        raised = [m for m in in_pregnancy if before and m.gross > max(before)]
        if raised and not f.adoption:
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
    if pools.maternity_days_left < 0 and (end := maternity_end_after_death(plan, p)):
        add("maternity-pool.after-child-death", "error", f"Po martwym urodzeniu lub śmierci dziecka urlop "
            f"macierzyński trwa {p.maternity.stillbirth_weeks} tygodni po porodzie, nie krócej niż "
            f"{p.maternity.after_death_min_days} dni od dnia zgonu: tu do {end:%d.%m.%Y}. Plan przekracza go o "
            f"{-pools.maternity_days_left} dni.", "KP art. 180^1 § 1–2")
    elif pools.maternity_days_left < 0:
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
    if not f.adoption and f.surviving_children is not None and (not f.child_died_on or f.surviving_children >= f.children):
        add("maternity-pool.survivors-invalid", "error", "Liczba dzieci pozostałych przy życiu wymaga daty zgonu "
            "i musi być mniejsza od liczby dzieci przy porodzie.", "KP art. 180¹")
    if not f.adoption and f.child_died_on and f.children > 1 and f.surviving_children is None:
        add("maternity-pool.survivors-missing", "error", "Podaj liczbę dzieci z tego porodu pozostałych przy życiu; "
            "bez niej nie ustalimy właściwego wymiaru macierzyńskiego.", "KP art. 180¹")
    if f.child_died_on and f.child_died_on < birth:
        add("maternity-pool.death-before-birth", "error", "Data zgonu nie może poprzedzać porodu.", "KP art. 180¹")
    if takeover and (f.adoption or takeover.start < birth):
        add("transfer.event-invalid", "error", "Szczególne przejęcie w tej ścieżce wymaga zdarzenia po porodzie.",
            "KP art. 180 § 6–15")
    if takeover and takeover.reason == "death" and any(b.who == "mother" and last_day(b) > takeover.start
                                                       for b in plan.blocks):
        add("transfer.mother-after-death", "error", "Okresy mamy nie mogą przypadać po jej śmierci.", "KP art. 180 § 12")
    mother_maternity = sorted(d for d, b in days["mother"].items() if b.kind == "maternity")
    combined = sorted(set(mother_maternity) | {d for d, b in days["father"].items() if b.kind == "maternity"})
    continuous = len(combined) == (combined[-1] - combined[0]).days + 1 if combined else True
    if not f.adoption and len([d for d in mother_maternity if d < birth]) > p.maternity.prebirth_max_weeks * 7:
        add("prebirth.too-early", "error", f"Przed porodem można wykorzystać najwyżej {p.maternity.prebirth_max_weeks} "
            "tygodni urlopu macierzyńskiego.", "KP art. 180 § 2")
    if mother_maternity and not f.adoption:
        if mother_maternity[0] > birth:
            add("maternity-pool.starts-after-birth", "error", "Urlop macierzyński zaczyna się najpóźniej w dniu porodu.",
                "KP art. 183^1 § 2")
        hospital_pause = takeover and takeover.reason == "hospital"
        if (len(mother_maternity) != (mother_maternity[-1] - mother_maternity[0]).days + 1
                and not (hospital_pause and continuous)):
            add("maternity-pool.not-continuous", "error", "Urlop macierzyński mamy musi być ciągły.", "KP art. 180 § 3")
    father_maternity = sorted(d for d, b in days["father"].items() if b.kind == "maternity")
    if father_maternity and not f.adoption:
        after_birth = [d for d in mother_maternity if birth <= d < father_maternity[0]]
        minimum = p.maternity.mother_personal_weeks * 7
        if takeover:
            minimum = 0 if takeover.reason == "death" or not sickness_insured(f.mother) else (
                p.maternity.mother_personal_weeks_incapacity * 7)
            event_first = takeover.start if takeover.reason == "hospital" else takeover.start + timedelta(days=1)
            if father_maternity[0] < event_first:
                add("transfer.before-event", "error", "Przejęcie zaczyna się po zdarzeniu, a przy hospitalizacji "
                    "najwcześniej w dniu przyjęcia do szpitala.", "KP art. 180 § 6–15")
            if takeover.reason == "hospital" and any(d > takeover.end for d in father_maternity):
                add("transfer.outside-hospital", "error", "Tata może przejąć ten okres wyłącznie na czas "
                    "kwalifikującego pobytu mamy w szpitalu.", "KP art. 180 § 10–11")
            if takeover.reason == "hospital" and any(father_maternity[0] <= d <= takeover.end for d in mother_maternity):
                add("transfer.mother-in-hospital", "error", "Mama wraca do macierzyńskiego po zakończeniu "
                    "pobytu uniemożliwiającego opiekę.", "KP art. 180 § 10–11")
            if takeover.reason == "hospital" and not sickness_insured(f.mother):
                add("transfer.hospital-uninsured", "error", "Ta ścieżka przerwania urlopu w szpitalu wymaga "
                    "ubezpieczonej mamy.", "KP art. 180 § 10–11")
            if any(d in days["mother"] and days["mother"][d].kind == "maternity" for d in father_maternity):
                add("transfer.overlap", "error", "Mama i tata nie mogą pobierać macierzyńskiego za ten sam dzień.",
                    "KP art. 180 § 14")
            if takeover.reason != "hospital" and any(d >= father_maternity[0] for d in mother_maternity):
                add("transfer.mother-after-event", "error", "Po trwałym przejęciu mama nie korzysta z tej części "
                    "macierzyńskiego.", "KP art. 180 § 6–15")
            if (takeover.reason == "death" and any(d > takeover.start for d in mother_maternity)):
                add("transfer.mother-after-death", "error", "Okres mamy nie może przypadać po jej śmierci.",
                    "KP art. 180 § 12")
            if sickness_insured(f.mother) and not continuous:
                add("transfer.gap", "error", "Wykorzystane okresy mamy i taty muszą tworzyć ciągły okres "
                    "macierzyńskiego.", "KP art. 180 § 14")
            if not sickness_insured(f.mother) and father_maternity[-1] >= birth + timedelta(days=pool_sizes(plan, p)[0]):
                add("transfer.after-pool", "error", "Przejęcie obejmuje tylko pozostały okres od dnia porodu, "
                    "nie rozpoczyna nowej puli macierzyńskiego.", "KP art. 180 § 15")
        if len(after_birth) < minimum:
            add("transfer.before-14-weeks", "error", f"Tata może przejąć macierzyński dopiero po "
                f"{p.maternity.mother_personal_weeks} tygodniach wykorzystanych przez mamę po porodzie (wyjątki: "
                "orzeczenie o niezdolności, pobyt w szpitalu, zgon).", "KP art. 180 § 4–5, art. 29 ust. 3")
        if mother_maternity and not takeover and father_maternity[0] != mother_maternity[-1] + timedelta(days=1):
            add("transfer.not-continuous", "error", "Tata przejmuje pozostałą część macierzyńskiego bezpośrednio po "
                "rezygnacji mamy.", "KP art. 180 § 4")

    for who, parent in parents.items():
        own = sorted((b for b in plan.blocks if b.who == who and b.kind != "vacation"), key=lambda b: b.start)
        for previous, current in pairwise(own):
            gap_start = last_day(previous) + timedelta(days=1)
            # A complete calendar month without benefits requires re-establishing the base (art. 43).
            next_month = date(gap_start.year + (gap_start.month == 12), gap_start.month % 12 + 1, 1)
            full_month_end = next_month if gap_start.day == 1 else date(
                next_month.year + (next_month.month == 12), next_month.month % 12 + 1, 1)
            if current.start >= full_month_end and current.base_monthly is None and parent.base_monthly is None:
                add("base.recalculation-needed", "warning", f"{WHO[who]}: po pełnym miesiącu przerwy potwierdź "
                    "podstawę osobno w szczegółach kolejnego okresu.", "art. 43")
        if any((m.quarterly_bonus or m.annual_bonus or (m.worked_days is not None and m.required_days
                and m.worked_days < m.required_days)) for m in parent.salary_history) and any(
                b.base_monthly is None for b in own) and parent.base_monthly is None:
            add("base.components-review", "warning", f"{WHO[who]}: premie i niepełne miesiące wymagają sprawdzenia "
                "składników Z-3; potwierdzoną podstawę wpisz dla okresu.", "art. 37–42")
        if any(b.kind == "rehab" and b.rehab_indexation_factor is None for b in own):
            add("rehab.indexation-missing", "warning", "Podaj opublikowany wskaźnik waloryzacji dla kwartału "
                "rozpoczęcia rehabilitacyjnego (1, jeśli nie podlega podwyższeniu).", "art. 19 ust. 2–3")
        if (own and parent.employment == "self_employed" and parent.insured_since and parent.salary_history
                and parent.base_monthly is None and any(b.base_monthly is None for b in own)
                and parent.insured_since > plus_months(own[0].start.replace(day=1), -12)):
            add("base.jdg-short-period", "warning", "JDG z krótkim okresem ubezpieczenia wymaga szczegółowej "
                "reguły minimalnej i nadwyżkowej podstawy. Wpisz potwierdzoną podstawę dla okresu.", "art. 48a–49")

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
        if f.adoption:
            a = f.adoption
            if a.kind != "adoption" or a.court_final_on is None:
                add("adoption.paternity-no-final-order", "error", "Ojcowski wymaga prawomocnego przysposobienia; "
                    "samo przyjęcie do pieczy lub wniosek do sądu nie wystarcza.", "KP art. 182³ § 1 pkt 2")
            elif (b.start < a.court_final_on or last_day(b) >= min(
                    plus_months(a.court_final_on, p.paternity.use_by_child_months),
                    plus_years(f.birth_date or birth, p.adoption.adoption_age_years))):
                add("paternity.too-late", "error", "Ojcowski musi przypadać po prawomocnym przysposobieniu, "
                    "w ciągu 12 miesięcy od niego i przed ukończeniem 14 lat.", "KP art. 182³ § 1 pkt 2")
        elif last_day(b) >= plus_months(birth, p.paternity.use_by_child_months):
            add("paternity.too-late", "error", f"{span(b)}: urlop ojcowski trzeba wykorzystać, zanim dziecko skończy "
                f"{p.paternity.use_by_child_months} miesięcy.", "KP art. 182^3 § 1")

    # --- parental (KP art. 182^1a–182^1f) ---
    _, parental_total = pool_sizes(plan, p)
    parental = [b for b in plan.blocks if b.kind == "parental"]
    if len(parental) > p.parental.max_parts:
        add("parental-parts.too-many", "error", f"Urlop rodzicielski można wziąć najwyżej w {p.parental.max_parts} "
            "częściach (liczą się wnioski obojga rodziców).", "KP art. 182^1c, 182^1d § 2")
    deadline = date(birth.year + p.parental.last_child_age_years, 12, 31)
    if f.adoption:
        limit = adoption_age_limit(plan, p)
        deadline = limit - timedelta(days=1) if limit else birth
    if any(last_day(b) > deadline for b in parental):
        add("parental-pool.too-late", "error", f"Urlop rodzicielski trzeba wykorzystać do {deadline.isoformat()} (koniec "
            "termin właściwy dla urodzenia lub przyjęcia dziecka).", "KP art. 182¹c; art. 183 § 4–5")
    prior = ({"mother": f.adoption.previous_parental_mother_days, "father": f.adoption.previous_parental_father_days}
             if f.adoption else {"mother": 0, "father": 0})
    own_cap = max(0, parental_total + sum(prior.values()) - p.parental.exclusive_weeks * 7)
    for who in parents:
        used = sum((ONE - b.work_fraction for b in days[who].values() if b.kind == "parental"), Decimal(0))
        if used + prior[who] > own_cap:
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

    if (plan.rate_variant == "averaged" and not (f.child_died_on == birth and not f.surviving_children)
            and plan.averaged_request_on
            and plan.averaged_request_on > birth + timedelta(days=p.deadlines.averaged_request_days_after_birth)):
        add("averaged.deadline", "error", f"Wniosek o 81,5% złożono lub zaplanowano po upływie "
            f"{p.deadlines.averaged_request_days_after_birth} dni od porodu albo przyjęcia i spełnienia przesłanek. "
            "Wybierz stawki standardowe.", "art. 30a ust. 1–2")
    if any(b.kind in MATERNITY_BENEFIT - {"paternity"} and (b.base_monthly or result.bases.get(b.who, 0)) > 0
           and (b.base_monthly or result.bases[b.who]) * p.rates.parental < p.parental_benefit_floor
           and b.monthly_tax_advance is None for b in plan.blocks):
        add("floor.tax-not-modelled", "warning", "Przy niskiej podstawie kwotę podwyższenia do świadczenia "
            "rodzicielskiego ustala się po zaliczce na PIT. Kalkulator nie oblicza PIT, więc podwyższenie "
            "i dni łączenia z pracą wymagają weryfikacji u płatnika.", "art. 31 ust. 3a–3c, 4a")
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
    if (plan.rate_variant == "averaged" and not (plan.family.child_died_on == birth and not plan.family.surviving_children)
            and not plan.averaged_request_on
            and today > birth + timedelta(days=d.averaged_request_days_after_birth)):
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
        if (not plan.family.adoption and not (plan.family.maternity_takeover and
                plan.family.maternity_takeover.reason != "incapacity") and b.kind == "maternity" and b.who == "father"
                and b.start - timedelta(
                days=d.maternity_takeover_notice_days) < today):
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
