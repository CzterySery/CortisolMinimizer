import type { ReactNode } from "react";
import type { Statistic } from "@/types/game";
import type { CardSignals } from "@/lib/card-signals";

const symbols = { money: "zł", time: "◷", knowledge: "i" };

// Decorative balance of authored card effects, never calculator quantities.
export function Statistics({ statistics, simulation, deckSlot }: {
  statistics: Statistic[]; projected?: Statistic[];
  baseline?: Statistic[];
  hideValues?: boolean;
  startAtMidpoint?: boolean;
  simulation?: { signals?: CardSignals; title?: string; hovering: boolean; balance?: Record<"money" | "time" | "knowledge", number> };
  deckSlot?: ReactNode;
}) {
  const visibleStats = statistics.filter((stat) => stat.id !== "knowledge");
  return (
    <aside className="statistics" aria-labelledby="statistics-title">
      <p className="eyebrow" id="statistics-title">Bilans wyborów</p>
      {visibleStats.map((stat) => {
        const signal = simulation?.signals?.[stat.id];
        const width = simulation?.balance?.[stat.id] ?? 50;
        return (
          <div className={`stat stat-${stat.id} stat-simulation${signal && signal.emphasis !== 0 ? " stat-changing" : ""}`} key={stat.id}>
            <span className="stat-symbol" aria-hidden="true">{symbols[stat.id]}</span>
            <div className="stat-detail">
              <div className="stat-heading">
                <span>{stat.label}</span>
                <span className="sr-only">{signal?.label ?? "Punkt wyjścia"}. Wskaźnik wizualny.</span>
              </div>
              <div className="stat-track" aria-hidden="true"><span style={{ width: `${width}%` }} /></div>
            </div>
          </div>
        );
      })}
      {deckSlot && <div className="statistics-deck-slot">{deckSlot}</div>}
    </aside>
  );
}
