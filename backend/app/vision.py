"""Reads an uploaded ZUS case bundle (a scanned PDF) into a CaseInput with whichever model app/llm.py is configured for.

The model only transcribes facts from the documents; entitlement and amounts still come from the deterministic
calculator and rules (POST /cases/evaluate). Off when no provider is configured. Free tiers of hosted models may use
inputs for training, so real case documents need a paid tier or a local model."""
from app import llm
from app.schemas import CaseInput

# Constrained decoding may reject these; CaseInput.model_validate_json re-checks every constraint afterwards.
UNSUPPORTED = {"pattern", "default", "exclusiveMinimum", "exclusiveMaximum"}

PROMPT = """The document (a PDF or its pages as images) is one Polish ZUS benefit case: scanned, often handwritten applications (ZAM, wniosek o urlop/
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
  known. children: children born in this birth. child_died_on: the date of a stillbirth (martwe urodzenie, karta
  martwego urodzenia, akt urodzenia z adnotacją) or of the child's death (akt zgonu); otherwise empty.
  surviving_children: only the expressly documented count of surviving children from that birth; do not guess.
  maternity_takeover: only an expressly documented maternal death, abandonment, incapacity ruling or hospital
  stay preventing personal care, with its actual dates. Do not infer it from an ordinary paternal leave application.
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
    return llm.provider() is not None


def _schema(node):
    if isinstance(node, dict):
        return {k: _schema(v) for k, v in node.items() if k not in UNSUPPORTED}
    if isinstance(node, list):
        return [_schema(v) for v in node]
    return node


async def read_case(pdf: bytes) -> CaseInput:
    """Raises on provider errors, refusals and output that does not fit CaseInput."""
    text = await llm.provider().json_from_pdf(pdf, PROMPT, _schema(CaseInput.model_json_schema()))
    return CaseInput.model_validate_json(text)
