import catalog from "../../../shared/cards.json";
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
  // The catalog JSON holds only card text; fill the game-mechanics defaults the API would add.
  rounds: catalog.rounds.map((round) => ({ ...round, cards: round.cards.map((card): Card => ({ tags: [], requires: [], effects: [], chips: 0, combos: [], ...card })) })),
};

export async function getGamePreview(): Promise<GamePreview> {
  if (!process.env.API_URL) return localPreview;

  const response = await fetch(
    `${process.env.API_URL.replace(/\/$/, "")}/api/v1/game/preview`,
    { cache: "no-store", signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) throw new Error("Nie udało się pobrać podglądu gry.");
  return (await response.json()) as GamePreview;
}
