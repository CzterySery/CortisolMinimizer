"""Stable simulated receipt identity; periods are never inferred from form/person alone."""
import json
import re
from datetime import date
from functools import cache

from fastapi import HTTPException

from app.repositories import DEFAULT_CATALOG
from app.schemas import ApplicationIn


def document_id(form: str, who: str, recipient: str, start: date | None, end: date | None) -> str:
    return json.dumps([form, who, recipient, start.isoformat() if start else "", end.isoformat() if end else ""],
                      ensure_ascii=False, separators=(",", ":"))


@cache
def layouts():
    return json.loads(DEFAULT_CATALOG.with_name("zus-form-layouts.json").read_text())


@cache
def period_fields():
    bindings = json.loads(DEFAULT_CATALOG.with_name("zus-form-period-bindings.json").read_text())
    return {form: {binding["name"] for binding in kinds.values()} for form, kinds in bindings.items()}


def validate_fields(req: ApplicationIn) -> None:
    """Validate exact native field IDs/types and ownership; a demo cannot sign the employer's part."""
    if not req.official_fields:
        return
    code = req.form.lower()
    form_id = ("zam" if code.startswith("zam") or "81,5%" in code else "z15" if code.startswith("z-15")
               else "zas53" if code.startswith("zas-53") else "znp7" if code.startswith("znp-7") else None)
    layout = next((item for item in layouts() if item["id"] == form_id), None)
    if layout is None:
        raise HTTPException(422, "Ten dokument nie ma pól formularza do samodzielnego wysłania.")
    fields = {f["id"]: f for page in layout["pages"] if form_id != "znp7" or page["number"] < 3
              for f in page["fields"]}
    for key, value in req.official_fields.items():
        field = fields.get(key)
        if field is None or len(value) > 220 or (field["type"] == "CheckBox" and value not in ("", "X")):
            raise HTTPException(422, "Nieprawidłowe pole, wartość lub część formularza dla płatnika.")
        if req.start and req.end and field["name"] in period_fields().get(form_id, set()):
            try:
                dates = [date(int(year), int(month), int(day)) for day, month, year in
                         re.findall(r"(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{4})(?!\d)", value)]
            except ValueError:
                dates = []
            if dates != [req.start, req.end]:
                raise HTTPException(422, "Okres wpisany na druku nie zgadza się z okresem dokumentu. "
                                    "Popraw plan albo przywróć dane źródłowe pola.")
