import type { Statistic } from "@/types/game";
import type { CardSignals } from "@/lib/card-signals";

const symbols = { money: "zł", time: "◷", happiness: "☺" };

// `projected` (from the server card preview) shows what the focused card would change.
export function Statistics({ statistics, projected, simulation }: {
  statistics: Statistic[]; projected?: Statistic[];
  simulation?: { signals?: CardSignals; title?: string; hovering: boolean };
}) {
  return (
    <aside className="statistics" aria-labelledby="statistics-title">
      <p className="eyebrow" id="statistics-title">Wasza równowaga</p>
      {statistics.map((stat) => {
        const next = projected?.find((item) => item.id === stat.id)?.value;
        const delta = next != null && stat.value != null ? next - stat.value : 0;
        const signal = simulation?.signals?.[stat.id];
        // The midpoint only positions the hatched game-balance illustration, not an expected income.
        const balanceFill = signal?.range ? 50 + (signal.range[0] + signal.range[1]) / 2 * 34 : undefined;
        // Known range => real fill; otherwise the track stays decorative.
        const fill = stat.value != null && stat.max ? `${Math.min(100, (stat.value / stat.max) * 100)}%` : undefined;
        return (
          <div className={`stat stat-${stat.id} ${simulation ? "stat-simulation" : ""}`} key={stat.id}>
            <span className="stat-symbol" aria-hidden="true">{symbols[stat.id]}</span>
            <div className="stat-detail">
              <div className="stat-heading">
                <span>{stat.label}</span>
                <strong>
                  {simulation ? signal?.label ?? "Najedź na kartę" : <>{stat.value ?? "—"} <small>{stat.unit}</small>
                  {delta !== 0 && <em className={`stat-delta ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "+" : ""}{delta}</em>}</>}
                </strong>
              </div>
              <div className={`stat-track ${simulation ? `signal-${signal?.direction ?? "idle"}` : ""}`} aria-hidden="true"><span style={simulation && balanceFill !== undefined ? { width: `${balanceFill}%` } : !simulation && fill ? { width: fill } : undefined} /></div>
            </div>
          </div>
        );
      })}
      {simulation ? <div className="simulation-note" aria-live="polite" aria-atomic="true">
        {simulation.title && <p><strong>{simulation.hovering ? "Przymierzasz:" : "Ostatnia decyzja:"}</strong> {simulation.title}</p>}
      </div> : <p className="stats-note">Każda decyzja znajdzie tu swoje odbicie. Statystyki pojawią się w rozgrywce.</p>}
    </aside>
  );
}
