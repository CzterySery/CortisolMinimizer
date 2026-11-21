"""Benefit base (podstawa wymiaru zasiłku), ustawa zasiłkowa art. 36-48. Pure: request + params in, base out."""
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.params import Params
from app.schemas import BaseRequest, BaseResult, Explain, MonthPay

CENT = Decimal("0.01")


def money(x: Decimal) -> Decimal:
    return x.quantize(CENT, ROUND_HALF_UP)


def pln(x: Decimal) -> str:
    """Polish money format for explanations: 1 234,56 zł."""
    return f"{money(x):,.2f} zł".replace(",", " ").replace(".", ",")


def percent(rate: Decimal) -> str:
    return f"{rate * 100:.2f}%".replace(".", ",")


def net(gross: Decimal, employee: bool, p: Params) -> Decimal:
    """Pay after the insured person's own social contributions (art. 3 pkt 3-4)."""
    if employee:  # amounts actually withheld: payroll rounds each contribution separately
        c = p.employee_contributions
        return gross - sum(money(gross * rate) for rate in (c.pension, c.disability, c.sickness))
    return gross - money(gross * p.contribution_deduction)


def window(event: date) -> list[str]:
    """The 12 calendar months before the month of the event, oldest first (art. 36 ust. 1)."""
    months, y, m = [], event.year, event.month
    for _ in range(12):
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
        months.append(f"{y:04d}-{m:02d}")
    return months[::-1]


def benefit_base(req: BaseRequest, p: Params) -> BaseResult:
    employee = req.employment == "employee"
    in_window = window(req.event_date)
    months = sorted((m for m in req.months if m.month in in_window), key=lambda m: m.month)
    steps: list[Explain] = []

    skipped = sorted(m.month for m in req.months if m.month not in in_window)
    if skipped:
        steps.append(Explain(text=f"Pominięto miesiące spoza 12 miesięcy przed zdarzeniem: {', '.join(skipped)}.",
                             rule="art. 36 ust. 1"))

    if months:
        base = _average(months, employee, p, steps)
    elif req.contract_monthly is not None:
        base = net(req.contract_monthly, employee, p)
        steps.append(Explain(
            text=f"Brak pełnego miesiąca ubezpieczenia: podstawą jest kwota z umowy {pln(req.contract_monthly)} "
                 f"po odliczeniu składek, czyli {pln(base)}.",
            rule="art. 37 ust. 2 pkt 1" if employee else "art. 48a, art. 49"))
    else:
        raise ValueError("Brak miesięcy z wynagrodzeniem w okresie 12 miesięcy przed zdarzeniem. "
                         "Podaj wynagrodzenie z umowy (contract_monthly).")

    base = money(base)
    if employee and req.full_time:
        floor = money(p.min_wage * (1 - p.contribution_deduction))
        if base < floor:
            steps.append(Explain(
                text=f"Podniesiono do minimalnej podstawy {pln(floor)} (płaca minimalna {pln(p.min_wage)} "
                     f"po odliczeniu {percent(p.contribution_deduction)}).",
                rule="art. 45 ust. 1"))
            base = floor
    if not employee and base > p.voluntary_base_cap:
        steps.append(Explain(text=f"Ograniczono do maksymalnej podstawy {pln(p.voluntary_base_cap)}.",
                             rule="limit podstawy dobrowolnej składki chorobowej"))
        base = p.voluntary_base_cap

    steps.append(Explain(text=f"Podstawa wymiaru zasiłku: {pln(base)}.", rule="art. 36" if employee else "art. 48"))
    return BaseResult(base=base, steps=steps)


def _average(months: list[MonthPay], employee: bool, p: Params, steps: list[Explain]) -> Decimal:
    full_window = len(months) == 12
    steps.append(Explain(
        text=f"Okres: {months[0].month} – {months[-1].month} ({len(months)} mies.)"
             + ("" if full_window else ", ubezpieczenie krótsze niż 12 miesięcy: pełne miesiące ubezpieczenia") + ".",
        rule="art. 36 ust. 1" if full_window else "art. 36 ust. 2"))

    def partial(m: MonthPay) -> bool:
        return employee and m.worked_days is not None and bool(m.required_days) and m.worked_days < m.required_days

    def under_half(m: MonthPay) -> bool:
        return partial(m) and m.worked_days * 2 < m.required_days

    # art. 38 ust. 3: if every month is under half, none is excluded and all are topped up instead
    all_under_half = all(under_half(m) for m in months)
    used: list[Decimal] = []
    for m in months:
        if under_half(m) and not all_under_half:
            steps.append(Explain(text=f"{m.month}: pominięty, przepracowano mniej niż połowę czasu pracy "
                                      f"({m.worked_days}/{m.required_days} dni).", rule="art. 38 ust. 2 pkt 1"))
            continue
        pay = m.gross
        if partial(m):
            if not m.worked_days:
                steps.append(Explain(text=f"{m.month}: pominięty, brak przepracowanych dni do uzupełnienia.",
                                     rule="art. 38 ust. 3"))
                continue
            # shortcut: the whole pay is treated as topped-up variable pay; split fixed / non-topped
            # components (overtime, commissions) once the Z-3 samples show how payers report them
            pay = money(m.gross / m.worked_days * m.required_days)
            steps.append(Explain(text=f"{m.month}: uzupełniono do pełnego miesiąca: {pln(m.gross)} → {pln(pay)} "
                                      f"({m.worked_days}/{m.required_days} dni).",
                                 rule="art. 38 ust. 2 pkt 2, art. 37 ust. 2"))
        used.append(net(pay, employee, p))
    if not used:
        raise ValueError("Żaden miesiąc nie nadaje się do podstawy: brak przepracowanych dni.")

    average = sum(used) / len(used)
    steps.append(Explain(
        text=f"Średnia z {len(used)} mies. po odliczeniu składek: {pln(average)}.",
        rule=("art. 36 ust. 1, art. 38 ust. 1, art. 3 pkt 3" if employee else "art. 48 ust. 1, art. 3 pkt 4")))

    # shortcut: bonuses are attributed to the window by payment month and divided by 12 even when the
    # insured period is shorter; refine with the Z-3 samples
    for field, label, rule in (("quarterly_bonus", "Premie kwartalne", "art. 42 ust. 2"),
                               ("annual_bonus", "Premia roczna", "art. 42 ust. 3")):
        paid = [getattr(m, field) for m in months if getattr(m, field)]
        if paid:
            share = sum(net(b, employee, p) for b in paid) / 12
            average += share
            steps.append(Explain(text=f"{label}: 1/12 kwot po odliczeniu składek, czyli {pln(share)}.", rule=rule))
    return average
