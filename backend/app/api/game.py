from fastapi import APIRouter

from app.api import todo
from app.schemas import CardPreview, CardRequest, GameState, NewGame, PlayResult, ScenarioSummary

router = APIRouter(prefix="/game", tags=["game"])


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
