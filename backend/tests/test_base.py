"""Unit tests for the benefit base (art. 36-48). Pure function, params from the seed file, no database."""
from datetime import date
from decimal import Decimal

import pytest

from app.calc.base import benefit_base, net, window
from app.params import Params
from app.repositories import DATA
from app.schemas import BaseRequest, MonthPay

P = Params.model_validate_json((DATA / "params.json").read_text(encoding="utf-8"))
EVENT = date(2026, 7, 15)  # window: 2025-07 .. 2026-06
NET_6000 = Decimal("5177.40")  # 6000 - (585.60 + 90.00 + 147.00)


def year(gross="6000", **extra) -> list[MonthPay]:
    return [MonthPay(month=m, gross=Decimal(gross), **extra) for m in window(EVENT)]


def base(months, employment="employee", **kw):
    return benefit_base(BaseRequest(employment=employment, event_date=EVENT, months=months, **kw), P)


def test_window_is_12_months_before_event_month():
    assert window(EVENT)[0] == "2025-07" and window(EVENT)[-1] == "2026-06"
    assert window(date(2026, 1, 1))[-1] == "2025-12"


def test_full_year_employee():
    assert base(year()).base == NET_6000


def test_employee_contributions_rounded_separately():
    # art. 3 pkt 3: withheld amounts (9,76% + 1,5% + 2,45%, each rounded) differ from a flat 13,71% by a grosz
    assert net(Decimal("1000.05"), True, P) == Decimal("862.95")
    assert net(Decimal("1000.05"), False, P) == Decimal("862.94")


def test_months_outside_window_are_ignored():
    result = base(year() + [MonthPay(month="2026-07", gross=Decimal(99999))])
    assert result.base == NET_6000 and "2026-07" in result.steps[0].text


def test_under_half_month_excluded_and_partial_month_topped_up():
    months = year()
    months[3] = MonthPay(month=months[3].month, gross=Decimal(100), worked_days=9, required_days=21)
    months[5] = MonthPay(month=months[5].month, gross=Decimal(4000), worked_days=14, required_days=21)
    result = base(months)
    assert result.base == NET_6000  # 4000 / 14 * 21 = 6000; the 9/21 month drops out
    rules = [s.rule for s in result.steps]
    assert "art. 38 ust. 2 pkt 1" in rules and "art. 38 ust. 2 pkt 2, art. 37 ust. 2" in rules


def test_every_month_under_half_tops_up_all():
    months = [MonthPay(month=m, gross=Decimal(1500), worked_days=5, required_days=20) for m in window(EVENT)[-3:]]
    assert base(months).base == NET_6000  # art. 38 ust. 3: nothing excluded, all topped up


def test_shorter_insurance_uses_full_months():
    result = base(year()[-3:])
    assert result.base == NET_6000 and result.steps[0].rule == "art. 36 ust. 2"


def test_first_month_uses_contract_pay():
    assert base([], contract_monthly=Decimal(6000)).base == NET_6000
    with pytest.raises(ValueError):
        base([])


def test_minimum_base_full_time_only():
    assert base(year("3000")).base == Decimal("4147.10")  # 4806 * (1 - 13,71%)
    assert base(year("3000"), full_time=False).base == Decimal("2588.70")


def test_quarterly_and_annual_bonuses():
    months = year()
    for i in (2, 5, 8, 11):  # four quarterly bonuses of 1200 -> 1035.48 net each
        months[i] = MonthPay(month=months[i].month, gross=Decimal(6000), quarterly_bonus=Decimal(1200))
    months[0] = MonthPay(month=months[0].month, gross=Decimal(6000), annual_bonus=Decimal(12000))
    # 5177.40 + 4 * 1035.48 / 12 (345.16) + 10354.80 / 12 (862.90)
    assert base(months).base == Decimal("6385.46")


def test_non_employee_flat_deduction_and_cap():
    assert base(year("5000"), employment="self_employed").base == Decimal("4314.50")
    assert base(year("25000"), employment="contract").base == P.voluntary_base_cap
    assert base(year("1000"), employment="contract").base == Decimal("862.90")  # no minimum-wage floor
