from fastapi import APIRouter, HTTPException

from app import params
from app.calc.base import benefit_base
from app.calc.family import event_date
from app.calc.paperwork import documents
from app.calc.plan import compute_plan
from app.calc.rules import check
from app.schemas import BaseRequest, BaseResult, Plan, PlanResult

router = APIRouter(prefix="/calc", tags=["calculator"])


@router.post("/base")
def base(req: BaseRequest) -> BaseResult:
    try:
        return benefit_base(req, params.active(req.event_date))  # rules in force on the event date
    except (ValueError, LookupError) as e:  # unusable input, or no params version for that date
        raise HTTPException(422, str(e)) from e


@router.post("/plan")
def plan(req: Plan) -> PlanResult:
    try:
        # shortcut: one params version (in force on the birth date) for the whole multi-year plan
        p = params.active(event_date(req))
        result = compute_plan(req, p)
        result.issues = check(req, result, p)
        result.documents = documents(req, p)
        return result
    except (ValueError, LookupError) as e:
        raise HTTPException(422, str(e)) from e
