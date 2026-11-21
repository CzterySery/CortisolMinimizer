"""All persistence in one place: the card catalog (shared JSON) and PostgreSQL for versioned config,
game states and mock submissions. Callers use these functions only, never SQL."""

import json
import os
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.schemas import Catalog

DEFAULT_CATALOG = Path(__file__).resolve().parents[2] / "shared" / "cards.json"
DATA = Path(__file__).parent / "data"
SEEDED_KINDS = ("params",)  # deck joins in B6 (seeded from the catalog)
LOCAL_DATABASE = "postgresql://zp:zp@localhost:5432/zp"  # `docker compose up -d db`


def get_catalog() -> Catalog:
    path = Path(os.environ.get("CARDS_DATA_PATH", str(DEFAULT_CATALOG)))
    return Catalog.model_validate_json(path.read_text(encoding="utf-8"))


@contextmanager
def db():
    # shortcut: one connection per call, fine for demo traffic; switch to psycopg_pool if load grows
    with psycopg.connect(os.environ.get("DATABASE_URL", LOCAL_DATABASE), row_factory=dict_row) as conn:
        yield conn  # commits on success, rolls back on error, then closes


def init() -> None:
    with db() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS config (
                kind TEXT NOT NULL, version INTEGER NOT NULL, effective_from DATE NOT NULL,
                data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (kind, version));
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY, state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kind TEXT NOT NULL,
                payload JSONB NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
        """)
        for kind in SEEDED_KINDS:
            data = json.loads((DATA / f"{kind}.json").read_text(encoding="utf-8"))
            c.execute("""INSERT INTO config (kind, version, effective_from, data) VALUES (%s, 1, %s, %s)
                         ON CONFLICT DO NOTHING""",
                      (kind, data.get("effective_from", "1970-01-01"), Jsonb(data)))


def get_config(kind: str, on: str) -> dict:
    """Newest version of `kind` already in force on date `on` (ISO)."""
    with db() as c:
        row = c.execute("""SELECT data FROM config WHERE kind = %s AND effective_from <= %s::date
                           ORDER BY effective_from DESC, version DESC LIMIT 1""", (kind, on)).fetchone()
    if row is None:
        raise LookupError(f"no {kind} in force on {on}")
    return row["data"]


def put_config(kind: str, data: dict) -> int:
    """Store a new version; old versions stay for audit. Returns the new version number."""
    with db() as c:
        row = c.execute("""INSERT INTO config (kind, version, effective_from, data)
                           SELECT %(kind)s, COALESCE(MAX(version), 0) + 1, %(effective_from)s, %(data)s
                           FROM config WHERE kind = %(kind)s
                           RETURNING version""",
                        {"kind": kind, "effective_from": data.get("effective_from", "1970-01-01"),
                         "data": Jsonb(data)}).fetchone()
    return row["version"]


def list_config(kind: str) -> list[dict]:
    with db() as c:
        return c.execute("SELECT version, effective_from, created_at FROM config WHERE kind = %s "
                         "ORDER BY version", (kind,)).fetchall()
