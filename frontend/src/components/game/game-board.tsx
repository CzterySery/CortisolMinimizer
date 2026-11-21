"use client";

import Link from "next/link";
import { useState } from "react";
import type { Card, Stage, Statistic } from "@/types/game";
import { DecisionCard } from "./decision-card";
import { RoundTrack } from "./round-track";
import { Statistics } from "./statistics";

export interface GameBoardProps {
  mode: "preview" | "game";
  stages: Stage[];
  currentRound: number | null; // null once every round has a card on the table
  totalRounds: number;
  handSize: number;
  statistics: Statistic[];
  projected?: Statistic[]; // stats if the focused card were played (server preview)
  played: Card[];
  hand: Card[];
  onPlay: (cardId: string) => void;
  onFocusCard?: (cardId: string) => void;
  onReset?: () => void;
  summaryHref?: string;
}

// Presentational board. State lives in the caller: PreviewGame (local, no backend) or /game/[id] (server game).
export function GameBoard(props: GameBoardProps) {
  const { mode, stages, currentRound, totalRounds, handSize, statistics, projected, played, hand, onPlay, onFocusCard, onReset, summaryHref } = props;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const complete = currentRound === null;
  const stage = stages.find((item) => item.id === currentRound) ?? stages.at(-1);
  if (!stage) throw new Error("Brak rundy.");

  function playCard(cardId: string) {
    const card = hand.find((item) => item.id === cardId);
    if (complete || !card) return;
    setDraggedId(null);
    onPlay(cardId);
    const next = stages.find((item) => item.id === stage!.id + 1);
    setAnnouncement(`Karta „${card.title}” trafiła na stół. ${next ? `Teraz runda ${next.id}: ${next.title}.` : `Wszystkie ${totalRounds} kart jest na stole.`}`);
  }

  function resetBoard() {
    setDraggedId(null);
    onReset?.();
    setAnnouncement("Stół wyczyszczony. Wracasz do pierwszej rundy.");
  }

  const note = complete
    ? mode === "preview" ? "Układ jest podglądem — statystyki nie są jeszcze przeliczane." : "Wszystkie decyzje są na stole. Zobacz, co oznaczają dla budżetu i opieki."
    : "Przeciągnij kartę na stół lub użyj przycisku „Połóż na stole”.";

  return (
    <main className="game-layout">
      <Statistics statistics={statistics} projected={projected} />
      <div className="main-board">
        <RoundTrack stages={stages} currentRound={currentRound} playedCards={played} draggedId={draggedId} onPlayCard={playCard} />
        <section className="story" aria-labelledby="story-title">
          {mode === "preview" && <span className="preview-badge"><span />Podgląd planszy</span>}
          <p className="eyebrow">{complete ? "Wasz plan jest na stole" : `Runda 0${stage.id} / 0${totalRounds} · ${stage.title}`}</p>
          <h1 id="story-title">{complete ? <>Pięć decyzji.<br /><span>Wasza historia.</span></> : <>Nowy rozdział.<br /><span>Wasze zasady.</span></>}</h1>
          <p>{complete ? "Wszystkie miejsca są już zajęte. Możesz rozłożyć karty jeszcze raz i sprawdzić inny układ." : stage.description}</p>
        </section>
        <section className="hand-section" aria-labelledby="hand-title">
          <div className="section-heading"><h2 id="hand-title">{complete ? "Kompletny stół" : "Twoja ręka"}</h2><span>{complete ? `${played.length} zagranych kart` : `${handSize} karty · przeciągnij jedną na podświetlone miejsce`}</span></div>
          {!complete && <div className="hand" key={stage.id}>{hand.map((card, index) => (
            <div className={`hand-card ${draggedId === card.id ? "is-dragging" : ""}`} key={card.id} draggable
              onPointerEnter={() => onFocusCard?.(card.id)} onFocus={() => onFocusCard?.(card.id)}
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-zus-card", card.id);
                event.dataTransfer.setData("text/plain", card.id);
                event.dataTransfer.effectAllowed = "move";
                setDraggedId(card.id);
              }} onDragEnd={() => setDraggedId(null)}>
              <DecisionCard card={card} index={index} category={stage.title} />
              <button className="play-card-button" onClick={() => playCard(card.id)} aria-label={`Zagraj kartę: ${card.title}`}>Połóż na stole <span aria-hidden="true">↑</span></button>
            </div>
          ))}</div>}
          <div className="board-controls">
            <p className="preview-note">{note}</p>
            {complete && summaryHref && <Link className="button button-primary" href={summaryHref}>Zobacz plan rodziny</Link>}
            {played.length > 0 && onReset && <button className="reset-board" onClick={resetBoard}>Rozdaj od nowa</button>}
          </div>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
        </section>
      </div>
      <div className="deck" aria-hidden="true"><span /><span /><span><b>z.</b></span><small>Talia decyzji</small></div>
    </main>
  );
}
