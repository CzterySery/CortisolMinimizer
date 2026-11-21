import type { Card } from "@/types/game";
import { CardGrounding } from "./card-grounding";
import { CardArtwork } from "./card-artwork";

export function DecisionCard({ card, index, category }: { card: Card; index: number; category: string }) {
  return (
    <article className={`decision-card card-${index}`}>
      <div className="card-top"><span>{card.design ? `KARTA ${card.id}` : `DECYZJA ${String.fromCharCode(65 + index)}`}</span><span aria-hidden="true">↗</span></div>
      <CardArtwork id={card.id} />
      <div className="card-copy"><span className="card-category">{card.tags?.[0] || category}</span><h3>{card.title}</h3>{card.design ? <CardGrounding card={card} /> : <p>{card.description}</p>}</div>
      <footer className="card-footer">
        {card.design ? <span>Informacje z podstawą prawną ↑</span> : card.sources.length > 0 ? (
          <details><summary>Źródła ({card.sources.length})</summary><ul>{card.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}{source.locator ? ` · ${source.locator}` : ""}</a></li>)}</ul></details>
        ) : <span>Źródła w przygotowaniu</span>}
        <span className="card-code">{card.id}</span>
      </footer>
    </article>
  );
}
