"""Authoring only: download allowlisted public ZUS forms and extract their real widget rectangles.

Never reads case bundles. No OCR/AI. PDF bytes are preserved; images are a viewing layer, not completed forms.
Run with --download once, then --check offline; install scripts/requirements-forms.txt beforehand.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "shared/zus-form-sources.json"
OUTPUT = ROOT / "shared/zus-form-layouts.json"
CORRECTIONS = ROOT / "shared/zus-form-label-corrections.json"
PUBLIC = ROOT / "frontend/public/forms"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def prepare(download: bool) -> None:
    forms = []
    corrections = json.loads(CORRECTIONS.read_text())
    for source in json.loads(SOURCES.read_text()):
        folder = PUBLIC / source["id"]
        folder.mkdir(parents=True, exist_ok=True)
        original = folder / "original.pdf"
        if download:
            assert urlparse(source["url"]).hostname == "www.zus.pl"
            # curl uses the system CA trust on macOS (Python's CA bundle may miss a corporate proxy root).
            response = subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location", "--max-redirs", "3",
                                       "--proto", "=https", "--max-time", "45", "--max-filesize", "12582912",
                                       "--output", str(original), "--write-out", "%{url_effective}", source["url"]],
                                      check=True, capture_output=True, text=True)
            assert urlparse(response.stdout).hostname == "www.zus.pl"
            data = original.read_bytes()
            assert len(data) <= 12 * 1024 * 1024 and data.startswith(b"%PDF")
            original.write_bytes(data)
        data = original.read_bytes()
        correction = corrections.get(source["id"], {})
        if correction:
            assert sha(data) == correction["sha256"], "Review corrected labels against the new PDF before regenerating"
        pdf = pymupdf.open(stream=data, filetype="pdf")
        assert not pdf.is_encrypted and 0 < len(pdf) <= 30
        pages = []
        for index, page in enumerate(pdf):
            image_path = folder / f"page-{index + 1}.jpg"
            page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False).save(str(image_path), jpg_quality=86)
            fields = []
            for i, widget in enumerate(page.widgets() or []):
                r, box = widget.rect, page.rect
                rect = [round(r.x0 / box.width * 100, 4), round(r.y0 / box.height * 100, 4),
                        round(r.width / box.width * 100, 4), round(r.height / box.height * 100, 4)]
                assert all(0 <= x <= 100 for x in rect) and rect[0] + rect[2] <= 100.01 and rect[1] + rect[3] <= 100.01
                field_id = f"p{index + 1}-{i}"
                reviewed = correction.get("fields", {}).get(field_id)
                if reviewed:
                    assert reviewed["name"] == widget.field_name
                fields.append({"id": field_id, "name": widget.field_name,
                               "label": reviewed["label"] if reviewed else widget.field_label or widget.field_name,
                               "reviewed": bool(reviewed), "originalLabel": widget.field_label or widget.field_name,
                               "type": widget.field_type_string, "rect": rect})
            pages.append({"number": index + 1, "width": page.rect.width, "height": page.rect.height,
                          "image": f"/forms/{source['id']}/page-{index + 1}.jpg", "imageSha256": sha(image_path.read_bytes()),
                          "text": page.get_text(), "fields": fields})
        forms.append(source | {"sha256": sha(data), "pdf": f"/forms/{source['id']}/original.pdf", "pages": pages})
        print(f"{source['code']}: {len(pages)} pages, {sum(len(p['fields']) for p in pages)} exact PDF fields")
    OUTPUT.write_text(json.dumps(forms, ensure_ascii=False, indent=2) + "\n")


def check() -> None:
    forms = json.loads(OUTPUT.read_text())
    assert {f["id"] for f in forms} == {s["id"] for s in json.loads(SOURCES.read_text())}
    count = 0
    for form in forms:
        assert sha((PUBLIC.parent / form["pdf"].lstrip("/")).read_bytes()) == form["sha256"]
        for page in form["pages"]:
            assert sha((PUBLIC.parent / page["image"].lstrip("/")).read_bytes()) == page["imageSha256"]
            assert all(field["name"] and field["label"] for field in page["fields"])
            count += len(page["fields"])
    print(f"Verified {len(forms)} public official forms, their original/page hashes and {count} PDF field locators.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    check() if args.check else prepare(args.download)
