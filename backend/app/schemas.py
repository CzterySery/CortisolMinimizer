"""API contract. Frontend types are generated from these via /openapi.json — change here, then `npm run gen:api`."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


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
    knowledge = points earned from educational cards."""
    id: Literal["money", "time", "knowledge"]
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
    insured_until: date | None = None  # last day of the insurance title: contract end, JDG closed (brief H.3)
    insurance_confirmed: bool = False  # explicit confirmation from insurance records when dates are unavailable
    base_monthly: Decimal | None = None   # podstawa wymiaru; derived from salary_history when absent
    gross_monthly_estimate: Decimal | None = Field(None, gt=0)  # explicit quick employee estimate, not pay history
    salary_history: list[MonthPay] = []
    full_time: bool = True  # art. 45 floor when the base is computed from salary_history
    payer_insured_count: int = 0          # >threshold => employer pays benefits
    age: int = 30
    vacation_days_left: int = 26
    contribution_debt: Decimal = Decimal(0)


class Hospitalization(Model):
    pregnancy_week: int = Field(ge=1, le=45)
    birth_weight_g: int = Field(gt=0)
    hospital_days: int = Field(ge=0)  # qualifying days from the hospital certificate; the calculator caps weeks


class AdoptedChild(Model):
    birth_date: date
    school_deferred: bool = False


class MaternityTakeover(Model):
    reason: Literal["death", "hospital", "abandonment", "incapacity"]
    start: date  # death/abandonment date, hospital admission or incapacity onset
    end: date | None = None  # inclusive hospital discharge; required for hospital takeover

    @model_validator(mode="after")
    def valid_period(self):
        if self.reason == "hospital" and (self.end is None or self.end < self.start):
            raise ValueError("Podaj prawidłową datę zakończenia hospitalizacji mamy.")
        return self


class Adoption(Model):
    kind: Literal["adoption", "foster"]
    child_age_years: int | None = Field(None, ge=0)  # legacy; exact limits require Family.birth_date
    accepted_on: date
    court_applied_on: date | None = None
    court_final_on: date | None = None
    school_deferred: bool = False
    professional_foster: bool = False
    applicant: Who = "mother"
    previous_maternity_days: int = Field(0, ge=0)
    previous_parental_mother_days: int = Field(0, ge=0)
    previous_parental_father_days: int = Field(0, ge=0)
    children: list[AdoptedChild] = []


class Family(Model):
    mother: Parent
    father: Parent | None = None
    due_date: date
    birth_date: date | None = None
    child_died_on: date | None = None  # stillbirth = the birth date; caps maternity (KP art. 180^1)
    surviving_children: int | None = Field(None, ge=0)  # after the recorded death; None preserves old single-loss plans
    maternity_takeover: MaternityTakeover | None = None
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
    base_monthly: Decimal | None = Field(None, gt=0)  # verified base for this period, takes precedence over parent base
    rehab_indexation_factor: Decimal | None = Field(None, ge=1)  # published factor for quarter of rehab start
    monthly_tax_advance: Decimal | None = Field(None, ge=0)  # verified advance for the full monthly benefit


class Plan(Model):
    family: Family
    blocks: list[Block] = []
    rate_variant: Literal["standard", "averaged"] = "standard"  # 100/70 vs 81.5
    today: date | None = None  # deadlines are checked against this
    averaged_request_on: date | None = None  # actual/planned application date, not today's date


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
    benefit: Decimal = Decimal(0)  # benefit for this period, the figure a ZUS decision shows


class Pools(Model):
    maternity_days_left: int
    parental_days_left: int
    exclusive_days_left: dict[Who, int]
    paternity_days_left: int
    parental_parts_used: int
    care_days_left: int


class Document(Model):
    form: str  # ZAM, Z-3, Z-15A, wniosek o urlop ...
    who: Who  # whose benefit or leave it is (a Z-3 is still issued by the employer)
    recipient: Recipient
    due_by: date | None = None
    done: bool = False
    rule: str  # legal basis, e.g. "KP art. 182^1d § 1; rozp. wn. § 15"
    note: str = ""  # how to file it, what to attach, who issues it
    start: date | None = None  # the period it concerns, for pre-filled forms
    end: date | None = None


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
    bases: dict[Who, Decimal] = {}  # podstawa wymiaru per parent


class BaseRequest(Model):
    employment: Employment
    event_date: date  # start of the incapacity / birth; the 12-month window ends the month before
    months: list[MonthPay] = []  # pay (employee) or declared contribution base (non-employee) per month
    full_time: bool = True  # the minimum-wage floor (art. 45) applies to full-time employees only
    contract_monthly: Decimal | None = None  # monthly pay from the contract, used when no full month exists (art. 37)


class BaseResult(Model):
    base: Decimal
    steps: list[Explain]


# --- game (stateless replay, game/engine.py) ---

class ScenarioSummary(Model):
    id: str
    title: str
    description: str


class SimulationRequest(Model):
    scenario_id: Literal["standard", "hospital", "za-zyciem"] = "standard"
    selected: list[str] = Field(default_factory=list, max_length=5)


class SimulatedCard(Model):
    id: str
    available: bool
    issues: list[Issue]
    statistics: list[Statistic]
    pools: Pools


class GameSimulation(Model):
    scenario: ScenarioSummary
    plan: Plan
    result: PlanResult
    statistics: list[Statistic]
    candidates: list[SimulatedCard]
    reservations: dict[str, int]
    horizon_start: date
    horizon_end: date


# --- jury cases ---

class CaseInput(Model):
    """A case as read from the documents: the family facts and the periods applied for."""
    plan: Plan
    title: str = ""  # e.g. "Zasiłek chorobowy w ciąży, umowa o pracę"


