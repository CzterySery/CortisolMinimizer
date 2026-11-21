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
LOCAL_DATABASE = "postgresql://otwartekarty:otwartekarty@localhost:5432/otwartekarty"  # `docker compose up -d db`


def get_catalog() -> Catalog:
    path = Path(os.environ.get("CARDS_DATA_PATH", str(DEFAULT_CATALOG)))
    return Catalog.model_validate_json(path.read_text(encoding="utf-8"))


def get_designed_cards() -> list[dict]:
    """The authored 30-card deck is distinct from the legacy 15-card catalog."""
    return json.loads(DEFAULT_CATALOG.with_name("deck-design.json").read_text(encoding="utf-8"))["cards"]


def get_game_scenarios() -> dict:
    return json.loads((DATA / "scenarios.json").read_text(encoding="utf-8"))


def seed_params() -> list[tuple[int, dict]]:
    """Params versions shipped with the code: params.json is version 1 (in force now); params-history.json lists
    older years as overrides on top of it (minimum wage, voluntary base cap), seeded as versions -n..-1."""
    current = json.loads((DATA / "params.json").read_text(encoding="utf-8"))
    history = json.loads((DATA / "params-history.json").read_text(encoding="utf-8"))
    return [(i - len(history), current | older) for i, older in enumerate(history)] + [(1, current)]


def get_personas() -> list[dict]:
    """Fictional mObywatel identities with their simulated ZUS records."""
    return json.loads((DATA / "personas.json").read_text(encoding="utf-8"))


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
        # versions <= 1 are the seeds shipped with the code: refreshed on every start so new legal fields reach
        # existing databases; admin edits are versions >= 2 and stay untouched
        for version, data in seed_params():
            c.execute("""INSERT INTO config (kind, version, effective_from, data) VALUES ('params', %s, %s, %s)
                         ON CONFLICT (kind, version) DO UPDATE
                         SET effective_from = EXCLUDED.effective_from, data = EXCLUDED.data""",
                      (version, data["effective_from"], Jsonb(data)))


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


def add_submission(kind: str, payload: dict, status: str) -> int:
    """Store a simulated filing (application, USC request, PUE question); returns its number."""
    with db() as c:
        return c.execute("INSERT INTO submissions (kind, payload, status) VALUES (%s, %s, %s) RETURNING id",
                         (kind, Jsonb(payload), status)).fetchone()["id"]


def list_submissions(persona: str | None = None) -> list[dict]:
    """Newest first; with `persona`, only what that mObywatel identity sent (otherwise everything, for the admin)."""
    with db() as c:
        if persona is None:
            return c.execute("SELECT id, kind, payload, status, created_at FROM submissions ORDER BY id DESC").fetchall()
        return c.execute("SELECT id, kind, payload, status, created_at FROM submissions "
                         "WHERE payload->>'persona' = %s ORDER BY id DESC", (persona,)).fetchall()
