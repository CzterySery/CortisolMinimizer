from fastapi import APIRouter, HTTPException

from app.repositories import get_catalog
from app.schemas import Card, Catalog, Preview, Round, Statistic

router = APIRouter(prefix="/api/v1")


@router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/cards", response_model=list[Card], tags=["catalog"])
def cards() -> list[Card]:
    return [card for stage in get_catalog().rounds for card in stage.cards]


@router.get("/rounds", response_model=Catalog, tags=["catalog"])
def rounds() -> Catalog:
    return get_catalog()


@router.get("/rounds/{round_id}", response_model=Round, tags=["catalog"])
def round_detail(round_id: int) -> Round:
    for stage in get_catalog().rounds:
        if stage.id == round_id:
            return stage
    raise HTTPException(status_code=404, detail="Nie znaleziono rundy")


@router.get("/game/preview", response_model=Preview, tags=["preview"])
def preview() -> Preview:
    return Preview(
        statistics=[
            Statistic(id="money", label="Pieniądze", unit="zł"),
            Statistic(id="time", label="Czas", unit="dni"),
            Statistic(id="happiness", label="Szczęście", unit="pkt"),
        ],
        rounds=get_catalog().rounds,
    )
