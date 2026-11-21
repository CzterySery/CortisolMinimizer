import catalog from "../../../shared/cards.json";
import deck from "../../../shared/deck-design.json";
import type { Card, GamePreview } from "@/types/game";

const localPreview: GamePreview = {
  mode: "preview",
  current_round: 1,
  total_rounds: 5,
  hand_size: 3,
  statistics: [
    { id: "money", label: "Pieniądze", value: null, unit: "zł", max: null },
    { id: "time", label: "Czas", value: null, unit: "dni", max: null },
    { id: "happiness", label: "Szczęście", value: null, unit: "pkt", max: null },
  ],
  // Authored annotations are a preview, never executable effects or fabricated amounts.
  rounds: catalog.rounds.map((round) => ({ ...round,
    description: round.id === 1 ? "Przygotujcie się na narodziny albo przyjęcie dziecka. Poznajcie dostępne ścieżki." : round.id === 2 ? "Zaplanujcie pierwsze tygodnie po narodzinach lub przyjęciu dziecka na wychowanie." : round.description,
    cards: deck.cards.filter((card) => card.round_id === round.id).map((design): Card => ({
    id: design.id, round_id: design.round_id, title: design.title, description: design.description,
    tags: design.tags, requires: [], effects: [], chips: 0, combos: [], sources: [], design,
  })) })),
};

export function getGamePreview(): GamePreview {
  // The home page always previews the current designed deck. Backend sessions use /game/[id].
  return localPreview;
}
