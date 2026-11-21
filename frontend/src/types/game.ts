// Game types used by the board components. Aliases of the generated API contract (src/lib/schema.d.ts),
// so they can't drift from the backend.
import type { components } from "@/lib/schema";

type Schemas = components["schemas"];

export type Source = Schemas["Source-Output"];
export type Card = Schemas["Card-Output"];
export type Stage = Schemas["Stage"];
export type Round = Schemas["Round"];
export type Statistic = Schemas["Statistic"];
export type GamePreview = Schemas["Preview"];
export type GameState = Schemas["GameState"];
export type CardPreview = Schemas["CardPreview"];
export type PlayResult = Schemas["PlayResult"];
