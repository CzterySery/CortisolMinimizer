import type { Statistic } from "@/types/game";

const symbols = { money: "zł", time: "◷", happiness: "☺" };

// `projected` (from the server card preview) shows what the focused card would change.
export function Statistics({ statistics, projected }: { statistics: Statistic[]; projected?: Statistic[] }) {
  return (
    <aside className="statistics" aria-labelledby="statistics-title">
      <p className="eyebrow" id="statistics-title">Wasza równowaga</p>
      {statistics.map((stat) => {
        const next = projected?.find((item) => item.id === stat.id)?.value;
        const delta = next != null && stat.value != null ? next - stat.value : 0;
        // Known range => real fill; otherwise the track stays decorative.
        const fill = stat.value != null && stat.max ? `${Math.min(100, (stat.value / stat.max) * 100)}%` : undefined;
        return (
          <div className={`stat stat-${stat.id}`} key={stat.id}>
            <span className="stat-symbol" aria-hidden="true">{symbols[stat.id]}</span>
            <div className="stat-detail">
              <div className="stat-heading">
                <span>{stat.label}</span>
                <strong>
                  {stat.value ?? "—"} <small>{stat.unit}</small>
                  {delta !== 0 && <em className={`stat-delta ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "+" : ""}{delta}</em>}
                </strong>
              </div>
              <div className="stat-track" aria-hidden="true"><span style={fill ? { width: fill } : undefined} /></div>
            </div>
          </div>
        );
      })}
      <p className="stats-note">Każda decyzja znajdzie tu swoje odbicie. Statystyki pojawią się w rozgrywce.</p>
    </aside>
  );
}