class Granted(Model):
    """What a ZUS payout printout shows for one parent."""
    who: Who
    base: Decimal | None = None  # podstawa wymiaru
    daily: Decimal | None = None  # stawka dzienna
    months: dict[str, Decimal] = {}  # amount paid per calendar month ("2026-09": ...)


class SampleCase(CaseInput):
    """A ZUS sample case transcribed into numbers (no names, no documents), with ZUS's own outcome to compare."""
    id: str
    source: str  # which ZUS sample bundle the numbers were transcribed from
    sha256: list[str] = []  # of the bundle PDF(s), to recognize an upload
    zus_entitled: bool
    zus_outcome: str  # ZUS's decision in one sentence
    granted: list[Granted] = []
    note: str = ""  # what was transcribed and any assumption made


class ParseResult(Model):
    sample: SampleCase | None  # the upload is one of the ZUS sample bundles, recognized by its SHA-256
    extracted: CaseInput | None = None  # read from the scan by the vision model; the user reviews it before trusting it
    sha256: str | None = None  # of a non-sample upload; POST /cases/evaluate?upload= stores the user's corrections
    needs_manual_entry: bool
    message: str


class CaseVerdict(Model):
    insured: bool | None  # None: missing dates or an unresolved insurance exception
    waiting_period_ok: bool | None
    debt_block: bool
    entitled: bool | None  # None: incomplete facts; False only for a demonstrated legal error
    missing_data: list[str] = []
    unknown_bases: list[Who] = []
    result: PlanResult  # bases, benefit per period (calendar), months, issues, documents, explain


# --- simulated gov services (mObywatel, ZUS PUE/eZUS, USC) ---

class Persona(Model):
    id: str
    name: str
    description: str
    who: Who  # whose mObywatel identity it is


class DemoPersonalData(Model):
    """Fictional profile data, separate from the legal calculator's family facts."""
    pesel: str | None = Field(None, pattern=r"^\d{11}$")
    birth_date: date
    street: str
    house_number: str
    apartment_number: str = ""
    postal_code: str
    city: str


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
    payer_data: "DemoPayerData | None" = None


class DemoPayerData(Model):
    """Complete fictional payer identity for form previews, attached to its insurance period."""
    name: str
    nip: str
    regon: str
    street: str
    house_number: str
    apartment_number: str = ""
    postal_code: str
    city: str
    phone: str = ""


class EZla(Model):
    number: str
    start: date
    end: date
    code_b: bool  # pregnancy code "B" => 100%


class DebtCertificate(Model):
    as_of: date  # the day the right to the first benefit arises
    debt: Decimal
    blocks_benefits: bool  # art. 2a: JDG debt above the threshold


class FiledApplication(Model):
    form: str  # the Document.form it answers, so /applications can mark that document done
    who: Who
    recipient: Recipient
    filed_on: date
    status: str
    start: date | None = None
    end: date | None = None
    document_id: str | None = None
    payload: dict[str, str] = {}


class ZusAccount(Model):
    persona: Persona
    insurance: list[InsurancePeriod]  # empty = no insurance title on record
    ezla: list[EZla]
    debt: DebtCertificate
    applications: list[FiledApplication]  # already filed, including those sent from this app
    plan: Plan  # ZUS records plus the person's own entries (partner, planned leave), ready for the calculator
    personal_data: DemoPersonalData | None = None


class PueMessage(Model):
    question: str = Field(min_length=1, max_length=2000)


class PueSource(Model):
    title: str
    locator: str = ""
    url: str
    snippet: str = ""


class PueReply(Model):
    answer: str
    links: list[str] = []
    sources: list[PueSource] = []
    mode: Literal["gemini-rag", "local-rag", "fallback"] = "local-rag"


class ApplicationIn(Model):
    form: str = Field(min_length=1, max_length=200)
    who: Who
    recipient: Recipient
    payload: dict[str, str] = {}  # the filled-in form fields
    start: date | None = None
    end: date | None = None
    document_id: str | None = None
    official_fields: dict[str, str] = {}  # native PDF field IDs -> reviewed values

    @model_validator(mode="after")
    def valid_period(self):
        # Older clients stored period fields inside payload; keep accepting that wire format.
        if self.start is None and self.payload.get("okres_od"):
            self.start = date.fromisoformat(self.payload["okres_od"])
        if self.end is None and self.payload.get("okres_do"):
            self.end = date.fromisoformat(self.payload["okres_do"])
        if (self.start is None) != (self.end is None) or (self.start and self.end < self.start):
            raise ValueError("Podaj obie daty okresu we właściwej kolejności.")
        for key, value in (("okres_od", self.start), ("okres_do", self.end)):
            if value and key in self.payload and self.payload[key] != value.isoformat():
                raise ValueError("Okres formularza nie zgadza się z okresem dokumentu.")
        return self


class ApplicationOut(Model):
    id: int
    recipient: Recipient
    status: str


class BirthCertificateRequest(Model):
    who: Who  # the parent who needs it
    child_name: str = Field(min_length=1, max_length=200)
    birth_date: date
    full_copy: bool = False  # odpis zupełny instead of skrócony


class Link(Model):
    title: str
    url: str


class Charity(Model):
    name: str
    url: str
    krs: str  # checked on the organisation's own site; see AGENTS.md
    description: str
    helps_with: list[str]
    phone: str = ""


# --- admin ---

class Submission(Model):
    id: int
    kind: str
    payload: dict[str, Any]
    status: str
    created_at: datetime


class ConfigVersion(Model):
    version: int
    effective_from: date
    created_at: datetime
