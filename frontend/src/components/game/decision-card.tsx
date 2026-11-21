import type { Card } from "@/types/game";

export function DecisionCard({ card, index }: { card: Card; index: number }) {
  return (
    <article className={`decision-card card-${index}`}>
      <div className="card-top"><span>DECYZJA {String.fromCharCode(65 + index)}</span><span aria-hidden="true">↗</span></div>
      <div className="card-illustration" aria-hidden="true"><span className="illustration-line" /><span className="illustration-circle" /><span className="illustration-dot" /></div>
      <div className="card-copy"><span className="card-category">Ciąża · urlop macierzyński</span><h3>{card.title}</h3><p>{card.description}</p></div>
      <footer className="card-footer">
        {card.sources.length > 0 ? (
          <details><summary>Źródła ({card.sources.length})</summary><ul>{card.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}{source.locator ? ` · ${source.locator}` : ""}</a></li>)}</ul></details>
        ) : <span>Źródła w przygotowaniu</span>}
        <span className="card-code">{card.id}</span>
      </footer>
    </article>
  );
}
