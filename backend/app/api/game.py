from datetime import date

from fastapi import APIRouter, HTTPException

from app import params, repositories
from app.api import todo
from app.game.engine import simulate
from app.schemas import (
    CardPreview,
    CardRequest,
    GameSimulation,
    GameState,
    NewGame,
    PlayResult,
    ScenarioSummary,
    SimulationRequest,
)

router = APIRouter(prefix="/game", tags=["game"])


@router.post("/simulate")
def simulate_plan(req: SimulationRequest) -> GameSimulation:
    data = repositories.get_game_scenarios()
    try:
        p = params.active(date.fromisoformat(data["family"]["birth_date"]))
        return simulate(req.scenario_id, req.selected, p, data, repositories.get_designed_cards())
    except (ValueError, LookupError) as error:
        raise HTTPException(422, str(error)) from error


@router.get("/scenarios")
def scenarios() -> list[ScenarioSummary]:
    todo(4)


@router.post("")
def new_game(req: NewGame) -> GameState:
    todo(4)


@router.get("/{game_id}")
def get_game(game_id: str) -> GameState:
    todo(4)


@router.post("/{game_id}/preview")
def preview(game_id: str, req: CardRequest) -> CardPreview:
    todo(4)


@router.post("/{game_id}/play")
def play(game_id: str, req: CardRequest) -> PlayResult:
    todo(4)


@router.get("/{game_id}/summary")
def summary(game_id: str) -> GameState:
    todo(4)
