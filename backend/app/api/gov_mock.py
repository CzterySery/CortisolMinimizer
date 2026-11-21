"""Simulated mObywatel / ZUS PUE / USC. The brief asks only for simulations."""
from fastapi import APIRouter

from app.api import todo
from app.schemas import (
    ApplicationIn,
    ApplicationOut,
    BirthCertificateRequest,
    DebtCertificate,
    EZla,
    InsurancePeriod,
    LoginRequest,
    Persona,
    PueMessage,
    PueReply,
    Session,
)

router = APIRouter(tags=["gov mocks"])


@router.get("/auth/personas")
def personas() -> list[Persona]:
    todo(5)


@router.post("/auth/mobywatel")
def login(req: LoginRequest) -> Session:
    todo(5)


@router.get("/zus/me/insurance")
def insurance() -> list[InsurancePeriod]:
    todo(5)


@router.get("/zus/me/ezla")
def ezla() -> list[EZla]:
    todo(5)


@router.get("/zus/me/debt-certificate")
def debt_certificate() -> DebtCertificate:
    todo(5)


@router.post("/pue/messages")
def pue(msg: PueMessage) -> PueReply:
    todo(5)


@router.post("/applications")
def submit_application(app_in: ApplicationIn) -> ApplicationOut:
    todo(5)


@router.post("/usc/birth-certificate")
def birth_certificate(req: BirthCertificateRequest) -> ApplicationOut:
    todo(5)
