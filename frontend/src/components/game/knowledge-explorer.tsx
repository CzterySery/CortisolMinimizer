"use client";

import { useState } from "react";
import type { Card, Round } from "@/types/game";
import { DecisionCard } from "./decision-card";
import { getDecisionNodeForCard } from "@/lib/decision-tree";

interface TopicGroup {
  id: string;
  label: string;
  subtitle: string;
  cardIds: string[];
}

const TOPICS: TopicGroup[] = [
  {
    id: "recommended",
    label: "Polecane dla Twojej ścieżki",
    subtitle: "Karty wiedzy dobrane automatycznie do wyborów, które podejmujesz w drzewie decyzyjnym powyżej.",
    cardIds: ["1C", "3F", "2E"],
  },
  {
    id: "pregnancy_base",
    label: "Ciąża, e-ZLA i podstawa kwot",
    subtitle: "Jak ZUS wylicza średnią z 12 miesięcy, kiedy przysługuje 100% na zwolnieniu w ciąży i czym różni się etat od JDG.",
    cardIds: ["1C", "1E", "1F"],
  },
  {
    id: "rates_payer",
    label: "Wariant 81,5% vs 100%/70% i płatnik",
    subtitle: "Porównanie obu wariantów wypłaty zasiłku macierzyńskiego oraz zasada 20 ubezpieczonych decydująca o tym, czy płaci szef czy ZUS.",
    cardIds: ["3F", "1D", "1E"],
  },
  {
    id: "docs_deadlines",
    label: "Wnioski, dokumenty i terminy",
    subtitle: "Kiedy mijają kluczowe terminy (21 dni na długi wniosek, 7 dni na ojcowski) i jakie załączniki przygotować.",
    cardIds: ["2E", "2F", "3D"],
  },
  {
    id: "hospital_special",
    label: "Szpital, wcześniaki i „Za życiem”",
    subtitle: "Nowy uzupełniający urlop macierzyński po hospitalizacji dziecka oraz wydłużona pula rodzicielskiego.",
    cardIds: ["2D", "3E", "2E"],
  },
];

export function KnowledgeExplorer({
  stages,
  playedIds,
}: {
  stages: Round[];
  playedIds: string[];
}) {
  const [activeTopicId, setActiveTopicId] = useState<string>("recommended");
  const [exploredIds, setExploredIds] = useState<string[]>([]);

  const allCards = stages.flatMap((s) => s.cards);

  // Compute recommended knowledge card IDs from the user's decision tree choices
  const dynamicRecommendedIds = Array.from(
    new Set(
      playedIds.flatMap((cardId, roundIndex) => {
        const node = getDecisionNodeForCard(roundIndex, cardId, playedIds);
        return node?.recommendedKnowledgeIds ?? [];
      }),
    ),
  );
  const recommendedCardIds =
    dynamicRecommendedIds.length >= 2
      ? dynamicRecommendedIds.slice(0, 3)
      : ["1C", "3F", "2E"];

  const activeTopic = TOPICS.find((t) => t.id === activeTopicId) ?? TOPICS[0];
  const targetIds = activeTopicId === "recommended" ? recommendedCardIds : activeTopic.cardIds;

  const displayedCards: Card[] = targetIds
    .map((id) => allCards.find((c) => c.id === id))
    .filter((c): c is Card => Boolean(c));

  function toggleExplored(id: string) {
    setExploredIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <section className="knowledge-explorer" aria-labelledby="knowledge-explorer-title">
      <div className="knowledge-explorer-header">
        <div>
          <p className="eyebrow">Talia wiedzy prawnej ZUS · Otwórz przepisy i cytaty</p>
          <h2 id="knowledge-explorer-title" className="knowledge-explorer-title">
            O czym chcesz się dowiedzieć?
          </h2>
          <p className="knowledge-explorer-desc">
            Wybierz interesujący Cię temat, aby przejrzeć karty wiedzy z oficjalną podstawą prawną,
            cytatami z ustaw i dokumentami PDF — bez zabierania ruchów w drzewie decyzyjnym.
          </p>
        </div>
      </div>

      <div className="knowledge-topic-pills" role="tablist" aria-label="Tematy kart wiedzy">
        {TOPICS.map((topic) => {
          const isSelected = topic.id === activeTopicId;
          return (
            <button
              key={topic.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`knowledge-topic-pill ${isSelected ? "active" : ""}`}
              onClick={() => setActiveTopicId(topic.id)}
            >
              <span>{topic.label}</span>
              {topic.id === "recommended" && playedIds.length > 0 && (
                <small className="topic-pill-badge">Wg Twojej ścieżki</small>
              )}
            </button>
          );
        })}
      </div>

      <p className="knowledge-topic-subtitle">{activeTopic.subtitle}</p>

      <div className="knowledge-cards-grid">
        {displayedCards.map((card, index) => {
          const isRead = exploredIds.includes(card.id);
          return (
            <div
              key={card.id}
              className={`knowledge-card-wrapper ${isRead ? "is-read" : ""}`}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button, a, dialog, summary")) return;
                const trigger = event.currentTarget.querySelector<HTMLButtonElement>(".grounded-text");
                trigger?.click();
              }}
            >
              <DecisionCard card={card} index={index} category="Karta wiedzy ZUS" />
              <div className="knowledge-card-actions">
                <button
                  type="button"
                  className="knowledge-open-btn"
                  onClick={(event) => {
                    const wrapper = event.currentTarget.closest(".knowledge-card-wrapper");
                    const trigger = wrapper?.querySelector<HTMLButtonElement>(".grounded-text");
                    trigger?.click();
                    if (!isRead) toggleExplored(card.id);
                  }}
                >
                  <span>Sprawdź przepisy i źródła ZUS</span>
                  <span aria-hidden="true">ⓘ</span>
                </button>
                <button
                  type="button"
                  className={`knowledge-mark-btn ${isRead ? "active" : ""}`}
                  onClick={() => toggleExplored(card.id)}
                  aria-pressed={isRead}
                  title={isRead ? "Oznacz jako nieprzeczytane" : "Oznacz temat jako poznany"}
                >
                  {isRead ? "✓ Poznano" : "Oznacz"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
