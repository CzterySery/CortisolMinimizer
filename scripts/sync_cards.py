"""Ręczna synchronizacja treści cards.md do wspólnego katalogu JSON."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESCRIPTIONS = [
    "Ola i Kuba czekają na dziecko. Przed nimi pierwsza decyzja: jak zaplanować czas przed porodem?",
    "Dziecko jest już z Wami. Przed Wami plan pierwszych wspólnych tygodni.",
    "Poznajcie możliwości zaplanowania świadczeń i podziału opieki.",
    "Znajdźcie miejsce na opiekę, pracę i wspólny czas w pierwszym roku.",
    "Zaplanujcie kolejne etapy i nowy rytm Waszej rodziny.",
]


def main() -> None:
    rounds = []
    for line in (ROOT / "cards.md").read_text(encoding="utf-8").splitlines():
        if not line.startswith("| **"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        stage = re.fullmatch(r"\*\*(\d+)\. (.+)\*\*", cells[0])
        if stage is None or len(cells) != 4:
            raise ValueError(f"Nieprawidłowy wiersz: {line}")
        round_id = int(stage.group(1))
        cards = []
        for index, cell in enumerate(cells[1:]):
            match = re.fullmatch(r"\*\*(.+?)\*\*\s+(.+)", cell)
            if match is None:
                raise ValueError(f"Nieprawidłowa karta: {cell}")
            cards.append({
                "id": f"{round_id}{chr(65 + index)}",
                "round_id": round_id,
                "title": match.group(1),
                "description": match.group(2),
                "sources": [],
            })
        rounds.append({
            "id": round_id,
            "title": stage.group(2),
            "description": DESCRIPTIONS[round_id - 1],
            "cards": cards,
        })
    if [stage["id"] for stage in rounds] != [1, 2, 3, 4, 5]:
        raise ValueError("Katalog musi zawierać rundy 1–5 w kolejności.")
    target = ROOT / "shared" / "cards.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"rounds": rounds}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Zapisano 5 rund i 15 kart do shared/cards.json")


if __name__ == "__main__":
    main()
