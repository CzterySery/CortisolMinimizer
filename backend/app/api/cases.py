from fastapi import APIRouter, UploadFile

from app.api import todo
from app.schemas import CaseInput, CaseVerdict, ParseResult

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/samples")
def samples() -> list[CaseInput]:
    todo(7)


@router.post("/parse")
def parse(file: UploadFile) -> ParseResult:
    todo(7)


@router.post("/evaluate")
def evaluate(case: CaseInput) -> CaseVerdict:
    todo(7)
