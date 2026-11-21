"""API contract. Frontend types are generated from these via /openapi.json — change here, then `npm run gen:api`."""
from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class Model(BaseModel):
    # Responses always include defaulted fields, so the generated TS marks them required there;
    # request bodies keep them optional.
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)

Who = Literal["mother", "father"]
Employment = Literal["employee", "contract", "self_employed", "none"]  # UoP, zlecenie, JDG, brak tytułu
BlockKind = Literal["sick", "rehab", "job_loss_benefit", "maternity", "supplementary",
                    "paternity", "parental", "care", "vacation"]
Recipient = Literal["employer", "zus", "usc"]


# --- card catalog (shared/cards.json) ---

class Source(Model):
    id: str
    title: str
    url: HttpUrl
    locator: str | None = None


class Requirement(Model):
    fact: str  # dotted path into scenario facts/flags, e.g. "family.mother.employment"
    op: Literal["==", "!=", ">", ">=", "<", "<=", "in"]
    value: Any


class Combo(Model):
    with_: list[str] = Field(alias="with")
    name: str
    check: Literal["touching", "overlap", "budget_ok", "docs_complete", "covers_need"]
    mult: Decimal


class Card(Model):
    id: str
    round_id: int = Field(ge=1, le=5)
    title: str
    description: str
    sources: list[Source] = Field(default_factory=list)
    # game mechanics (B4); empty in the preview catalog
    tags: list[str] = []
    requires: list[Requirement] = []
    effects: list[dict[str, Any]] = []  # effect primitives, see game/effects.py
    chips: int = 0
    combos: list[Combo] = []


class Stage(Model):
    id: int = Field(ge=1, le=5)
    title: str
    description: str  # the family's story for this round


class Round(Stage):
    cards: list[Card] = Field(min_length=3, max_length=3)


class Catalog(Model):
    rounds: list[Round] = Field(min_length=5, max_length=5)


class Statistic(Model):
    """Sidebar stat. money = family budget, time = days a parent is home when the child needs care,
    happiness = game score (chips x mult)."""
    id: Literal["money", "time", "happiness"]
    label: str
    value: int | None = None
    unit: str
    max: int | None = None  # fills the stat track when known (e.g. time: covered / needed days)


class Preview(Model):
    """Static board preview: the catalog with empty stats, playable without a game session."""
    mode: Literal["preview"] = "preview"
    current_round: int = 1
    total_rounds: int = 5
    hand_size: int = 3
    statistics: list[Statistic]
    rounds: list[Round]


# --- family & plan (input to the calculator and the game) ---

class MonthPay(Model):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    gross: Decimal
    worked_days: int | None = None    # with required_days: art. 38 half-month exclusion / top-up
    required_days: int | None = None
    quarterly_bonus: Decimal = Decimal(0)
    annual_bonus: Decimal = Decimal(0)


class Parent(Model):
    employment: Employment
    voluntary_sickness: bool = False
    insured_since: date | None = None
    base_monthly: Decimal | None = None   # podstawa wymiaru; derived from salary_history when absent
    salary_history: list[MonthPay] = []
    payer_insured_count: int = 0          # >threshold => employer pays benefits
    age: int = 30
    vacation_days_left: int = 26
    contribution_debt: Decimal = Decimal(0)


class Hospitalization(Model):
    pregnancy_week: int
    birth_weight_g: int
    hospital_days: int


class Adoption(Model):
    kind: Literal["adoption", "foster"]
    child_age_years: int
    accepted_on: date


class Family(Model):
    mother: Parent
    father: Parent | None = None
    due_date: date
    birth_date: date | None = None
    children: int = Field(1, ge=1)
    za_zyciem: bool = False
    hospitalization: Hospitalization | None = None
    adoption: Adoption | None = None


class Block(Model):
    who: Who
    kind: BlockKind
    start: date
    days: int = Field(gt=0)
    work_fraction: Decimal = Field(Decimal(0), ge=0, lt=1)  # part-time parental leave


class Plan(Model):
    family: Family
    blocks: list[Block] = []
    rate_variant: Literal["standard", "averaged"] = "standard"  # 100/70 vs 81.5
    today: date | None = None  # deadlines are checked against this


# --- calculator output ---

class Explain(Model):
    text: str
    rule: str  # e.g. "art. 31 ust. 1 ustawy zasiłkowej"


