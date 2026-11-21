import type { Statistic } from "@/types/game";

const symbols = { money: "zł", time: "◷", happiness: "☺" };

export function Statistics({ statistics }: { statistics: Statistic[] }) {
  return (
    <aside className="statistics" aria-labelledby="statistics-title">
      <p className="eyebrow" id="statistics-title">Wasza równowaga</p>
      {statistics.map((stat) => (
        <div className={`stat stat-${stat.id}`} key={stat.id}>
          <span className="stat-symbol" aria-hidden="true">{symbols[stat.id]}</span>
          <div className="stat-detail">
            <div className="stat-heading"><span>{stat.label}</span><strong>{stat.value ?? "—"} <small>{stat.unit}</small></strong></div>
            <div className="stat-track" aria-hidden="true"><span /></div>
          </div>
        </div>
      ))}
      <p className="stats-note">Każda decyzja znajdzie tu swoje odbicie. Statystyki pojawią się w rozgrywce.</p>
    </aside>
  );
}
