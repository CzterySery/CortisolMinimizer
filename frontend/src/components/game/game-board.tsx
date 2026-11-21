"use client";

import Link from "next/link";
import { useState } from "react";
import type { Card, GamePreview } from "@/types/game";
import { DecisionCard } from "./decision-card";
import { RoundTrack } from "./round-track";
import { Statistics } from "./statistics";

export function GameBoard({ preview }: { preview: GamePreview }) {
  const [playedCards, setPlayedCards] = useState<Card[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const complete = playedCards.length === preview.rounds.length;
  const round = preview.rounds[playedCards.length] ?? preview.rounds.at(-1);
  if (!round) throw new Error("Brak rundy podglądu.");

  function playCard(cardId: string) {
    if (complete || !round) return;
    const card = round.cards.find((item) => item.id === cardId);
    if (!card) return;
    setPlayedCards((previous) => previous.length === playedCards.length ? [...previous, card] : previous);
    setDraggedId(null);
    const nextRound = preview.rounds[playedCards.length + 1];
    setAnnouncement(`Karta „${card.title}” trafiła na stół. ${nextRound ? `Teraz runda ${nextRound.id}: ${nextRound.title}.` : "Wszystkie pięć kart jest na stole."}`);
  }

  function resetBoard() {
    setPlayedCards([]);
    setDraggedId(null);
    setAnnouncement("Stół wyczyszczony. Wracasz do pierwszej rundy.");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Zasiłkowy Poker — strona główna"><span className="brand-mark" aria-hidden="true">z<span>.</span></span><span>Zasiłkowy Poker<small>Małe decyzje. Wasza przyszłość.</small></span></Link>
        <span className="preview-badge"><span />Podgląd planszy</span>
      </header>
      <main className="game-layout">
        <Statistics statistics={preview.statistics} />
        <div className="main-board">
          <RoundTrack rounds={preview.rounds} currentRound={complete ? null : round.id} playedCards={playedCards} draggedId={draggedId} onPlayCard={playCard} />
          <section className="story" aria-labelledby="story-title">
            <p className="eyebrow">{complete ? "Wasz plan jest na stole" : `Runda 0${round.id} / 0${preview.total_rounds} · ${round.title}`}</p>
            <h1 id="story-title">{complete ? <>Pięć decyzji.<br /><span>Wasza historia.</span></> : <>Nowy rozdział.<br /><span>Wasze zasady.</span></>}</h1>
            <p>{complete ? "Wszystkie miejsca są już zajęte. Możesz rozłożyć karty jeszcze raz i sprawdzić inny układ." : round.description}</p>
          </section>
          <section className="hand-section" aria-labelledby="hand-title">
            <div className="section-heading"><h2 id="hand-title">{complete ? "Kompletny stół" : "Twoja ręka"}</h2><span>{complete ? "5 zagranych kart" : `${preview.hand_size} karty · przeciągnij jedną na podświetlone miejsce`}</span></div>
            {!complete && <div className="hand" key={round.id}>{round.cards.map((card, index) => (
              <div className={`hand-card ${draggedId === card.id ? "is-dragging" : ""}`} key={card.id} draggable onDragStart={(event) => {
                event.dataTransfer.setData("application/x-zus-card", card.id);
                event.dataTransfer.setData("text/plain", card.id);
                event.dataTransfer.effectAllowed = "move";
                setDraggedId(card.id);
              }} onDragEnd={() => setDraggedId(null)}>
                <DecisionCard card={card} index={index} category={round.title} />
                <button className="play-card-button" onClick={() => playCard(card.id)} aria-label={`Zagraj kartę: ${card.title}`}>Połóż na stole <span aria-hidden="true">↑</span></button>
              </div>
            ))}</div>}
            <div className="board-controls"><p className="preview-note">{complete ? "Układ jest podglądem — statystyki nie są jeszcze przeliczane." : "Przeciągnij kartę na stół lub użyj przycisku „Połóż na stole”."}</p>{playedCards.length > 0 && <button className="reset-board" onClick={resetBoard}>Rozdaj od nowa</button>}</div>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
          </section>
        </div>
        <div className="deck" aria-hidden="true"><span /><span /><span><b>z.</b></span><small>Talia decyzji</small></div>
      </main>
      <footer className="site-footer"><span>Gra edukacyjna o rodzicielstwie i świadczeniach</span><span>5 rund. Wiele możliwości.</span></footer>
    </div>
  );
}
