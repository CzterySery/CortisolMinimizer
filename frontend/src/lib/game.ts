import catalog from "../../../shared/cards.json";
import type { GamePreview } from "@/types/game";

const localPreview: GamePreview = {
  mode: "preview",
  current_round: 1,
  total_rounds: 5,
  hand_size: 3,
  statistics: [
    { id: "money", label: "Pieniądze", value: null, unit: "zł" },
    { id: "time", label: "Czas", value: null, unit: "dni" },
    { id: "happiness", label: "Szczęście", value: null, unit: "pkt" },
  ],
  rounds: catalog.rounds,
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
