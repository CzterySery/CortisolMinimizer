"""Jury flow: pick or upload a ZUS case, then evaluate it with the same calculator and rules.

The case bundles are scans without a text layer. An upload is first matched by SHA-256 against the sample cases
transcribed into data/samples.json (numbers only). Any other bundle is read by a Gemini model (app/vision.py) when
GEMINI_API_KEY is set, and the user reviews the extracted facts; otherwise, or if reading fails, it is typed in.
Each unknown upload's hash (never the file) is stored with what the model read, so the same file is read once;
the user's corrections replace that reading."""
import hashlib
import json
import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, UploadFile

from app import repositories, vision
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
        log.exception("Gemini could not read the uploaded case")
        return ParseResult(sample=None, sha256=digest, needs_manual_entry=True,
                           message=f"Model AI nie odczytał tego skanu, więc {manual}")
    repositories.save_reading(digest, case.model_dump(mode="json"))
    return ParseResult(sample=None, extracted=case, sha256=digest, needs_manual_entry=False,
                       message=f"Dane odczytał ze skanu model AI ({vision.MODEL}): {case.title or 'sprawa'}. Sprawdź je "
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
    return CaseVerdict(insured=not any(code.startswith("insured-parent.") for code in errors),
                       waiting_period_ok="sick-right.waiting-period" not in errors,
                       debt_block="debt.blocks-benefits" in errors, entitled=not errors, result=result)
