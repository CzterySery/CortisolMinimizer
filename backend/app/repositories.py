"""All persistence in one place: the card catalog (shared JSON) and SQLite for versioned config,
game states and mock submissions. Swap the bodies for a real database without changing the API."""

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.schemas import Catalog

DEFAULT_CATALOG = Path(__file__).resolve().parents[2] / "shared" / "cards.json"
DATA = Path(__file__).parent / "data"
SEEDED_KINDS = ("params",)  # deck joins in B6 (seeded from the catalog)


def get_catalog() -> Catalog:
    path = Path(os.environ.get("CARDS_DATA_PATH", str(DEFAULT_CATALOG)))
    return Catalog.model_validate_json(path.read_text(encoding="utf-8"))


@contextmanager
def db():
    c = sqlite3.connect(os.environ.get("DB_PATH", "zp.db"))
    c.row_factory = sqlite3.Row
    try:
        with c:  # commits on success, rolls back on error
            yield c
    finally:
        c.close()


def init() -> None:
    with db() as c:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS config (
                kind TEXT NOT NULL, version INTEGER NOT NULL, effective_from TEXT NOT NULL,
                data TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (kind, version));
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, payload TEXT NOT NULL,
                status TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        """)
        for kind in SEEDED_KINDS:
            if not c.execute("SELECT 1 FROM config WHERE kind = ?", (kind,)).fetchone():
                data = json.loads((DATA / f"{kind}.json").read_text(encoding="utf-8"))
                c.execute("INSERT INTO config (kind, version, effective_from, data) VALUES (?, 1, ?, ?)",
                          (kind, data.get("effective_from", "1970-01-01"), json.dumps(data)))


def get_config(kind: str, on: str) -> dict:
    """Newest version of `kind` already in force on date `on` (ISO)."""
    with db() as c:
        row = c.execute("""SELECT data FROM config WHERE kind = ? AND effective_from <= ?
                           ORDER BY effective_from DESC, version DESC LIMIT 1""", (kind, on)).fetchone()
    if row is None:
        raise LookupError(f"no {kind} in force on {on}")
    return json.loads(row["data"])


def put_config(kind: str, data: dict) -> int:
    """Store a new version; old versions stay for audit. Returns the new version number."""
    with db() as c:
        version = c.execute("SELECT COALESCE(MAX(version), 0) + 1 FROM config WHERE kind = ?",
                            (kind,)).fetchone()[0]
        c.execute("INSERT INTO config (kind, version, effective_from, data) VALUES (?, ?, ?, ?)",
                  (kind, version, data.get("effective_from", "1970-01-01"), json.dumps(data)))
    return version


def list_config(kind: str) -> list[dict]:
    with db() as c:
        rows = c.execute("SELECT version, effective_from, created_at FROM config WHERE kind = ? "
                         "ORDER BY version", (kind,)).fetchall()
    return [dict(r) for r in rows]
