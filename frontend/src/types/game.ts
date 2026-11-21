// Game types used by the board components. Aliases of the generated API contract (src/lib/schema.d.ts),
// so they can't drift from the backend.
import type { components } from "@/lib/schema";
import type deck from "../../../shared/deck-design.json";

type Schemas = components["schemas"];

export type Source = Schemas["Source-Output"];
export type DesignedCard = (typeof deck.cards)[number];
// UI annotations stay separate from the executable API contract.
export type Card = Schemas["Card-Output"] & { design?: DesignedCard };
export type Stage = Omit<Schemas["Round"], "cards">; // a round's story: id, title, description
export type Round = Omit<Schemas["Round"], "cards"> & { cards: Card[] };
export type Statistic = Schemas["Statistic"];
export type GamePreview = Omit<Schemas["Preview"], "rounds"> & { rounds: Round[] };
