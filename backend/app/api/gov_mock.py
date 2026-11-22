"""Simulated mObywatel / ZUS PUE (eZUS) / USC. The brief asks only for simulations: personas are fictional,
filings are stored in `submissions` and go nowhere."""
import hmac
import os
import secrets
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException

from app import params, rag, repositories
from app.calc.base import money
from app.document_identity import document_id, validate_fields
from app.params import Params
from app.schemas import (
    ApplicationIn,
    ApplicationOut,
    BirthCertificateRequest,
    DebtCertificate,
    DemoPersonalData,
    EZla,
    FiledApplication,
    InsurancePeriod,
    LoginRequest,
    Persona,
    Plan,
    PueMessage,
    PueReply,
    Session,
    ZusAccount,
)

router = APIRouter(tags=["gov mocks"])
SENT = "wysłano (symulacja)"


class PersonaRecord(Persona):
    """A persona as stored in data/personas.json: identity, ZUS records and the plan it starts from."""
    insurance: list[InsurancePeriod]
    ezla: list[EZla]
    applications: list[FiledApplication]
    plan: Plan
    personal_data: DemoPersonalData | None = None


# shortcut: simulated login; the token is the persona id signed with a per-process (or SESSION_SECRET) key,
# so it can't be forged by editing the id, but there are no real accounts behind it
SECRET = os.environ.get("SESSION_SECRET", "").encode() or secrets.token_bytes(32)


def _token(persona_id: str) -> str:
    return f"{persona_id}.{hmac.new(SECRET, persona_id.encode(), 'sha256').hexdigest()}"


def _personas() -> dict[str, PersonaRecord]:
    return {p["id"]: PersonaRecord.model_validate(p) for p in repositories.get_personas()}


def current_persona(authorization: str = Header("")) -> PersonaRecord:
    token = authorization.removeprefix("Bearer ")
    persona = _personas().get(token.partition(".")[0])
    if persona is None or not hmac.compare_digest(token, _token(persona.id)):
        raise HTTPException(401, "Zaloguj się przez mObywatel (symulacja).")
    return persona


def optional_persona(authorization: str = Header("")) -> PersonaRecord | None:
    return current_persona(authorization) if authorization else None


Me = Annotated[PersonaRecord, Depends(current_persona)]
MaybeMe = Annotated[PersonaRecord | None, Depends(optional_persona)]


@router.get("/auth/personas")
def personas() -> list[Persona]:
    return [Persona.model_validate(p.model_dump()) for p in _personas().values()]


@router.post("/auth/mobywatel")
def login(req: LoginRequest) -> Session:
    persona = _personas().get(req.persona_id)
    if persona is None:
        raise HTTPException(404, "Nie ma takiej osoby w symulacji.")
    return Session(token=_token(persona.id), persona=Persona.model_validate(persona.model_dump()))


@router.get("/zus/me")
def account(persona: Me) -> ZusAccount:
    """Everything the simulated eZUS account shows: insurance, e-ZLA, debt certificate, filed applications."""
    family = persona.plan.family
    parent = getattr(family, persona.who)
    birth = family.birth_date or family.due_date
    as_of = min([b.start for b in persona.plan.blocks if b.who == persona.who] + [birth])
    p = params.active(as_of)
    debt = parent.contribution_debt
    filed = [_filed(row) for row in repositories.list_submissions(persona.id)
             if row["kind"] in ("application", "usc")]
    return ZusAccount(
        persona=Persona.model_validate(persona.model_dump()), insurance=persona.insurance, ezla=persona.ezla,
        # same condition as rules.py debt.blocks-benefits (art. 2a)
        debt=DebtCertificate(as_of=as_of, debt=money(debt), blocks_benefits=parent.employment == "self_employed"
                             and debt > p.debt_threshold_pct_min_wage * p.min_wage),
        applications=filed + persona.applications, plan=persona.plan, personal_data=persona.personal_data)


def _filed(row: dict) -> FiledApplication:
    stored = row["payload"]
    fields = stored.get("payload", {})
    # Older receipts already stored exact period fields inside payload; recover only those dates, never guess.
    def on(key: str, legacy: str):
        raw = stored.get(key) or fields.get(legacy)
        try:
            return date.fromisoformat(raw) if raw else None
        except (TypeError, ValueError):
            return None

    start, end = on("start", "okres_od"), on("end", "okres_do")
    if (start is None) != (end is None) or (start and end < start):
        start = end = None  # an incomplete legacy interval cannot mark a dated document done
    return FiledApplication(form=stored["form"], who=stored["who"], recipient=stored["recipient"],
                            filed_on=row["created_at"].date(), status=row["status"], start=start, end=end,
                            document_id=document_id(stored["form"], stored["who"], stored["recipient"], start, end),
                            payload=fields | {f"pdf:{k}": v for k, v in stored.get("official_fields", {}).items()})


@router.post("/applications")
def submit_application(app_in: ApplicationIn, persona: MaybeMe) -> ApplicationOut:
    validate_fields(app_in)
    identity = document_id(app_in.form, app_in.who, app_in.recipient, app_in.start, app_in.end)
    if app_in.document_id is not None and app_in.document_id != identity:
        raise HTTPException(422, "Identyfikator nie odpowiada dokumentowi i jego okresowi.")
    payload = app_in.model_dump(mode="json") | {"persona": persona.id if persona else None}
    payload["document_id"] = identity
    return ApplicationOut(id=repositories.add_submission("application", payload, SENT), recipient=app_in.recipient,
                          status=SENT)


@router.post("/usc/birth-certificate")
def birth_certificate(req: BirthCertificateRequest, persona: MaybeMe) -> ApplicationOut:
    form = "Odpis zupełny aktu urodzenia" if req.full_copy else "Odpis skrócony aktu urodzenia"
    payload = req.model_dump(mode="json") | {"form": form, "recipient": "usc", "persona": persona.id if persona else None}
    return ApplicationOut(id=repositories.add_submission("usc", payload, SENT), recipient="usc", status=SENT)


@router.post("/pue/messages")
def pue(msg: PueMessage, persona: MaybeMe) -> PueReply:
    reply = answer(msg.question, params.active(date.today()), persona)
    repositories.add_submission("pue", {"question": msg.question, "persona": persona.id if persona else None,
                                        "mode": reply.mode}, "odpowiedź automatyczna")
    return reply


def answer(question: str, p: Params, persona: PersonaRecord | None = None) -> PueReply:
    """RAG assistant over all loaded ZUS/Labour Code documents, rules, forms and cards."""
    return rag.answer_question(question, p, persona)


fill = rag.fill_params
