import os

import pytest


@pytest.fixture(autouse=True)
def no_real_model_keys(monkeypatch):
    """Unit tests never call a real model: ignore keys in the developer's environment and .env files."""
    from app import rag
    for name in ("GEMINI_API_KEY", "GEMINI_MODEL", "LLM_PROVIDER", "LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(rag, "_read_env_value", lambda name: os.environ.get(name, "").strip())
