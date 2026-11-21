from fastapi import APIRouter

from app.api import todo
from app.schemas import BaseRequest, BaseResult, Plan, PlanResult

router = APIRouter(prefix="/calc", tags=["calculator"])


@router.post("/base")
def base(req: BaseRequest) -> BaseResult:
    todo(2)


@router.post("/plan")
def plan(req: Plan) -> PlanResult:
    todo(2)
