"""Reads an uploaded ZUS case bundle (a scanned PDF) with a Gemini model into a CaseInput.

The model only transcribes facts from the documents; entitlement and amounts still come from the deterministic
calculator and rules (POST /cases/evaluate). Off unless GEMINI_API_KEY is set. Gemini's free tier may use inputs
to improve Google's products, so real case documents need a paid-tier key."""
import os
from functools import cache

from google import genai
from google.genai import types

from app.schemas import CaseInput

MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
TIMEOUT_MS = 280_000  # a 30-page scan took >150 s at default thinking; stays under the proxy's 300 s for /cases/parse
# Constrained decoding may reject these; CaseInput.model_validate_json re-checks every constraint afterwards.
UNSUPPORTED = {"pattern", "default", "exclusiveMinimum", "exclusiveMaximum"}

PROMPT = """The PDF is one Polish ZUS benefit case: scanned, often handwritten applications (ZAM, wniosek o urlop/
zasiłek), employer pay certificates (Z-3, Z-3a), insurance confirmations, ZUS decisions and system printouts.
Transcribe the facts into the JSON schema. Code downstream decides entitlement and amounts, so copy what the
documents state; never compute a benefit and never encode ZUS's decision as a fact.

- title: one short Polish sentence naming the benefit and the insurance title, e.g. "Zasiłek macierzyński, umowa
  zlecenia".
- employment: umowa o pracę -> employee, umowa zlecenia -> contract, działalność gospodarcza -> self_employed; a ZUS
  finding that the person is not insured (niepodleganie ubezpieczeniom) or no title at all -> none.
- voluntary_sickness: whether a contract/self_employed parent has voluntary sickness insurance (dobrowolne
  ubezpieczenie chorobowe). insured_since / insured_until: start and end of the insurance title when stated.
- salary_history: one row per month of the 12 calendar months before the event (birth or start of incapacity).
  Employees: gross pay from Z-3 with worked_days / required_days when given, bonuses separately. Contract and
  self_employed: the declared contribution base (podstawa wymiaru składek) for each month. Leave out a self_employed
  month in which a benefit was paid (ZUS excludes it). base_monthly: only when the documents state the benefit base (podstawa
  wymiaru zasiłku) and give no monthly pay. Never use gross_monthly_estimate.
- payer_insured_count: the number of people the payer reports for sickness insurance, when stated.
  contribution_debt: unpaid contributions in zł, when stated.
- due_date / birth_date: the child's expected and actual birth dates; use the birth date for both when only it is
  known. children: children born in this birth.
- blocks: every leave/benefit period the documents show as applied for, granted or already used, in order, for the
  parent who takes it: maternity (macierzyński), parental (rodzicielski; each separate part is its own block),
  paternity (ojcowski), supplementary (dodatkowy macierzyński), sick (chorobowy), rehab (świadczenie
  rehabilitacyjne), care (opiekuńczy). days = calendar days from start to end inclusive. work_fraction only for
  parental leave combined with part-time work (e.g. 0.5).
- rate_variant: "averaged" when the mother applied for 81.5% (wniosek o zasiłek w wysokości 81,5%), otherwise
  "standard"; averaged_request_on: the date of that application.
- leave today empty. Dates as YYYY-MM-DD, amounts as numbers with a dot (5 203,80 zł -> 5203.80).
- A fact the documents do not state stays empty (or at the schema default); do not guess it."""


def enabled() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


def _schema(node):
    if isinstance(node, dict):
        return {k: _schema(v) for k, v in node.items() if k not in UNSUPPORTED}
    if isinstance(node, list):
        return [_schema(v) for v in node]
    return node


@cache
def _client() -> genai.Client:
    return genai.Client(http_options=types.HttpOptions(timeout=TIMEOUT_MS))


async def read_case(pdf: bytes) -> CaseInput:
    """Raises on provider errors, refusals and output that does not fit CaseInput."""
    response = await _client().aio.models.generate_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=pdf, mime_type="application/pdf"), PROMPT],
        config=types.GenerateContentConfig(response_mime_type="application/json",
                                           response_json_schema=_schema(CaseInput.model_json_schema()),
                                           # transcription, not reasoning: default thinking made scans time out
                                           thinking_config=types.ThinkingConfig(thinking_level="LOW")),
    )
    return CaseInput.model_validate_json(response.text or "")
