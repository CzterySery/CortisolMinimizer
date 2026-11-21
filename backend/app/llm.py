"""Provider-neutral model calls: a scanned PDF + instructions + a JSON schema in, JSON text out.

The provider is chosen with LLM_PROVIDER (read once per process):
- gemini: Google Gemini through its SDK, the PDF sent as is. GEMINI_API_KEY, GEMINI_MODEL.
- openai: any OpenAI-compatible chat completions API: OpenAI, Mistral (EU), Azure OpenAI, or an open-weight model
  served locally by vLLM, Ollama or LM Studio. LLM_BASE_URL (e.g. http://localhost:11434/v1), LLM_MODEL,
  LLM_API_KEY when the server needs one. The PDF is rendered to page images here, so the model must accept images.
Without LLM_PROVIDER, a set GEMINI_API_KEY selects gemini; with neither, there is no provider (manual entry).
Adding a provider = one class with `label` and `json_from_pdf`, registered in PROVIDERS."""
import asyncio
import base64
import io
import os
from functools import cache
from typing import Protocol
from urllib.parse import urlparse

import httpx
import pypdfium2 as pdfium
from google import genai
from google.genai import types

TIMEOUT_S = 280  # a 30-page scan took >150 s on Gemini; stays under the frontend proxy's 300 s for /cases/parse
DPI = 150  # enough for handwritten digits; higher costs tokens on every page


class Provider(Protocol):
    label: str  # shown to the user, e.g. "Google Gemini (gemini-3.8-flash)"

    async def json_from_pdf(self, pdf: bytes, instructions: str, schema: dict) -> str:
        """Raises on transport errors and refusals; the caller validates the JSON against its own model."""


class Gemini:
    def __init__(self) -> None:
        self.model = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
        self.label = f"Google Gemini ({self.model})"
        self.client = genai.Client(http_options=types.HttpOptions(timeout=TIMEOUT_S * 1000))

    async def json_from_pdf(self, pdf: bytes, instructions: str, schema: dict) -> str:
        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=[types.Part.from_bytes(data=pdf, mime_type="application/pdf"), instructions],
            config=types.GenerateContentConfig(response_mime_type="application/json", response_json_schema=schema,
                                               # transcription, not reasoning: default thinking made scans time out
                                               thinking_config=types.ThinkingConfig(thinking_level="LOW")),
        )
        return response.text or ""


class OpenAICompatible:
    transport: httpx.AsyncBaseTransport | None = None  # tests swap in httpx.MockTransport

    def __init__(self) -> None:
        self.url = os.environ["LLM_BASE_URL"].rstrip("/") + "/chat/completions"
        self.model = os.environ["LLM_MODEL"]
        self.key = os.environ.get("LLM_API_KEY", "")
        self.label = f"{self.model} ({urlparse(self.url).hostname})"

    async def json_from_pdf(self, pdf: bytes, instructions: str, schema: dict) -> str:
        pages = await asyncio.to_thread(page_images, pdf)
        content = [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{page}"}} for page in pages]
        body = {"model": self.model,
                "messages": [{"role": "user", "content": [*content, {"type": "text", "text": instructions}]}],
                # not strict: strict mode needs every field required; the caller's Pydantic model re-checks anyway.
                # No reasoning/temperature knobs: servers disagree on them and some reject unknown parameters.
                "response_format": {"type": "json_schema", "json_schema": {"name": "result", "schema": schema}}}
        headers = {"Authorization": f"Bearer {self.key}"} if self.key else {}
        async with httpx.AsyncClient(timeout=TIMEOUT_S, transport=self.transport) as http:
            response = await http.post(self.url, json=body, headers=headers)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"] or ""


PROVIDERS: dict[str, type] = {"gemini": Gemini, "openai": OpenAICompatible}


def page_images(pdf: bytes) -> list[str]:
    """Every page as a base64 JPEG; pdfium applies each page's rotation, so sideways printouts come out upright."""
    # shortcut: sends every page; a model with a small context needs a page limit or batching, add it when one is used
    images = []
    for page in pdfium.PdfDocument(pdf):
        buffer = io.BytesIO()
        page.render(scale=DPI / 72).to_pil().save(buffer, "JPEG", quality=85)
        images.append(base64.b64encode(buffer.getvalue()).decode())
    return images


@cache
def provider() -> Provider | None:
    name = os.environ.get("LLM_PROVIDER") or ("gemini" if os.environ.get("GEMINI_API_KEY") else "")
    if name and name not in PROVIDERS:
        raise ValueError(f"LLM_PROVIDER={name!r}: expected one of {', '.join(PROVIDERS)}")
    return PROVIDERS[name]() if name else None
