"""Legal parameters. Every rate/duration the calculator uses lives here, editable via /api/admin/params."""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app import repositories


class EmployeeContributions(BaseModel):
    """Contributions withheld from an employee's pay, each rounded on its own by payroll (art. 3 pkt 3)."""
    pension: Decimal
    disability: Decimal
    sickness: Decimal


class Rates(BaseModel):
    sick: Decimal
    sick_pregnancy: Decimal
    maternity: Decimal
    supplementary: Decimal
    paternity: Decimal
    job_loss: Decimal
    parental: Decimal
    averaged: Decimal
    care: Decimal
    rehab_first_period: Decimal  # art. 19 ust. 1: first three months
    rehab: Decimal
    rehab_pregnancy: Decimal


class Rehab(BaseModel):
    first_period_days: int  # "pierwsze trzy miesiące" counted as 3 x 30 days
    max_months: int  # art. 18 ust. 2


class Sick(BaseModel):
    employer_days: int
    employer_days_50plus: int
    period_days: int
    period_days_pregnancy: int
    period_days_after_insurance: int
    waiting_days_mandatory: int
    waiting_days_voluntary: int
    break_days_same_period: int


class Maternity(BaseModel):
    weeks_by_children: list[int] = Field(min_length=1)  # index 0 = 1 child, last entry = that many or more
    prebirth_max_weeks: int
    mother_personal_weeks: int
    mother_personal_weeks_incapacity: int
    stillbirth_weeks: int
    after_death_min_days: int
    adoption_min_weeks: int


class Parental(BaseModel):
    weeks_single: int
    weeks_multiple: int
    weeks_za_zyciem_single: int
    weeks_za_zyciem_multiple: int
    exclusive_weeks: int
    max_parts: int
    last_child_age_years: int
    part_time_max_fraction: Decimal
    part_time_cap_weeks_single: int
    part_time_cap_weeks_multiple: int
    part_time_cap_weeks_za_zyciem_single: int  # KP art. 182^1f § 1^1
    part_time_cap_weeks_za_zyciem_multiple: int


class Paternity(BaseModel):
    days: int
    min_part_days: int
    max_parts: int
    use_by_child_months: int
    notice_days: int


class SupplementaryExtreme(BaseModel):
    before_pregnancy_week: int
    max_weight_g: int
    cap_weeks: int


class SupplementaryPreterm(BaseModel):
    before_pregnancy_week: int
    cap_weeks: int


class SupplementaryTerm(BaseModel):
    min_stay_days: int
    window_from_day: int
    window_to_day: int
    cap_weeks: int


class Supplementary(BaseModel):
    extreme: SupplementaryExtreme
    preterm: SupplementaryPreterm
    term: SupplementaryTerm


class Deadlines(BaseModel):
    averaged_request_days_after_birth: int
    parental_notice_days: int  # KP art. 182^1d § 1
    part_time_notice_days: int
    supplementary_notice_days_before_maternity_end: int


class Care(BaseModel):
    days_per_year_child_under_14: int
    days_per_year_other: int


class Game(BaseModel):
    round_offsets_days: list[int] = Field(min_length=5, max_length=5)  # round anchor dates relative to birth
    budget_target_ratio: Decimal


class Params(BaseModel):
    effective_from: date
    contribution_deduction: Decimal = Field(ge=0, lt=1)
    employee_contributions: EmployeeContributions
    min_wage: Decimal = Field(gt=0)
    voluntary_base_cap: Decimal = Field(gt=0)  # cap on the final base, i.e. AFTER the 13.71% deduction (23 550 x 0.8629)
    parental_benefit_floor: Decimal = Field(ge=0)
    payer_threshold_insured: int
    debt_threshold_pct_min_wage: Decimal
    rates: Rates
    sick: Sick
    rehab: Rehab
    maternity: Maternity
    parental: Parental
    paternity: Paternity
    supplementary: Supplementary
    deadlines: Deadlines
    care: Care
    game: Game


def active(on: date | None = None) -> Params:
    """Params in force on `on` (default today)."""
    return Params.model_validate(repositories.get_config("params", (on or date.today()).isoformat()))
