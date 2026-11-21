from fastapi import APIRouter, HTTPException

from app import params
from app.api import todo
from app.calc.base import benefit_base
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
    todo(2)
