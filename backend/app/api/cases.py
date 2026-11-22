"""Jury flow: pick or upload a ZUS case, then evaluate it with the same calculator and rules.

The case bundles are scans without a text layer. An upload is first matched by SHA-256 against the sample cases
transcribed into data/samples.json (numbers only). Any other bundle is read by the configured model (app/vision.py, app/llm.py)
when one is set up, and the user reviews the extracted facts; otherwise, or if reading fails, it is typed in.
Each unknown upload's hash (never the file) is stored with what the model read, so the same file is read once;
the user's corrections replace that reading."""
import hashlib
import json
import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, UploadFile

from app import llm, repositories, vision
from app.api.calc import plan as calculate
from app.repositories import DATA
from app.schemas import CaseInput, CaseVerdict, ParseResult, SampleCase

router = APIRouter(prefix="/cases", tags=["cases"])
MAX_UPLOAD = 40 * 1024 * 1024  # the largest sample bundle is ~25 MB; Gemini takes PDFs up to 50 MB
log = logging.getLogger(__name__)


def _samples() -> list[SampleCase]:
    return [SampleCase.model_validate(s) for s in json.loads((DATA / "samples.json").read_text(encoding="utf-8"))]


@router.get("/samples")
def samples() -> list[SampleCase]:
    return _samples()


@router.post("/parse")
async def parse(file: UploadFile) -> ParseResult:
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "Plik jest za duży (najwyżej 40 MB).")
    if not data.startswith(b"%PDF"):
        raise HTTPException(422, "To nie jest plik PDF.")
    digest = hashlib.sha256(data).hexdigest()
    sample = next((s for s in _samples() if digest in s.sha256), None)
    if sample:
        return ParseResult(sample=sample, needs_manual_entry=False,
                           message=f"Rozpoznano przykładową sprawę ZUS: {sample.source}. Dane przepisaliśmy z jej "
                                   "dokumentów; poniżej wynik kalkulatora i kwoty przyznane przez ZUS.")
    if (stored := repositories.upload_seen(digest)) is not None:
        case = CaseInput.model_validate(stored)
        return ParseResult(sample=None, extracted=case, sha256=digest, needs_manual_entry=False,
                           message=f"Ten plik był już wgrany: {case.title or 'sprawa'}. Dane pochodzą z wcześniejszego "
                                   "odczytu (modelem AI albo poprawionego ręcznie); sprawdź je w formularzu. Prawo do "
                                   "zasiłku i kwoty liczy kalkulator.")
    manual = "wpisz dane z dokumentów: okresy z wniosku i wynagrodzenie z Z-3 albo podstawę."
    if not vision.enabled():
        return ParseResult(sample=None, sha256=digest, needs_manual_entry=True,
                           message=f"Nie rozpoznaliśmy tego pliku, a odczyt skanów modelem AI jest wyłączony, więc {manual}")
    try:
        case = await vision.read_case(data)
    except Exception:  # provider error, timeout, refusal or output outside the CaseInput contract
        log.exception("The model could not read the uploaded case")
        return ParseResult(sample=None, sha256=digest, needs_manual_entry=True,
                           message=f"Model AI nie odczytał tego skanu, więc {manual}")
    repositories.save_reading(digest, case.model_dump(mode="json"))
    return ParseResult(sample=None, extracted=case, sha256=digest, needs_manual_entry=False,
                       message=f"Dane odczytał ze skanu model AI ({llm.provider().label}): {case.title or 'sprawa'}. Sprawdź je "
                               "w formularzu i popraw błędy odczytu; prawo do zasiłku i kwoty liczy kalkulator, nie model.")


@router.post("/evaluate")
def evaluate(case: CaseInput,
             upload: Annotated[str | None, Query(pattern=r"^[0-9a-f]{64}$")] = None) -> CaseVerdict:
    """`upload`: SHA-256 of the uploaded PDF the case was read from (ParseResult.sha256). The user's checked, possibly
    corrected case replaces that file's stored reading, once the calculator accepts it."""
    result = calculate(case.plan)  # same params, calculator, rules and paperwork as POST /calc/plan
    if upload:
        repositories.save_reading(upload, case.model_dump(mode="json"))
    errors = {i.code for i in result.issues if i.severity == "error"}
    missing = []
    unknown_bases = []
    insurance_unknown = False
    waiting_unknown = False
    if not any(b.kind != "vacation" for b in case.plan.blocks):
        missing.append("Dodaj okres świadczenia, którego dotyczy sprawa.")
        insurance_unknown = True
    for who in ("mother", "father"):
        parent = getattr(case.plan.family, who)
        blocks = [b for b in case.plan.blocks if b.who == who and b.kind != "vacation"]
        if not parent or not blocks:
            continue
        label = "Mama" if who == "mother" else "Tata"
        if parent.employment != "none" and not parent.insured_since and not parent.insurance_confirmed:
            missing.append(f"{label}: podaj początek ubezpieczenia albo potwierdź je na podstawie dokumentów.")
            insurance_unknown = True
        if any(b.kind == "sick" for b in blocks) and not parent.insured_since:
            missing.append(f"{label}: data początku ubezpieczenia jest potrzebna do okresu wyczekiwania.")
            waiting_unknown = True
        if (parent.employment != "none" and not parent.salary_history and parent.base_monthly is None
                and parent.gross_monthly_estimate is None and any(b.base_monthly is None for b in blocks)):
            unknown_bases.append(who)
            missing.append(f"{label}: uzupełnij podstawę zasiłku lub historię wynagrodzeń.")
    for issue in result.issues:
        if issue.code == "insured-parent.ends-before-birth":
            insurance_unknown = True
            missing.append("Potwierdź przedłużenie umowy albo właściwy wyjątek po ustaniu ubezpieczenia.")
        if issue.code in {"base.recalculation-needed", "base.components-review", "rehab.indexation-missing",
                          "floor.tax-not-modelled", "base.jdg-short-period", "rehab.sick-not-exhausted"}:
            missing.append(issue.text)
    insurance_error = any(code.startswith("insured-parent.") for code in errors)
    return CaseVerdict(insured=False if insurance_error else None if insurance_unknown else True,
                       waiting_period_ok=False if "sick-right.waiting-period" in errors else
                       None if waiting_unknown else True,
                       debt_block="debt.blocks-benefits" in errors,
                       entitled=False if errors else None if missing else True,
                       missing_data=missing, unknown_bases=unknown_bases, result=result)
