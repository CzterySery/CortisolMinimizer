import type { CardSignals } from "./card-signals";

// CSS lengths only; independent of calculator amounts, days and API scores.
export function gameScores(signals: CardSignals[]) {
  const score = (id: "money" | "time" | "knowledge") =>
    Math.max(5, Math.min(95, 50 + signals.reduce((sum, card) => sum + card[id].emphasis, 0) * 3));
  return { money: score("money"), time: score("time"), knowledge: score("knowledge") };
}

export function gameProfiles(signals: CardSignals[]) {
  const scores = gameScores(signals);
  const best = Math.max(...Object.values(scores));
  return [
    { id: "time", title: "Kortyzol Minimizer", score: scores.time },
    { id: "money", title: "Zasiłki Maxxxing", score: scores.money },
    { id: "knowledge", title: "Balans Farming", score: scores.knowledge },
  ].filter((profile) => Math.abs(profile.score - best) < 0.000001);
}