class MonthRow(Model):
    month: str
    salary: dict[Who, Decimal]
    benefit: dict[Who, Decimal]
    total: Decimal
    below_target: bool


class CalendarEntry(Model):
    who: Who
    kind: BlockKind
    start: date
    end: date


class Pools(Model):
    maternity_days_left: int
    parental_days_left: int
    exclusive_days_left: dict[Who, int]
    paternity_days_left: int
    parental_parts_used: int
    care_days_left: int


class Document(Model):
    form: str  # ZAM, Z-3, Z-15A, wniosek o urlop ...
    who: Who
    recipient: Recipient
    due_by: date | None = None
    done: bool = False


class Issue(Model):
    code: str
    severity: Literal["error", "warning", "info"]
    text: str
    rule: str


class PlanResult(Model):
    months: list[MonthRow]
    calendar: list[CalendarEntry]
    pools: Pools
    documents: list[Document]
    issues: list[Issue]
    explain: list[Explain]
    top_up: Decimal = Decimal(0)  # wyrównanie do 100% (art. 31 ust. 4)


class BaseRequest(Model):
    employment: Employment
    event_date: date
    months: list[MonthPay]


class BaseResult(Model):
    base: Decimal
    steps: list[Explain]


# --- game session (B4) ---

class ScenarioSummary(Model):
    id: str
    title: str
    description: str


class NewGame(Model):
    scenario_id: str | None = None
    persona_id: str | None = None
    family: Family | None = None  # custom family facts => generic story


class ScoreLine(Model):
    label: str
    points: int


class GameState(Model):
    id: str
    scenario_id: str
    seed: int
    plan: Plan
    current_round: int  # 1..total_rounds; finished games keep the last round
    total_rounds: int = 5
    hand_size: int = 3
    stages: list[Stage]  # this scenario's story per round (round track labels + story panel)
    statistics: list[Statistic]  # money / time / happiness, derived from the plan and score
    table: list[Card]  # played cards, in round order
    hand: list[Card]
    combos_hit: list[str]
    result: PlanResult | None = None
    bonuses: list[ScoreLine] = []  # end-of-game bonuses: no care gap, budget kept, no missed deadline
    finished: bool = False


class CardRequest(Model):
    card_id: str


class CardPreview(Model):
    card_id: str
    statistics: list[Statistic]  # projected values if this card is played; UI shows the difference
    pools: Pools
    new_documents: list[Document]
    new_issues: list[Issue]  # e.g. "budget drops below target in 2027-05"


class PlayResult(Model):
    state: GameState
    combos: list[str]
    chips: int
    mult: Decimal
    points: int  # chips x mult, added to the happiness stat


# --- jury cases ---

class CaseInput(Model):
    event: Literal["sickness", "birth", "adoption"]
    event_date: date
    family: Family


class ParseResult(Model):
    form_detected: str | None
    case: CaseInput | None
    missing_fields: list[str]
    needs_manual_entry: bool


class CaseVerdict(Model):
    insured_on_event_date: bool
    waiting_period_ok: bool
    debt_block: bool
    entitled: list[str]
    base: Decimal | None
    result: PlanResult | None
    explain: list[Explain]


# --- simulated gov services ---

class Persona(Model):
    id: str
    name: str
    description: str


class LoginRequest(Model):
    persona_id: str


class Session(Model):
    token: str
    persona: Persona


class InsurancePeriod(Model):
    title: str  # umowa o pracę, zlecenie, JDG
    payer: str
    start: date
    end: date | None
    sickness_insurance: bool
    contribution_base: Decimal


class EZla(Model):
    number: str
    start: date
    end: date
    code_b: bool  # pregnancy code "B" => 100%


class DebtCertificate(Model):
    as_of: date
    debt: Decimal
    blocks_benefits: bool


class PueMessage(Model):
    question: str


class PueReply(Model):
    answer: str
    links: list[str] = []


class ApplicationIn(Model):
    form: str
    who: Who
    payload: dict[str, Any]


class ApplicationOut(Model):
    id: int
    recipient: Recipient
    status: str


class BirthCertificateRequest(Model):
    child_name: str
    birth_date: date
    full_copy: bool = False


class Link(Model):
    title: str
    url: str


class Charity(Model):
    name: str
    url: str
    helps_with: list[str]


# --- admin ---

class Submission(Model):
    id: int
    kind: str
    payload: dict[str, Any]
    status: str
    created_at: str


class ConfigVersion(Model):
    version: int
    effective_from: str
    created_at: str
