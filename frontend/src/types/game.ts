export interface Source {
  id: string;
  title: string;
  url: string;
  locator?: string | null;
}

export interface Card {
  id: string;
  round_id: number;
  title: string;
  description: string;
  sources: Source[];
}

export interface Round {
  id: number;
  title: string;
  description: string;
  cards: Card[];
}

export interface Statistic {
  id: "money" | "time" | "happiness";
  label: string;
  value: number | null;
  unit: string;
}

export interface GamePreview {
  mode: "preview";
  current_round: number;
  total_rounds: number;
  hand_size: number;
  statistics: Statistic[];
  rounds: Round[];
}
