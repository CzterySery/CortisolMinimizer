"""Pure replay engine for the authored deck. No card adds money or duplicates a leave pool.

Scenario choices are sample decisions, not statutory constants. Legal limits come from Params;
feasibility always passes through the same calculator and rules as the standalone plan.
"""
from datetime import date, timedelta
from decimal import Decimal
from math import floor

from app.calc.plan import compute_plan, day_map, last_day, pool_sizes
from app.calc.rules import check, supplementary_weeks
from app.params import Params
from app.schemas import (
    Block,
    Family,
    GameSimulation,
    Issue,
    Plan,
    ScenarioSummary,
    SimulatedCard,
    Statistic,
)


class Unavailable(ValueError):
    def __init__(self, text: str, rule: str = "warunki scenariusza"):
        super().__init__(text)
        self.issue = Issue(code="game.unavailable", severity="error", text=text, rule=rule)


def evaluate(plan: Plan, p: Params, horizon: tuple[date, date]):
    result = compute_plan(plan, p, horizon=horizon)
    result.issues = check(plan, result, p)
    return result


def statistics(plan: Plan, result, p: Params, choices: dict) -> list[Statistic]:
    birth = plan.family.birth_date or plan.family.due_date
    maternity, _ = pool_sizes(plan, p)
    # Sample care needs are stable across alternatives; simultaneous parents cover a day once.
    needs = {birth + timedelta(days=n) for n in range(maternity, 365)}
    for offset, length in [(choices["adaptation_offset"], choices["adaptation_days"]),
                           (choices["later_break_offset"], choices["later_break_days"]),
                           (choices["emergency_offset"], choices["emergency_days"])]:
        needs.update(birth + timedelta(days=offset + n) for n in range(length))
    days = day_map(plan)
    covered = Decimal(0)
    for day in needs:
        available = [Decimal(1) - b.work_fraction for own in days.values() if (b := own.get(day))
                     and b.kind in {"maternity", "supplementary", "paternity", "parental", "care", "vacation"}]
        covered += min(Decimal(1), sum(available, Decimal(0)))
    baseline = sum(parent.base_monthly or Decimal(0)
                   for parent in (plan.family.mother, plan.family.father) if parent)
    lowest = min((row.total for row in result.months), default=Decimal(0))
    money_ratio = min(Decimal(1), lowest / baseline) if baseline else Decimal(0)
    time_ratio = covered / len(needs) if needs else Decimal(0)
    balance = int((money_ratio + time_ratio) * 50)
    return [Statistic(id="money", label="Pieniądze", value=int(lowest), max=int(baseline), unit="zł"),
            Statistic(id="time", label="Czas", value=int(covered), max=len(needs), unit="dni"),
            Statistic(id="happiness", label="Szczęście", value=balance, max=100, unit="bilans")]


