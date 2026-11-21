"""Extract supplied public reference documents without touching restricted case files."""

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote
from xml.etree import ElementTree
from zipfile import ZipFile

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "Documents" / "legal"
NAMES = {
    "Kodeks": ("labour-code", "Kodeks pracy — wyciąg"),
    "wycia": ("benefits-act", "Ustawa zasiłkowa — wyciąg"),
    "Poradnik": ("parents-guide", "Poradnik dla rodziców ZUS 2026"),
    "rozporza": None,
    "Zała": ("benefits-table", "Zestawienie okresów i podstaw świadczeń"),
}


def main() -> None:
    source_dir = next(p for p in (ROOT / "Documents").iterdir()
                      if p.is_dir() and p.name.startswith("Materia"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for path in sorted(source_dir.iterdir()):
        if path.suffix not in {".pdf", ".docx"}:
            continue
        if path.name.startswith("rozporza"):
            key, title = (("benefit-documents", "Rozporządzenie — dokumenty do zasiłków")
                          if "zakresu" in path.name else
                          ("leave-applications", "Rozporządzenie — wnioski o urlopy"))
        else:
            key, title = next(value for prefix, value in NAMES.items()
                              if value and path.name.startswith(prefix))
        relative = path.relative_to(ROOT).as_posix()
        source_link = quote("../" + path.relative_to(ROOT / "Documents").as_posix())
        lines = [f"# {title}", "", f"Źródło: [{path.name}]({source_link}).", "",
                 ("Transkrypcja techniczna dostarczonego pliku, nie tekst jednolity ani nowelizacja. "
                 "Zachowano kolejność stron; łamanie wierszy i indeksy górne mogą wymagać "
                 "sprawdzenia w oryginale. Numery stron oznaczają pozycję strony PDF, od 1."), ""]
        pages = []
        seen_units = set()
        if path.suffix == ".pdf":
            for number, page in enumerate(PdfReader(path).pages, 1):
                content = page.extract_text() or ""
                pages.append(content)
                anchored = []
                for line in content.splitlines():
                    article = re.match(r"^Art\. (\d+[a-z]?)\b", line)
                    section = re.match(r"^§ (\d+)\b", line)
                    unit = None
                    if article:
                        unit = f"article-{article.group(1)}"
                    elif section and key in {"benefit-documents", "leave-applications"}:
                        unit = f"section-{section.group(1)}"
                    if unit and unit not in seen_units:
                        anchored.append(f'<a id="{unit}"></a>')
                        seen_units.add(unit)
                    anchored.append(line)
                lines += [f'<a id="page-{number}"></a>', f"## Strona PDF {number}", "", *anchored, ""]
        else:
            with ZipFile(path) as archive:
                tree = ElementTree.fromstring(archive.read("word/document.xml"))
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = ["".join(t.text or "" for t in p.findall(".//w:t", ns))
                          for p in tree.findall(".//w:p", ns)]
            pages = ["\n".join(paragraphs)]
            lines += ['<a id="content"></a>', "## Treść dokumentu DOCX", "", *paragraphs, ""]
        target = OUTPUT / f"{key}.md"
        target.write_text("\n".join(lines), encoding="utf-8")
        manifest.append({"id": key, "title": title, "source_file": relative,
                         "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                         "markdown": target.relative_to(ROOT).as_posix(),
                         "pdf_pages": len(pages) if path.suffix == ".pdf" else None,
                         "extraction": "pypdf" if path.suffix == ".pdf" else "docx-xml"})
        print(f"{key}: {len(pages)} sections, {sum(map(len, pages))} characters")
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
