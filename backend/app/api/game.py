from datetime import date

from fastapi import APIRouter, HTTPException

from app import params, repositories
from app.game.engine import simulate
from app.schemas import GameSimulation, SimulationRequest

router = APIRouter(prefix="/game", tags=["game"])


@router.post("/simulate")
def simulate_plan(req: SimulationRequest) -> GameSimulation:
    """Stateless replay: the client sends every selected card id, the server rebuilds and judges one plan."""
    data = repositories.get_game_scenarios()
    try:
        p = params.active(date.fromisoformat(data["family"]["birth_date"]))
        return simulate(req.scenario_id, req.selected, p, data, repositories.get_designed_cards())
    except (ValueError, LookupError) as error:
        raise HTTPException(422, str(error)) from error
