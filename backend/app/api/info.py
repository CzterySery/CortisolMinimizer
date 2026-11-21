import json

from fastapi import APIRouter

from app.repositories import DATA
from app.schemas import Charity, Link

router = APIRouter(prefix="/info", tags=["info"])


@router.get("/links")
def links() -> list[Link]:
    return json.loads((DATA / "links.json").read_text())


@router.get("/charities")
def charities() -> list[Charity]:
    # shortcut: empty until charities.json is curated (step 5), the list needs verified organisations
    path = DATA / "charities.json"
    return json.loads(path.read_text()) if path.exists() else []
