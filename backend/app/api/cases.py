"""Jury flow: pick or upload one of the ZUS sample cases, then evaluate it with the same calculator and rules.

The sample bundles are scans without a text layer. The app does no OCR (and no AI): an uploaded bundle is recognized
by its SHA-256 among the cases transcribed into data/samples.json (numbers only); anything else is entered by hand."""
import hashlib
import json

from fastapi import APIRouter, HTTPException, UploadFile

from app.api.calc import plan as calculate
from app.repositories import DATA
from app.schemas import CaseInput, CaseVerdict, ParseResult, SampleCase

router = APIRouter(prefix="/cases", tags=["cases"])
MAX_UPLOAD = 40 * 1024 * 1024  # the largest sample bundle is ~25 MB


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
    return ParseResult(sample=None, needs_manual_entry=True,
                       message="Nie rozpoznaliśmy tego pliku. Aplikacja nie odczytuje skanów (nie używa OCR ani AI), "
                               "więc wpisz dane z dokumentów: okresy z wniosku i wynagrodzenie z Z-3 albo podstawę.")


@router.post("/evaluate")
def evaluate(case: CaseInput) -> CaseVerdict:
    result = calculate(case.plan)  # same params, calculator, rules and paperwork as POST /calc/plan
    errors = {i.code for i in result.issues if i.severity == "error"}
    return CaseVerdict(insured=not any(code.startswith("insured-parent.") for code in errors),
                       waiting_period_ok="sick-right.waiting-period" not in errors,
                       debt_block="debt.blocks-benefits" in errors, entitled=not errors, result=result)
