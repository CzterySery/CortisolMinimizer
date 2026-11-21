"""The provider-neutral model interface: provider selection and what each adapter sends. No network."""
import asyncio
import base64
import io
import json
from types import SimpleNamespace

import httpx
import pypdfium2 as pdfium
import pytest

from app import llm


@pytest.fixture(autouse=True)
def fresh_provider(monkeypatch):
    for name in ("LLM_PROVIDER", "LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY", "GEMINI_API_KEY", "GEMINI_MODEL"):
        monkeypatch.delenv(name, raising=False)
    llm.provider.cache_clear()
    yield
    llm.provider.cache_clear()


def two_page_pdf() -> bytes:
    doc = pdfium.PdfDocument.new()
    doc.new_page(200, 300)
    doc.new_page(300, 200)
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def test_provider_selection(monkeypatch):
    assert llm.provider() is None  # nothing configured: manual entry
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    llm.provider.cache_clear()
    assert isinstance(llm.provider(), llm.Gemini)  # backwards compatible: a Gemini key alone selects Gemini
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_BASE_URL", "http://localhost:11434/v1/")
    monkeypatch.setenv("LLM_MODEL", "qwen2.5vl")
    llm.provider.cache_clear()
    chosen = llm.provider()
    assert isinstance(chosen, llm.OpenAICompatible) and chosen.label == "qwen2.5vl (localhost)"
    monkeypatch.setenv("LLM_PROVIDER", "nope")
    llm.provider.cache_clear()
    with pytest.raises(ValueError, match="gemini, openai"):
        llm.provider()


def test_openai_compatible_sends_page_images_and_schema(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "https://api.mistral.ai/v1")
    monkeypatch.setenv("LLM_MODEL", "mistral-medium")
    monkeypatch.setenv("LLM_API_KEY", "secret")
    seen = {}

    def server(request: httpx.Request) -> httpx.Response:
        seen.update(url=str(request.url), auth=request.headers.get("authorization"), body=json.loads(request.content))
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"title": "x"}'}}]})

    provider = llm.OpenAICompatible()
    provider.transport = httpx.MockTransport(server)
    assert asyncio.run(provider.json_from_pdf(two_page_pdf(), "read it", {"type": "object"})) == '{"title": "x"}'
    assert seen["url"] == "https://api.mistral.ai/v1/chat/completions" and seen["auth"] == "Bearer secret"
    body = seen["body"]
    assert body["model"] == "mistral-medium"
    assert body["response_format"]["json_schema"]["schema"] == {"type": "object"}
    parts = body["messages"][0]["content"]
    images = [p["image_url"]["url"] for p in parts if p["type"] == "image_url"]
    assert len(images) == 2 and parts[-1] == {"type": "text", "text": "read it"}
    assert base64.b64decode(images[0].removeprefix("data:image/jpeg;base64,"))[:2] == b"\xff\xd8"  # a JPEG


def test_openai_compatible_raises_on_http_errors(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://localhost:8001/v1")
    monkeypatch.setenv("LLM_MODEL", "m")
    provider = llm.OpenAICompatible()
    provider.transport = httpx.MockTransport(lambda request: httpx.Response(400, json={"error": "bad schema"}))
    with pytest.raises(httpx.HTTPStatusError):
        asyncio.run(provider.json_from_pdf(two_page_pdf(), "read it", {}))


def test_gemini_sends_the_pdf_itself(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    seen = {}

    async def generate_content(*, model, contents, config):
        seen.update(model=model, pdf=contents[0].inline_data.data, schema=config.response_json_schema)
        return SimpleNamespace(text='{"title": "x"}')

    provider = llm.Gemini()
    provider.client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)))
    assert asyncio.run(provider.json_from_pdf(b"%PDF-1.4 scan", "read it", {"type": "object"})) == '{"title": "x"}'
    assert seen == {"model": "gemini-3.8-flash", "pdf": b"%PDF-1.4 scan", "schema": {"type": "object"}}