def apply_card(plan: Plan, card: dict, p: Params, choices: dict, facts: dict, reservations: dict):
    """Resolve symbolic effect primitives into blocks, then let rules.py judge the whole plan."""
    plan = plan.model_copy(deep=True)
    reservations = dict(reservations)
    birth = plan.family.birth_date or plan.family.due_date
    card_id = card["id"]
    if card_id in {"1F", "2F"}:
        raise Unavailable("Ta rodzina oczekuje narodzin; karta dotyczy adopcji lub pieczy.", "KP art. 183")
    if card_id == "1C" and not facts.get("sick_verified"):
        raise Unavailable("W tym scenariuszu nie ma stwierdzonej niezdolności do pracy ani e-ZLA.", "art. 6, 11")
    if card_id == "1D":
        raise Unavailable("Brak wyczerpanego okresu chorobowego i przesłanek rehabilitacji w tej historii.", "art. 18")
    if card_id in {"2D", "2E"} and not plan.family.hospitalization:
        raise Unavailable("W tej historii nie ma kwalifikującej hospitalizacji dziecka.", "KP art. 180^2")
    if card_id == "3E" and not plan.family.za_zyciem:
        raise Unavailable("W tym scenariuszu nie ma zaświadczenia Za życiem.", "KP art. 182^1a § 2")
    if card_id == "3F":
        raise Unavailable("Umowa mamy trwa; ta karta dotyczy uprawnienia po ustaniu ubezpieczenia.", "art. 30")

    def after(kind, who=None):
        return max((last_day(b) + timedelta(days=1) for b in plan.blocks
                    if b.kind == kind and (who is None or b.who == who)), default=birth)

    def remaining():
        return compute_plan(plan, p).pools

    def resolve(value):
        if not isinstance(value, str):
            return value
        if value in {"mother", "father"}:
            return value
        if value.startswith("params."):
            node = p.model_dump()
            for key in value.removeprefix("params.").split("."):
                node = node[key]
            return node
        parental = pool_sizes(plan, p)[1]
        exclusive = p.parental.exclusive_weeks * 7
        values = {
            "choice.parent": "mother", "choice.work_fraction": Decimal(choices["work_fraction"]),
            "choice.prebirth_start": birth - timedelta(days=choices["prebirth_days"]),
            "facts.ezla.start": birth - timedelta(days=choices["sick_days"]),
            "facts.ezla.days": choices["sick_days"],
            "choice.early_paternity_start": birth, "choice.first_paternity_start": birth,
            "need:first_year": after("supplementary") if any(b.kind == "supplementary" for b in plan.blocks) else after("maternity"),
            "need:shared": after("supplementary") if any(b.kind == "supplementary" for b in plan.blocks) else after("maternity"),
            "need:father_solo": after("maternity"),
            "need:paternity_later": birth + timedelta(days=choices["paternity_later_offset"]),
            "need:adaptation": birth + timedelta(days=choices["adaptation_offset"]),
            "need:later_break": birth + timedelta(days=choices["later_break_offset"]),
            "need:emergency": birth + timedelta(days=choices["emergency_offset"]),
            "after:maternity": after("maternity"),
            "after:planned_parental:mother": after("parental", "mother"),
            "after:emergency:mother": after("care", "mother"),
            "choice.mother_parental_days": parental - exclusive,
            "choice.father_parental_days": exclusive,
            "derived.paternity_remaining": remaining().paternity_days_left,
            "derived.father_exclusive_remaining": remaining().exclusive_days_left.get("father", 0),
            "derived.supplementary_days": (supplementary_weeks(plan, p) or 0) * 7,
            "derived.emergency_remaining_days": choices["emergency_days"] - choices["emergency_mother_days"],
        }
        for name in ("shared_parental_days", "parental_pool_days", "first_year_parental_days",
                     "adaptation_pool_days", "emergency_mother_days"):
            values[f"choice.{name}"] = choices[name]
        values["choice.adaptation_reserve_days"] = choices["adaptation_days"] + choices["later_break_days"]
        for name in ("adaptation", "later_break", "emergency"):
            values[f"needs.{name}.days"] = choices[f"{name}_days"]
        if value not in values:
            raise Unavailable(f"Ta ścieżka wymaga danych, których historia nie zawiera: {value}.")
        return values[value]

    for effect in card["effects"]:
        op = effect["op"]
        if op in {"set_flag", "mark_docs"}:
            # Evidence/preparation is not a payment, leave day or new legal entitlement.
            continue
        if op == "set_rate_variant":
            plan.rate_variant = effect["value"]
        elif op == "transfer_maternity":
            start = birth + timedelta(weeks=p.maternity.mother_personal_weeks)
            end = after("maternity")
            if end <= start:
                raise Unavailable("Po osobistym okresie mamy nie pozostała część do przejęcia.", "KP art. 180 § 4")
            mother = next(b for b in plan.blocks if b.kind == "maternity" and b.who == "mother")
            mother.days = (start - mother.start).days
            plan.blocks.append(Block(who="father", kind="maternity", start=start, days=(end - start).days))
        elif op == "reserve":
            amount = int(resolve(effect["days"]))
            reservations[effect["pool"]] = amount
        elif op in {"add_block", "add_care"}:
            who = resolve(effect["who"])
            kind = "care" if op == "add_care" else effect["kind"]
            start = resolve(effect["start"])
            amount = (birth - start).days if effect["days"] == "until:birth" else int(resolve(effect["days"]))
            fraction = Decimal(resolve(effect.get("work_fraction", 0)))
            if amount <= 0:
                raise Unavailable("Cała pula ojcowskiego została już wykorzystana." if kind == "paternity" else
                                  "Brak pozostałej puli lub kwalifikującego uprawnienia w tej historii.",
                                  "KP art. 180, 180^2, 182^1a, 182^3")
            if effect.get("merge_into") == "baseline.maternity":
                maternity = next(b for b in plan.blocks if b.kind == "maternity")
                maternity.start = start  # Same total: every prebirth day removes a postbirth day.
            elif kind == "sick" and facts.get("sick_verified"):
                # Existing medical incapacity is a fact, not something drawing a card creates or removes.
                pass
            else:
                duration = floor(Decimal(amount) / (1 - fraction)) if fraction else amount
                plan.blocks.append(Block(who=who, kind=kind, start=start, days=duration, work_fraction=fraction))
            if pool := effect.get("consume_reservation"):
                reservations[pool] = max(0, reservations.get(pool, 0) - amount)
        else:
            raise Unavailable(f"Nieobsługiwany efekt: {op}.")
    return plan, reservations


