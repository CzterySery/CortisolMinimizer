import type { Card } from "@/types/game";
import { CardGrounding } from "./card-grounding";
import { CardArtwork } from "./card-artwork";

export function DecisionCard({ card, index, category }: { card: Card; index: number; category: string }) {
  const strategyBadge = card.tags?.[1];
  const strategyId = card.tags?.[3];
  return (
    <article className={`decision-card card-${index} ${strategyId ? `card-strategy-${strategyId}` : ""}`}>
      <div className="card-top">
        <span>{card.design ? `KARTA ${card.id}` : `DECYZJA ${String.fromCharCode(65 + index)}`}</span>
        {strategyBadge ? (
          <span className={`card-strategy-badge ${strategyId ? `badge-${strategyId}` : ""}`}>
            {strategyBadge}
          </span>
        ) : (
          <span aria-hidden="true">↗</span>
        )}
      </div>
      <CardArtwork id={card.id} />
      <div className="card-copy">
        <span className="card-category">{card.tags?.[0] || category}</span>
        <h3>{card.title}</h3>
        {card.design ? <CardGrounding card={card} /> : <p>{card.description}</p>}
      </div>
      <footer className="card-footer">
        {card.design ? (
          <span className="card-footer-hint">💡 Kliknij „Poznaj szczegóły” powyżej, by zobaczyć przepisy ZUS</span>
        ) : card.sources.length > 0 ? (
          <details><summary>Źródła ({card.sources.length})</summary><ul>{card.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}{source.locator ? ` · ${source.locator}` : ""}</a></li>)}</ul></details>
        ) : <span>Źródła w przygotowaniu</span>}
        <span className="card-code">{card.id}</span>
      </footer>
    </article>
  );
}
