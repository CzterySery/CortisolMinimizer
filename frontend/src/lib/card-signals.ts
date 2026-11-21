import type { Card } from "@/types/game";
import audit from "../../../shared/card-impacts.json" with { type: "json" };

export type Direction = "up" | "down" | "same" | "depends";
export interface CardSignal { label: string; direction: Direction; range?: [number, number] }
export interface CardSignals {
  money: CardSignal;
  time: CardSignal;
  happiness: CardSignal;
  comparison: string;
  period: string;
  moneyReason: string;
  timeReason: string;
  later: string;
  ruleIds: string[];
}

// This is an authored game balance, not a benefit calculation or a health prediction.
// Uncertain financial outcomes remain uncertain in the combined balance.
export function combineDirections(money: Direction, time: Direction): Direction {
  if (money === "depends" || time === "depends") return "depends";
  const sign = { up: 1, same: 0, down: -1 };
  const total = sign[money] + sign[time];
  return total > 0 ? "up" : total < 0 ? "down" : "same";
}

export function balanceRange(money: Direction, time: Direction): [number, number] {
  const intervals: Record<Direction, [number, number]> = {
    up: [1, 1], same: [0, 0], down: [-1, -1], depends: [-1, 1],
  };
  return [(intervals[money][0] + intervals[time][0]) / 2,
    (intervals[money][1] + intervals[time][1]) / 2];
}

export function getCardSignals(card?: Card): CardSignals | undefined {
  if (!card?.design) return undefined; // Old API IDs can have different meanings.
  const impact = audit.cards.find((item) => item.id === card.id);
  if (!impact) return undefined;
  const money = impact.money as Direction;
  const time = impact.time as Direction;
  const happiness = combineDirections(money, time);
  return {
    money: { label: impact.money_label, direction: money },
    time: { label: impact.time_label, direction: time },
    happiness: {
      label: happiness === "depends" ? "Bilans zależy od danych" :
        happiness === "up" ? "Korzystniejszy bilans" :
        happiness === "down" ? "Mniej zasobów w tym okresie" : "Bilans bez zmiany",
      direction: happiness,
      range: balanceRange(money, time),
    },
    comparison: impact.comparison, period: impact.period,
    moneyReason: impact.money_reason, timeReason: impact.time_reason,
    later: impact.later, ruleIds: impact.rule_ids,
  };
}
