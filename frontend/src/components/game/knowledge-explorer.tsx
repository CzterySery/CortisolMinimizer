"use client";

import { useState } from "react";
import type { Card, Round } from "@/types/game";
import { DecisionCard } from "./decision-card";
import { getDecisionNodeForCard } from "@/lib/decision-tree";
import { HelpLinks } from "@/components/help/home-help";
import { OfficialFormsLibrary } from "@/components/forms/official-forms-library";
import { ScrollReveal } from "@/components/scroll-reveal";

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
    subtitle: "Karty dobrane do Twoich wyborów w grze lub kluczowe zasady urlopów i zasiłków ZUS na start.",
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

  return (
    <ScrollReveal>
      <section id="informacje" className="knowledge-explorer" aria-labelledby="knowledge-explorer-title">
        <div className="knowledge-explorer-header">
          <div>
            <h2 id="knowledge-explorer-title" className="knowledge-explorer-title">
              Przydatne Informacje
            </h2>
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

        {activeTopic.subtitle && <p className="knowledge-topic-subtitle">{activeTopic.subtitle}</p>}

        <div className="knowledge-cards-grid">
          {displayedCards.map((card, index) => (
            <div
              key={card.id}
              className="knowledge-card-wrapper"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button, a, dialog, summary")) return;
                const trigger = event.currentTarget.querySelector<HTMLButtonElement>(".grounded-text");
                trigger?.click();
              }}
            >
              <DecisionCard card={card} index={index} category="Karta wiedzy ZUS" />
            </div>
          ))}
        </div>

        <hr className="knowledge-divider" />
        <OfficialFormsLibrary />

        <hr className="knowledge-divider" />
        <HelpLinks />
      </section>
    </ScrollReveal>
  );
}
