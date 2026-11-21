"""Jedno miejsce do zastąpienia odczytem z przyszłej bazy danych."""

import os
from pathlib import Path

from app.schemas import Catalog

DEFAULT_CATALOG = Path(__file__).resolve().parents[2] / "shared" / "cards.json"


def get_catalog() -> Catalog:
    path = Path(os.environ.get("CARDS_DATA_PATH", str(DEFAULT_CATALOG)))
    return Catalog.model_validate_json(path.read_text(encoding="utf-8"))