def simulate(scenario_id: str, selected: list[str], p: Params, data: dict, cards: list[dict]) -> GameSimulation:
    if scenario_id not in data["scenarios"]:
        raise ValueError("Nieznany scenariusz.")
    facts, choices = data["scenarios"][scenario_id], data["choices"]
    family = Family.model_validate(data["family"] | {key: facts[key] for key in ("hospitalization", "za_zyciem") if key in facts})
    birth = family.birth_date or family.due_date
    plan = Plan(family=family, today=birth - timedelta(days=choices["horizon_before_days"]))
    maternity, _ = pool_sizes(plan, p)
    plan.blocks = [Block(who="mother", kind="maternity", start=birth, days=maternity)]
    if facts.get("sick_verified"):
        plan.blocks.append(Block(who="mother", kind="sick", start=birth - timedelta(days=choices["sick_days"]),
                                 days=choices["sick_days"]))
    horizon = (plan.today, birth + timedelta(days=choices["horizon_after_days"]))
    by_id = {card["id"]: card for card in cards}
    reservations = {}
    if len(selected) > 5:
        raise ValueError("Plan obejmuje pięć tur.")
    for index, card_id in enumerate(selected):
        card = by_id.get(card_id)
        if card is None or card["round_id"] != index + 1:
            raise ValueError("Wybierz jedną kartę z każdej kolejnej tury.")
        plan, reservations = apply_card(plan, card, p, choices, facts, reservations)
        errors = [issue for issue in evaluate(plan, p, horizon).issues if issue.severity == "error"]
        if errors:
            raise ValueError(errors[0].text)
    result = evaluate(plan, p, horizon)
    candidates = []
    for card in cards:
        if card["round_id"] != len(selected) + 1:
            continue
        try:
            candidate, _ = apply_card(plan, card, p, choices, facts, reservations)
            outcome = evaluate(candidate, p, horizon)
            errors = [issue for issue in outcome.issues if issue.severity == "error"]
            candidates.append(SimulatedCard(id=card["id"], available=not errors, issues=outcome.issues,
                                           statistics=statistics(candidate, outcome, p, choices), pools=outcome.pools))
        except Unavailable as error:
            candidates.append(SimulatedCard(id=card["id"], available=False, issues=[error.issue],
                                           statistics=[], pools=result.pools))
    return GameSimulation(scenario=ScenarioSummary(id=scenario_id, title=facts["title"], description=facts["description"]),
                          plan=plan, result=result, statistics=statistics(plan, result, p, choices),
                          candidates=candidates, reservations=reservations,
                          horizon_start=horizon[0], horizon_end=horizon[1])
