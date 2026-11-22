"""Legal RAG assistant over all loaded ZUS/Labour Code documents, rules, forms and cards.

Indexes:
- 31 verified legal rules (`shared/legal-rules.json`)
- 6 full legal document transcriptions (`Documents/legal/*.md` via `manifest.json`)
- 30 decision cards (`shared/deck-design.json`)
- 6 official ZUS forms & instructions (`shared/zus-form-layouts.json`)
- 10 parameterized FAQ topics (`backend/app/data/pue.json`)

When `GEMINI_API_KEY` is set (in environment or `.env`), generates a concise 2-4 sentence Polish
answer grounded in the retrieved chunks and active statutory parameters (`Params`). When the key
is absent or unreachable, falls back deterministically to local RAG synthesis.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
import urllib.request
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.calc.base import percent
from app.params import Params
from app.repositories import DATA
from app.schemas import PueReply, PueSource

log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
SHARED_DIR = ROOT / "shared"
LEGAL_DIR = ROOT / "Documents" / "legal"

DOC_TITLES: dict[str, str] = {
    "labour-code": "Kodeks pracy — wyciąg",
    "benefits-act": "Ustawa zasiłkowa — wyciąg",
    "benefit-documents": "Rozporządzenie — dokumenty do zasiłków (Dz.U. 2026 poz. 1316)",
    "leave-applications": "Rozporządzenie — wnioski o urlopy (Dz.U. 2025 poz. 322)",
    "parents-guide": "Poradnik dla rodziców ZUS 2026",
    "benefits-table": "Zestawienie okresów i podstaw świadczeń",
}

STOPWORDS: set[str] = {
    "a", "aby", "albo", "ale", "az", "bardziej", "bardzo", "bez", "bo", "by", "byc", "byl",
    "byla", "bylo", "byly", "co", "czy", "dla", "do", "gdy", "gdzie", "go", "i", "ich", "ile",
    "im", "inna", "inne", "inny", "iz", "ja", "jak", "jaka", "jaki", "jakie", "jako", "jej",
    "jest", "jesli", "jezeli", "juz", "kiedy", "kto", "ktora", "ktore", "ktory", "lub", "ma",
    "maja", "mam", "mi", "mnie", "mogl", "mozna", "moze", "musi", "na", "nad", "nam", "nas",
    "nawet", "nie", "nich", "nim", "niz", "no", "o", "od", "on", "ona", "one", "oni", "ono",
    "oraz", "po", "pod", "ponad", "przed", "przy", "sa", "sie", "skad", "sobie", "ta", "tak",
    "taki", "takze", "tam", "te", "tego", "tej", "ten", "tez", "to", "tu", "twoj", "tylko",
    "tym", "u", "w", "we", "wiec", "wszystkie", "wszystko", "z", "za", "ze",
}

SYNONYM_EXPANSIONS: list[tuple[tuple[str, ...], str]] = [
    (("l4", "zwolnien", "ezla", "e-zla", "chorobow"), "zasiłek chorobowy zaświadczenie lekarskie kod b 270 dni 33 dni article-11 article-4"),
    (("81,5", "81.5", "usredn", "uśredn"), "81,5% 21 dni po porodzie wniosek uśredniony zasiłek macierzyński rodzicielski article-30a article-31"),
    (("ojcowsk",), "urlop ojcowski 14 dni 12 miesięcy 2 części 7 dni 100% article-1823"),
    (("rodzicielsk",), "urlop rodzicielski 41 tygodni 43 tygodnie 9 tygodni wyłączne nieprzenoszalne 70% 5 części 6 lat article-1821a article-1821c article-1821d"),
    (("macierzynsk", "macierzyńsk"), "urlop macierzyński 20 tygodni 14 tygodni 6 tygodni przed porodem 100% zam article-180 article-29"),
    (("wczesniak", "wcześniak", "uzupelniajac", "uzupełniając"), "uzupełniający urlop macierzyński szpital tydzień ciąży masa urodzeniowa 8 tygodni 15 tygodni article-1802"),
    (("szpital", "hospitalizac"), "pobyt w szpitalu przerwa w urlopie macierzyńskim 8 tygodni zaświadczenie o pobycie w szpitalu article-181"),
    (("opiekuncz", "opiekuńcz", "chore dziecko"), "zasiłek opiekuńczy 60 dni 14 lat 80% z-15 z-15a"),
    (("dlug", "dług", "zadluz", "zadłuż", "zalegl", "zaległ"), "zadłużenie składkowe 1% minimalnego wynagrodzenia działalność gospodarcza jdg przedawnienie 6 miesięcy article-2a"),
    (("kto wyplaca", "kto wypłaca", "platnik", "płatnik", "pracodawca czy zus"), "płatnik składek 20 ubezpieczonych ZUS pracodawca Z-3 Z-3a article-61"),
    (("akt urodzenia", "odpis", "usc"), "odpis skrócony aktu urodzenia rejestr państwowy § 13 section-13"),
    (("adopcj", "przysposobien", "zastepcz", "zastępcz"), "przyjęcie dziecka na wychowanie urlop na warunkach urlopu macierzyńskiego 14 lat 7 lat 10 lat article-183"),
    (("rehabilitac", "znp-7", "znp7"), "świadczenie rehabilitacyjne 12 miesięcy 90% 75% 100% w ciąży ZNp-7 article-18"),
    (("podstaw", "oblicz", "12 miesiec", "12 miesięcy"), "podstawa wymiaru zasiłku 12 miesięcy 13,71% uzupełnienie minimalne wynagrodzenie article-36 article-45 article-48"),
    (("zam", "zur", "zao"), "wniosek ZAM o zasiłek macierzyński zastąpił ZUR ZAO 24.10.2026"),
    (("z-3", "z3", "z-3a", "z3a"), "zaświadczenie płatnika składek Z-3 pracownik Z-3a zleceniobiorca section-3"),
    (("zas-53", "zas53"), "wniosek o zasiłek chorobowy ZAS-53 po ustaniu ubezpieczenia"),
]

PL_MAP = str.maketrans("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ", "acelnoszzACELNOSZZ")
SUFFIX_RE = re.compile(
    r"(skiego|skiemu|skich|skim|skiej|ski|ego|emu|owych|owym|owej|owe|owa|owy|"
    r"ach|ami|om|ow|ów|ie|iu|em|a|ą|e|ę|i|o|u|y)$"
)


@dataclass(frozen=True)
class RagChunk:
    id: str
    kind: str  # "rule", "document", "form", "card"
    title: str
    locator: str
    url: str
    text: str
    snippet: str
    weight: float = 1.0
    extra_sources: tuple[tuple[str, str, str, str], ...] = ()  # (title, locator, url, snippet)
    tokens: tuple[str, ...] = field(default_factory=tuple)
    token_counts: dict[str, int] = field(default_factory=dict)


def _fold(text: str) -> str:
    return text.translate(PL_MAP).lower()


def _stem(token: str) -> str:
    folded = _fold(token)
    if len(folded) <= 4 or any(ch.isdigit() for ch in folded):
        return folded
    stemmed = SUFFIX_RE.sub("", folded)
    return stemmed if len(stemmed) >= 4 else folded[:5]


def tokenize(text: str) -> list[str]:
    clean = _fold(text).replace("81,5", "81.5").replace("13,71", "13.71")
    raw_tokens = re.findall(r"[a-z0-9]+(?:[.-][a-z0-9]+)*", clean)
    result: list[str] = []
    for tok in raw_tokens:
        if tok in STOPWORDS or len(tok) < 2:
            continue
        result.append(tok)
        stem = _stem(tok)
        if stem != tok and stem not in STOPWORDS:
            result.append(stem)
    return result


def _clean_pdf_text(text: str) -> str:
    # Remove intermediate PDF page break headers inside articles
    text = re.sub(r"<a id=\"page-\d+\"></a>\s*## Strona PDF \d+\s*(?:Legalis\s*)?", "\n", text)
    # Join hyphenated line breaks from PDF extraction
    text = re.sub(r"([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ])-\s*\n\s*([a-ząćęłńóśźż])", r"\1\2", text)
    # Filter out lines with corrupted PDF font glyphs
    lines = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if sum(1 for c in s if ord(c) > 500) > 2:
            continue
        lines.append(s)
    return " ".join(lines)


def _clip(text: str, limit: int = 240) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return cut.rstrip(".,;:-") + "…"


def _make_chunk(
    chunk_id: str,
    kind: str,
    title: str,
    locator: str,
    url: str,
    text: str,
    snippet: str,
    weight: float = 1.0,
    extra_sources: list[tuple[str, str, str, str]] | None = None,
) -> RagChunk:
    full_text = f"{title} {locator} {text} {snippet}"
    toks = tokenize(full_text)
    counts: dict[str, int] = {}
    for t in toks:
        counts[t] = counts.get(t, 0) + 1
    return RagChunk(
        id=chunk_id,
        kind=kind,
        title=title,
        locator=locator,
        url=url,
        text=_clip(text, 1400),
        snippet=_clip(snippet, 260),
        weight=weight,
        extra_sources=tuple(extra_sources or []),
        tokens=tuple(toks),
        token_counts=counts,
    )


@lru_cache(maxsize=1)
def _build_index() -> tuple[list[RagChunk], dict[str, float], float]:
    chunks: list[RagChunk] = []

    # 1. 31 Verified Legal Rules (shared/legal-rules.json)
    rules_path = SHARED_DIR / "legal-rules.json"
    rules_by_id: dict[str, dict[str, Any]] = {}
    if rules_path.exists():
        rules_data = json.loads(rules_path.read_text(encoding="utf-8"))
        for rule in rules_data.get("rules", []):
            rules_by_id[rule["id"]] = rule
            ev_list = rule.get("evidence") or []
            if not ev_list:
                continue
            first = ev_list[0]
            doc_id = first["document_id"]
            doc_title = DOC_TITLES.get(doc_id, doc_id)
            url = f"/sources/{doc_id}#{first['markdown_anchor']}"
            locator = first.get("locator", "")
            quotes = " | ".join(f"„{e.get('quote', '')}” ({e.get('locator', '')})" for e in ev_list if e.get("quote"))
            extra: list[tuple[str, str, str, str]] = []
            for e in ev_list[1:]:
                e_doc = e["document_id"]
                e_url = f"/sources/{e_doc}#{e['markdown_anchor']}"
                extra.append((DOC_TITLES.get(e_doc, e_doc), e.get("locator", ""), e_url, f"„{e.get('quote', '')}”"))
            chunks.append(
                _make_chunk(
                    chunk_id=f"rule:{rule['id']}",
                    kind="rule",
                    title=doc_title,
                    locator=locator,
                    url=url,
                    text=f"{rule['id'].replace('-', ' ')}: {rule['summary']} {quotes}",
                    snippet=f"{rule['summary']} — „{first.get('quote', '')}”",
                    weight=1.45,
                    extra_sources=extra,
                )
            )

    # 2. 6 Transcribed Legal Documents (Documents/legal/*.md)
    manifest_path = LEGAL_DIR / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for item in manifest:
            doc_id = item["id"]
            doc_title = DOC_TITLES.get(doc_id, item["title"])
            md_path = LEGAL_DIR / Path(item["markdown"]).name
            if not md_path.exists():
                continue
            raw_md = md_path.read_text(encoding="utf-8")

            if doc_id in ("labour-code", "benefits-act", "benefit-documents", "leave-applications"):
                # Split by semantic article-* or section-* anchors so page breaks don't split articles
                matches = list(re.finditer(r"<a id=\"((?:article|section)-[^\"]+)\"></a>", raw_md))
                for idx, m in enumerate(matches):
                    anchor = m.group(1)
                    start = m.end()
                    end = matches[idx + 1].start() if idx + 1 < len(matches) else len(raw_md)
                    body = _clean_pdf_text(raw_md[start:end])
                    if len(body) < 25 or "(uchylony)" in body[:45]:
                        continue
                    first_line = body.split(".")[0][:90].strip()
                    loc_match = re.match(r"^(Art\.\s*\S+(?:\s*\[[^\]]+\])?|§\s*\d+[a-z]?)", body)
                    locator = loc_match.group(1) if loc_match else first_line
                    chunks.append(
                        _make_chunk(
                            chunk_id=f"doc:{doc_id}:{anchor}",
                            kind="document",
                            title=doc_title,
                            locator=locator,
                            url=f"/sources/{doc_id}#{anchor}",
                            text=body,
                            snippet=body[:240],
                            weight=1.15,
                        )
                    )
            elif doc_id == "parents-guide":
                matches = list(re.finditer(r"<a id=\"(page-(\d+))\"></a>", raw_md))
                for idx, m in enumerate(matches):
                    anchor = m.group(1)
                    page_no = int(m.group(2))
                    if page_no <= 4:  # cover & TOC pages
                        continue
                    start = m.end()
                    end = matches[idx + 1].start() if idx + 1 < len(matches) else len(raw_md)
                    body = _clean_pdf_text(raw_md[start:end])
                    body = re.sub(r"^## Strona PDF \d+\s*", "", body).strip()
                    if len(body) < 60:
                        continue
                    chunks.append(
                        _make_chunk(
                            chunk_id=f"doc:{doc_id}:{anchor}",
                            kind="document",
                            title=doc_title,
                            locator=f"str. PDF {page_no}",
                            url=f"/sources/{doc_id}#{anchor}",
                            text=body,
                            snippet=body[:240],
                            weight=1.0,
                        )
                    )
            elif doc_id == "benefits-table":
                content_pos = raw_md.find('<a id="content"></a>')
                body = _clean_pdf_text(raw_md[content_pos:] if content_pos >= 0 else raw_md)
                chunks.append(
                    _make_chunk(
                        chunk_id="doc:benefits-table:content",
                        kind="document",
                        title=doc_title,
                        locator="Tabela zbiorcza zasiłków",
                        url="/sources/benefits-table#content",
                        text=body,
                        snippet="Maksymalny czas trwania zasiłków, wysokość procentowa i zasady ustalania podstawy wymiaru.",
                        weight=1.05,
                    )
                )

    # 3. 6 Official ZUS Forms (shared/zus-form-layouts.json)
    forms_path = SHARED_DIR / "zus-form-layouts.json"
    if forms_path.exists():
        forms = json.loads(forms_path.read_text(encoding="utf-8"))
        for f in forms:
            code = f["code"]
            title = f["title"]
            issuer_label = {
                "parent": "wypełnia i składa rodzic/ubezpieczony",
                "employer": "wypełnia i składa płatnik składek (pracodawca/zleceniodawca)",
                "mixed": "część I wypełnia ubezpieczony, część II płatnik składek",
            }.get(f.get("issuer", ""), "")
            pages_text = " ".join(_clean_pdf_text(p.get("text", "")) for p in f.get("pages", []))
            chunks.append(
                _make_chunk(
                    chunk_id=f"form:{f['id']}",
                    kind="form",
                    title=f"Formularz ZUS {code} — {title}",
                    locator=f"Druk {code} ({issuer_label})",
                    url="/applications",
                    text=f"Formularz {code} ({title}), {issuer_label}. {pages_text[:1100]}",
                    snippet=f"Druk {code}: {title} ({issuer_label}). Podgląd pól i instrukcji w zakładce Wnioski.",
                    weight=1.2,
                )
            )

    # 4. 30 Decision Cards (shared/deck-design.json)
    round_names = {1: "Ciąża", 2: "Poród", 3: "Pierwszy miesiąc", 4: "Pierwszy rok", 5: "Kolejne lata"}
    deck_path = SHARED_DIR / "deck-design.json"
    if deck_path.exists():
        deck = json.loads(deck_path.read_text(encoding="utf-8"))
        for card in deck.get("cards", []):
            rule_ids = card.get("legal_rule_ids") or []
            stage_label = round_names.get(card.get("round_id", 0), "")
            primary_url = "/calculator"
            primary_locator = f"Karta {card['id']} ({stage_label})"
            for rid in rule_ids:
                rule = rules_by_id.get(rid)
                if rule and rule.get("evidence"):
                    ev = rule["evidence"][0]
                    primary_url = f"/sources/{ev['document_id']}#{ev['markdown_anchor']}"
                    primary_locator = f"Karta {card['id']} ({stage_label}) · {ev.get('locator', '')}"
                    break
            notes_raw = card.get("notes", "")
            notes_str = " ".join(notes_raw) if isinstance(notes_raw, list) else str(notes_raw)
            text = (
                f"{card.get('title', '')} ({stage_label}). "
                f"{card.get('description', '')} {card.get('conditions', '')} {notes_str}"
            )
            chunks.append(
                _make_chunk(
                    chunk_id=f"card:{card['id']}",
                    kind="card",
                    title=f"Scenariusz karty {card['id']}: {card.get('title', '')}",
                    locator=primary_locator,
                    url=primary_url,
                    text=text,
                    snippet=f"{card.get('description', '')} {card.get('conditions', '')}"[:240],
                    weight=1.08,
                )
            )

    # Precompute BM25 IDF and average document length
    n_docs = max(len(chunks), 1)
    df: dict[str, int] = {}
    total_len = 0
    for c in chunks:
        total_len += len(c.tokens)
        for tok in c.token_counts:
            df[tok] = df.get(tok, 0) + 1
    idf = {tok: math.log(1.0 + (n_docs - freq + 0.5) / (freq + 0.5)) for tok, freq in df.items()}
    avg_len = total_len / n_docs if n_docs else 1.0
    return chunks, idf, avg_len


def _expand_query(question: str) -> list[str]:
    lower = question.lower()
    folded = _fold(question)
    extra: list[str] = []
    for triggers, expansion in SYNONYM_EXPANSIONS:
        if any(t in lower or _fold(t) in folded for t in triggers):
            extra.append(expansion)
    base_tokens = tokenize(question)
    expanded_tokens = tokenize(" ".join(extra)) if extra else []
    return base_tokens + expanded_tokens


def retrieve(question: str, top_k: int = 5) -> list[RagChunk]:
    """BM25 + phrase/number boost retrieval over the indexed legal corpus."""
    chunks, idf, avg_len = _build_index()
    base_tokens = set(tokenize(question))
    if not base_tokens:
        return []
    query_tokens = _expand_query(question)

    k1 = 1.5
    b = 0.75
    scored: list[tuple[float, RagChunk]] = []

    for chunk in chunks:
        # Require at least one match from the user's actual query tokens (or expanded domain triggers)
        matched_base = sum(1 for t in base_tokens if t in chunk.token_counts)
        matched_any = sum(1 for t in set(query_tokens) if t in chunk.token_counts)
        if matched_any == 0:
            continue
        # Avoid matching purely on generic words when base tokens have no real overlap
        if matched_base == 0 and matched_any < 2:
            continue

        doc_len = max(len(chunk.tokens), 1)
        score = 0.0
        for tok in query_tokens:
            tf = chunk.token_counts.get(tok, 0)
            if not tf:
                continue
            token_idf = idf.get(tok, 0.5)
            # Base query tokens get full weight; synonym expansion tokens get 0.55x weight
            q_weight = 1.0 if tok in base_tokens else 0.55
            denom = tf + k1 * (1.0 - b + b * (doc_len / avg_len))
            score += q_weight * token_idf * ((tf * (k1 + 1.0)) / denom)

        score *= chunk.weight
        if score >= 1.85:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)

    # Deduplicate by (url, locator) while preserving order
    selected: list[RagChunk] = []
    seen_keys: set[str] = set()
    for _, chunk in scored:
        key = f"{chunk.url}|{chunk.locator}"
        if key in seen_keys:
            continue
        seen_keys.add(key)
        selected.append(chunk)
        if len(selected) >= top_k:
            break
    return selected


def fill_params(template: str, p: Params) -> str:
    """{rates.sick} -> 0.80, {rates.sick|%} -> 80%, {maternity.weeks_by_children.0} -> 20."""
    data = p.model_dump()

    def value(match: re.Match) -> str:
        node: Any = data
        for key in match[1].split("."):
            node = node[int(key)] if isinstance(node, list) else node[key]
        return percent(node) if match[2] else str(node)

    return re.sub(r"\{([\w.]+)(\|%)?\}", value, template)


EXTRA_LOCAL_TOPICS: list[dict[str, Any]] = [
    {
        "keywords": ["uzupełn", "uzupeln", "wcześniak", "wczesniak"],
        "answer": (
            "Uzupełniający urlop macierzyński przysługuje bezpośrednio po urlopie macierzyńskim za każdy tydzień "
            "pobytu dziecka w szpitalu: do {supplementary.extreme.cap_weeks} tygodni (przed {supplementary.extreme.before_pregnancy_week}. tyg. ciąży "
            "lub masa < {supplementary.extreme.max_weight_g} g) albo do {supplementary.preterm.cap_weeks} tygodni "
            "(28.–36. tydz. lub po 37. tyg. przy hospitalizacji min. {supplementary.term.min_stay_days} dni między "
            "{supplementary.term.window_from_day}. a {supplementary.term.window_to_day}. dniem po porodzie, KP art. 180²). "
            "Zasiłek wynosi {rates.supplementary|%} podstawy; wymagane jest zaświadczenie ze szpitala (§ 18 rozporządzenia)."
        ),
    },
    {
        "keywords": ["szpital", "hospitaliz"],
        "answer": (
            "Gdy dziecko wymaga opieki szpitalnej, po wykorzystaniu co najmniej {maternity.mother_personal_weeks_incapacity} tygodni "
            "urlopu macierzyńskiego po porodzie pracownica może przerwać urlop na czas pobytu dziecka w szpitalu, a pozostałą "
            "część wykorzystać po wypisie (KP art. 181). Przy wcześniaku lub hospitalizacji noworodka można też skorzystać "
            "z uzupełniającego urlopu macierzyńskiego (KP art. 180²)."
        ),
    },
    {
        "keywords": ["adopcj", "przysposob", "zastępcz", "zastepcz"],
        "answer": (
            "Przy przyjęciu dziecka na wychowanie urlop na warunkach urlopu macierzyńskiego ({maternity.weeks_by_children.0} tyg. "
            "przy jednym dziecku, min. {maternity.adoption_min_weeks} tyg.) i urlop rodzicielski przysługują do ukończenia przez "
            "dziecko {adoption.adoption_age_years} lat (adopcja, po wystąpieniu do sądu) albo {adoption.foster_age_years} lat "
            "({adoption.foster_deferred_age_years} lat przy odroczeniu obowiązku szkolnego — niezawodowa rodzina zastępcza, "
            "KP art. 183)."
        ),
    },
    {
        "keywords": ["rehabilitac", "znp-7", "znp7"],
        "answer": (
            "Świadczenie rehabilitacyjne przysługuje po wyczerpaniu zasiłku chorobowego (do {rehab.max_months} miesięcy), "
            "gdy dalsze leczenie rokuje odzyskanie zdolności do pracy (art. 18 ustawy zasiłkowej). Wynosi "
            "{rates.rehab_first_period|%} podstawy przez pierwsze {rehab.first_period_days} dni i {rates.rehab|%} potem, a w ciąży "
            "{rates.rehab_pregnancy|%}. Wniosek składa się na druku ZNp-7."
        ),
    },
    {
        "keywords": ["podstaw", "13,71", "12 mies"],
        "answer": (
            "Podstawę wymiaru zasiłku dla pracownika stanowi przeciętne miesięczne wynagrodzenie z 12 miesięcy "
            "kalendarzowych poprzedzających miesiąc niezdolności do pracy lub porodu, po odliczeniu 13,71% składek "
            "finansowanych przez pracownika (art. 3 pkt 3 i art. 36 ustawy zasiłkowej). Dla pełnego etatu podstawa "
            "nie może być niższa od minimalnego wynagrodzenia ({min_wage} zł) po odliczeniu 13,71% (art. 45)."
        ),
    },
]

SPECIFIC_SUBTOPICS = (
    "uzupełn", "uzupeln", "wcześniak", "wczesniak", "szpital", "hospitaliz",
    "adopcj", "przysposob", "zastępcz", "zastepcz", "rehabilitac", "znp-7", "znp7",
    "z-3", "z3", "zas-53", "zas53", "z-15", "z15", "poronien", "martw", "utrat",
    "podstaw", "13,71", "12 mies",
)


def _match_canned_topic(question: str) -> dict[str, Any] | None:
    text = question.lower()
    has_specific = any(sub in text for sub in SPECIFIC_SUBTOPICS)
    for topic in json.loads((DATA / "pue.json").read_text(encoding="utf-8")):
        if any(k in text for k in topic["keywords"]):
            # Broad fallbacks ("macierzyńsk", "wniosek") yield to specific RAG chunks when a subtopic is asked
            if has_specific and topic["keywords"][0] in ("macierzyńsk", "wniosek"):
                continue
            return topic
    return None


def _chunks_to_sources(chunks: list[RagChunk], max_sources: int = 4) -> list[PueSource]:
    sources: list[PueSource] = []
    seen_urls: set[str] = set()
    for c in chunks:
        if c.url not in seen_urls:
            seen_urls.add(c.url)
            sources.append(PueSource(title=c.title, locator=c.locator, url=c.url, snippet=c.snippet))
        for title, locator, url, snippet in c.extra_sources:
            if url not in seen_urls and len(sources) < max_sources:
                seen_urls.add(url)
                sources.append(PueSource(title=title, locator=locator, url=url, snippet=snippet))
        if len(sources) >= max_sources:
            break
    return sources[:max_sources]


def _read_env_value(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if val:
        return val
    for env_path in (ROOT / ".env", ROOT / "backend" / ".env"):
        if env_path.exists():
            for raw_line in env_path.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() == name:
                    return v.strip().strip("\"'")
    return ""


def _params_summary(p: Params) -> str:
    return (
        f"- Stawki zasiłków: macierzyński {percent(p.rates.maternity)}, rodzicielski {percent(p.rates.parental)}, "
        f"uśredniony (wniosek w {p.deadlines.averaged_request_days_after_birth} dni po porodzie) {percent(p.rates.averaged)}, "
        f"ojcowski {percent(p.rates.paternity)}, chorobowy {percent(p.rates.sick)} (w ciąży {percent(p.rates.sick_pregnancy)}), "
        f"opiekuńczy {percent(p.rates.care)}.\n"
        f"- Urlop macierzyński: {p.maternity.weeks_by_children[0]} tyg. (1 dziecko), do {p.maternity.prebirth_max_weeks} tyg. przed porodem, "
        f"pierwsze {p.maternity.mother_personal_weeks} tyg. wyłącznie dla mamy.\n"
        f"- Urlop rodzicielski: {p.parental.weeks_single} tyg. (1 dziecko) / {p.parental.weeks_multiple} tyg. (mnoga), "
        f"w tym po {p.parental.exclusive_weeks} tyg. nieprzenoszalnych dla każdego rodzica, max {p.parental.max_parts} części, "
        f"do końca roku kalendarzowego, w którym dziecko kończy {p.parental.last_child_age_years} lat; wniosek min. {p.deadlines.parental_notice_days} dni przed.\n"
        f"- Urlop ojcowski: {p.paternity.days} dni, max {p.paternity.max_parts} części po min. {p.paternity.min_part_days} dni, "
        f"do {p.paternity.use_by_child_months} mies. życia dziecka; wniosek min. {p.paternity.notice_days} dni przed.\n"
        f"- Zasiłek chorobowy: pracodawca płaci pierwsze {p.sick.employer_days} dni, wyczekiwanie {p.sick.waiting_days_mandatory} dni "
        f"(obowiązkowe) / {p.sick.waiting_days_voluntary} dni (dobrowolne), okres zasiłkowy w ciąży do {p.sick.period_days_pregnancy} dni.\n"
        f"- Zasiłek opiekuńczy: do {p.care.days_per_year_child_under_14} dni w roku (dziecko do 14 lat).\n"
        f"- Płatnik zasiłków: powyżej {p.payer_threshold_insured} ubezpieczonych wypłaca pracodawca, inaczej ZUS.\n"
        f"- Zadłużenie JDG blokujące zasiłki (art. 2a): powyżej {percent(p.debt_threshold_pct_min_wage)} minimalnego wynagrodzenia ({p.min_wage} zł)."
    )


def _call_gemini(
    api_key: str,
    question: str,
    chunks: list[RagChunk],
    p: Params,
    persona_context: str = "",
) -> tuple[str, list[str]] | None:
    model = _read_env_value("GEMINI_MODEL") or "gemini-3.8-flash"  # same default as app/llm.py
    context_blocks = []
    for idx, c in enumerate(chunks, start=1):
        context_blocks.append(
            f"[Źródło {idx}] Tytuł: {c.title} | Jednostka: {c.locator} | Link: {c.url}\n"
            f"Treść: {c.text}"
        )
    sources_text = "\n\n".join(context_blocks) if context_blocks else "Brak dopasowanych fragmentów w bazie."

    system_instruction = (
        "Jesteś inteligentnym asystentem prawnym ZUS w aplikacji OtwarteKarty (Przewodnik Przyszłego Rodzica). "
        "Odpowiadasz po polsku, KRÓTKO i konkretnie (maksymalnie 2–4 zdania), wyłącznie na podstawie "
        "dostarczonych źródeł z bazy wiedzy oraz aktualnych parametrów ustawowych.\n"
        "Zasady obowiązkowe:\n"
        "1. Zawsze wpleć w odpowiedź dokładną podstawę prawną z dostarczonych fragmentów (np. art. 30a ust. 1 ustawy zasiłkowej, KP art. 182³, § 13 rozporządzenia).\n"
        "2. Używaj wyłącznie aktualnych liczb z sekcji 'Aktualne parametry ustawowe' (uwzględniają one edycje z panelu admina).\n"
        "3. Pamiętaj o stanie prawnym 2026: wniosek ZAM zastąpił dawne ZAM/ZUR/ZAO od 24.10.2026; druk Z-15 zastąpił Z-15A/Z-15B; "
        "ZUS sam pobiera dane aktu urodzenia z rejestru (§ 13 ust. 2–3 rozporządzenia).\n"
        "4. W polu JSON `source_urls` zwróć od 1 do 4 dokładnych adresów `Link` z użytych źródeł (np. '/sources/benefits-act#article-30a', '/calculator', '/applications').\n"
        "5. Jeśli pytanie w ogóle nie dotyczy urlopów, zasiłków, zwolnień, składek ZUS ani rodzicielstwa, "
        "napisz krótko, że odpowiadasz wyłącznie na pytania o uprawnienia rodzicielskie i zasiłki ZUS."
    )

    user_prompt = (
        f"Aktualne parametry ustawowe:\n{_params_summary(p)}\n\n"
        + (f"Kontekst zalogowanego użytkownika (mObywatel):\n{persona_context}\n\n" if persona_context else "")
        + f"Fragmenty z bazy wiedzy (RAG):\n{sources_text}\n\n"
        f"Pytanie użytkownika: {question}"
    )

    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.15,
            # thinking tokens count against this limit: with 450 and default thinking, answers came back empty
            "maxOutputTokens": 2048,
            "thinkingConfig": {"thinkingLevel": "LOW"},
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "answer": {"type": "STRING"},
                    "source_urls": {"type": "ARRAY", "items": {"type": "STRING"}},
                },
                "required": ["answer", "source_urls"],
            },
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},  # key kept out of the URL
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        candidate = body["candidates"][0]
        text = "".join(part.get("text", "") for part in candidate["content"]["parts"] if not part.get("thought"))
        parsed = json.loads(text)
        ans = str(parsed.get("answer", "")).strip()
        urls = [str(u).strip() for u in parsed.get("source_urls", []) if str(u).strip()]
        if ans:
            return ans, urls
        log.warning("Gemini returned no answer (finishReason=%s)", candidate.get("finishReason"))
    except Exception:  # network, HTTP, malformed or truncated output: fall back to the local answer
        log.exception("Gemini help answer failed; using the local answer")
    return None


def answer_question(question: str, p: Params, persona: Any | None = None) -> PueReply:
    """Main RAG entry point: retrieves relevant legal chunks, calls Gemini if GEMINI_API_KEY is configured,
    and falls back deterministically to parameterized local RAG synthesis."""
    chunks = retrieve(question, top_k=5)
    canned = _match_canned_topic(question)
    sources = _chunks_to_sources(chunks, max_sources=4)

    persona_context = ""
    if persona is not None:
        parent = getattr(persona.plan.family, persona.who, None)
        emp = getattr(parent, "employment", "") if parent else ""
        debt = getattr(parent, "contribution_debt", 0) if parent else 0
        persona_context = f"Osoba: {persona.name} ({persona.description}), tytuł: {emp}, zadłużenie składkowe: {debt} zł."

    api_key = _read_env_value("GEMINI_API_KEY")
    if api_key and (chunks or canned):
        gemini_res = _call_gemini(api_key, question, chunks, p, persona_context)
        if gemini_res is not None:
            ans_text, chosen_urls = gemini_res
            # Keep canned links first if matched, otherwise merge chosen_urls and retrieved source urls
            links: list[str] = []
            for u in (canned["links"] if canned else []) + chosen_urls + [s.url for s in sources]:
                if u and u not in links:
                    links.append(u)
            return PueReply(
                answer=ans_text,
                links=links[:4],
                sources=sources,
                mode="gemini-rag",
            )

    # Local deterministic RAG synthesis (used when GEMINI_API_KEY is not set or offline)
    if canned is not None:
        return PueReply(
            answer=fill_params(canned["answer"], p),
            links=list(canned["links"]),
            sources=sources,
            mode="local-rag",
        )

    lower_q = question.lower()
    for extra_topic in EXTRA_LOCAL_TOPICS:
        if any(k in lower_q for k in extra_topic["keywords"]):
            links = [s.url for s in sources]
            if "/calculator" not in links:
                links.append("/calculator")
            return PueReply(
                answer=fill_params(extra_topic["answer"], p),
                links=links[:4],
                sources=sources,
                mode="local-rag",
            )

    if chunks:
        top = chunks[0]
        second = chunks[1] if len(chunks) > 1 else None
        ans = f"{top.snippet} ({top.title}, {top.locator})."
        if second and second.url != top.url:
            ans += f" Powiązane źródło: {second.snippet} ({second.locator})."
        links = [s.url for s in sources]
        if "/calculator" not in links:
            links.append("/calculator")
        return PueReply(
            answer=ans,
            links=links[:4],
            sources=sources,
            mode="local-rag",
        )

    return PueReply(
        answer=(
            "W prawdziwym eZUS na to pytanie odpowiedziałby konsultant. Ta symulacja ma gotowe "
            "odpowiedzi o urlopach, zasiłkach, zwolnieniach, składkach i dokumentach; spróbuj zapytać "
            "o jeden z tych tematów albo sprawdź swój plan w kalkulatorze."
        ),
        links=["/calculator", "https://www.zus.pl"],
        sources=[],
        mode="fallback",
    )
