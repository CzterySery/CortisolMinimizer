import { useState } from "react";
import type { Card, Round } from "@/types/game";

interface RoundTrackProps {
  rounds: Round[];
  currentRound: number | null;
  playedCards: Card[];
  draggedId: string | null;
  onPlayCard: (id: string) => void;
}

export function RoundTrack({ rounds, currentRound, playedCards, draggedId, onPlayCard }: RoundTrackProps) {
  const [overRound, setOverRound] = useState<number | null>(null);
  return (
    <section className="rounds-section" aria-labelledby="rounds-title">
      <div className="section-heading"><h2 id="rounds-title">Wasza historia</h2><span>{playedCards.length} / {rounds.length} decyzji na stole</span></div>
      <ol className="round-track">
        {rounds.map((round) => {
          const card = playedCards.find((item) => item.round_id === round.id);
          const active = round.id === currentRound;
          return (
          <li key={round.id} aria-current={round.id === currentRound ? "step" : undefined}>
            <div className={`round-slot ${active ? "current" : ""} ${card ? "occupied" : ""} ${active && draggedId ? "accepts-card" : ""} ${active && draggedId && overRound === round.id ? "drag-over" : ""}`}
              aria-label={card ? `Runda ${round.id}: ${card.title}` : `Runda ${round.id}: ${active ? "upuść tutaj kartę" : "miejsce na kartę"}`}
              onDragOver={(event) => {
                if (!active || !draggedId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOverRound(round.id);
              }}
              onDragLeave={() => setOverRound(null)}
              onDrop={(event) => {
                event.preventDefault();
                setOverRound(null);
                if (active && draggedId && event.dataTransfer.getData("application/x-zus-card") === draggedId) onPlayCard(draggedId);
              }}>
              <span className="round-number">0{round.id}</span>
              {card ? <><span className="played-card-code">{card.id}</span><h3 className="played-card-title">{card.title}</h3><span className="slot-caption">Na stole ✓</span></> : <><span className="slot-mark" aria-hidden="true">{active ? "+" : "·"}</span><span className="slot-caption">{active ? "Przeciągnij tu kartę" : "Miejsce na kartę"}</span></>}
            </div>
            <p className="round-label">{round.title}</p>
          </li>
        );})}
      </ol>
    </section>
  );
}
