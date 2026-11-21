"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { Card, Stage, Statistic } from "@/types/game";
import { DecisionCard } from "./decision-card";
import { RoundTrack } from "./round-track";
import { Statistics } from "./statistics";
import type { CardSignals } from "@/lib/card-signals";

export interface GameBoardProps {
  mode: "preview" | "game";
  stages: Stage[];
  currentRound: number | null; // null once every round has a card on the table
  totalRounds: number;
  handSize: number;
  statistics: Statistic[];
  baseline?: Statistic[];
  projected?: Statistic[]; // stats if the focused card were played (server preview)
  played: Card[];
  hand: Card[];
  onPlay: (cardId: string) => void | Promise<void>;
  onFocusCard?: (cardId: string) => void;
  onUnfocusCard?: (cardId: string) => void;
  simulation?: { signals?: CardSignals; title?: string; hovering: boolean; balance?: Record<"money" | "time" | "knowledge", number> };
  onReset?: () => void;
  previewGoal?: string;
  dealKey?: number;
  belowHand?: ReactNode;
  finishedHand?: ReactNode;
  unavailable?: Record<string, string>;
  busy?: boolean;
}

// Presentational board. The home caller replays decisions through the API; sessions use /game/[id].
export function GameBoard(props: GameBoardProps) {
  const { mode, stages, currentRound, totalRounds, handSize, statistics, projected, played, hand, onPlay, onFocusCard, onReset } = props;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLElement>(null);
  const deckRef = useRef<HTMLButtonElement>(null);
  const playAnimation = useRef<Animation | null>(null);
  const playLocked = useRef(false);
  const ignoreClickUntil = useRef(0);
  const playBlockedUntil = useRef(0);
  const complete = currentRound === null;
  const stage = stages.find((item) => item.id === currentRound) ?? stages.at(-1);
  const stageId = stage?.id;

  useEffect(() => {
    const animations: Animation[] = [];
    const deck = deckRef.current;
    if (deck && !complete && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const origin = deck.getBoundingClientRect();
      deck.querySelectorAll("span").forEach((layer, index) => {
        animations.push(layer.animate([
          { translate: "0 0", rotate: "0deg" },
          { translate: `${(index - 1) * 12}px -12px`, rotate: `${(index - 1) * 9}deg` },
          { translate: "0 0", rotate: "0deg" },
        ], { duration: 420, delay: index * 35, easing: "ease-out" }));
      });
      boardRef.current?.querySelectorAll<HTMLElement>(".hand-card").forEach((card, index) => {
        const target = card.getBoundingClientRect();
        const dx = origin.left + origin.width / 2 - target.left - target.width / 2;
        const dy = origin.top + origin.height / 2 - target.top - target.height / 2;
        animations.push(card.animate([
          { transform: `translate(${dx}px, ${dy}px) rotate(-12deg) scale(.18)`, opacity: 0 },
          { opacity: 1, offset: .3 },
          { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
        ], { duration: 520, delay: 150 + index * 95, fill: "backwards", easing: "cubic-bezier(.18,.7,.25,1)" }));
      });
    }
    return () => {
      animations.forEach((animation) => animation.cancel());
      playAnimation.current?.cancel();
    };
  }, [props.dealKey, stageId, complete]);

  if (!stage) throw new Error("Brak rundy.");

  async function playCard(cardId: string) {
    const card = hand.find((item) => item.id === cardId);
    if (complete || !card || props.busy || props.unavailable?.[cardId] || playLocked.current || Date.now() < playBlockedUntil.current) return;
    playLocked.current = true;
    setPlayingId(cardId);
    setDraggedId(null);
    try {
      const source = boardRef.current?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(cardId)}"]`);
      const target = boardRef.current?.querySelector<HTMLElement>(".round-slot.current");
      if (source && target && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const from = source.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const dx = to.left + to.width / 2 - from.left - from.width / 2;
        const dy = to.top + to.height / 2 - from.top - from.height / 2;
        const animation = source.animate([
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width})`, opacity: .15 },
        ], { duration: 320, easing: "cubic-bezier(.35,0,.2,1)", fill: "forwards" });
        playAnimation.current = animation;
        await animation.finished;
      }
      playBlockedUntil.current = Date.now() + 250;
      await onPlay(cardId);
      const next = stages.find((item) => item.id === stage!.id + 1);
      setAnnouncement(`Karta „${card.title}” trafiła na stół. ${next ? `Teraz runda ${next.id}: ${next.title}.` : `Wszystkie ${totalRounds} kart jest na stole.`}`);
    } catch {
      // A restart or navigation cancels the flight; do not commit a stale choice.
    } finally {
      playAnimation.current?.cancel();
      playAnimation.current = null;
      playLocked.current = false;
      setPlayingId(null);
    }
  }

  function resetBoard() {
    setDraggedId(null);
    onReset?.();
    setAnnouncement("Stół wyczyszczony. Wracasz do pierwszej rundy.");
  }

  const note = complete
    ? "Wszystkie decyzje są na stole. Zobacz, co oznaczają dla budżetu i opieki."
    : "Kliknij kartę lub przeciągnij ją na stół.";

  return (
    <main className={`game-layout ${mode === "preview" ? "preview-board" : ""}`} ref={boardRef}>
      <div className="main-board">
        <section className="board-context" aria-labelledby="story-title">
          <p className="eyebrow">{complete ? "Wasz plan jest na stole" : `Runda 0${stage.id} / 0${totalRounds} · ${stage.title}`}</p>
          <h1 id="story-title" className="sr-only">{complete ? "Wasz plan rodziny" : `Runda ${stage.id}: ${stage.title}`}</h1>
          {mode === "game" && <p>{complete ? "Wszystkie miejsca są już zajęte. Możesz rozłożyć karty jeszcze raz i sprawdzić inny układ." : stage.description}</p>}
          {props.previewGoal && <p className="goal-note">Wasz cel: {props.previewGoal}</p>}
        </section>
        <RoundTrack stages={stages} currentRound={currentRound} playedCards={played} draggedId={draggedId} onPlayCard={playCard} />
        <section className="hand-section" aria-labelledby="hand-title">
          <div className="section-heading hand-heading"><h2 id="hand-title">{complete ? "Twój profil" : "Twoja ręka"}</h2>{mode === "game" && <span>{complete ? `${played.length} zagranych kart` : `${handSize} karty · przeciągnij jedną na podświetlone miejsce`}</span>}
            {onReset && <button className="deck-stack" ref={deckRef} onClick={resetBoard} disabled={props.busy} aria-label="Rozdaj karty ze stosu" title="Nowe rozdanie"><span /><span /><span><b>c.</b></span></button>}
          </div>
          <div className="hand-and-balance">
          {complete && props.finishedHand}
          {!complete && <div className="hand" key={`${stage.id}-${props.dealKey ?? 0}`}>{hand.map((card, index) => (
            <div className={`hand-card ${props.unavailable?.[card.id] ? "is-unavailable" : ""} ${draggedId === card.id ? "is-dragging" : ""} ${playingId === card.id ? "is-playing" : ""}`} key={card.id} draggable={!props.busy && !props.unavailable?.[card.id]} tabIndex={0} role="group" data-card-id={card.id}
              aria-label={`Karta: ${card.title}. Enter lub spacja, aby zagrać.`}
              onClick={(event) => {
                if (Date.now() < ignoreClickUntil.current || (event.target as HTMLElement).closest("button, a, dialog, summary")) return;
                if (window.getSelection()?.toString()) return;
                void playCard(card.id);
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
                event.preventDefault(); void playCard(card.id);
              }}
              onPointerEnter={() => onFocusCard?.(card.id)} onFocus={() => onFocusCard?.(card.id)}
              onPointerLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) props.onUnfocusCard?.(card.id); }}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) props.onUnfocusCard?.(card.id); }}
              onDragStart={(event) => {
                if ((event.target as HTMLElement).closest("button, a, dialog, summary")) { event.preventDefault(); return; }
                ignoreClickUntil.current = Date.now() + 600;
                event.dataTransfer.setData("application/x-zus-card", card.id);
                event.dataTransfer.setData("text/plain", card.id);
                event.dataTransfer.effectAllowed = "move";
                setDraggedId(card.id);
              }} onDragEnd={() => { setDraggedId(null); ignoreClickUntil.current = Date.now() + 250; }}>
              <DecisionCard card={card} index={index} category={stage.title} />
              {props.unavailable?.[card.id] && <p className="card-unavailable-reason">{props.unavailable[card.id]}</p>}
              <button className="play-card-button" disabled={props.busy || playingId !== null || !!props.unavailable?.[card.id]} onClick={() => void playCard(card.id)} aria-label={`Zagraj kartę: ${card.title}`}>{props.unavailable?.[card.id] ? "Niedostępna" : "Połóż na stole"} <span aria-hidden="true">↑</span></button>
            </div>
          ))}</div>}
          <Statistics statistics={statistics} baseline={props.baseline} projected={projected} simulation={props.simulation} hideValues={mode === "preview"} startAtMidpoint={played.length === 0 && !projected} />
          </div>
          <div className="board-controls">
            <p className="preview-note">{note}</p>
            {played.length > 0 && onReset && <button className="reset-board" onClick={resetBoard}>Rozdaj od nowa</button>}
          </div>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
        </section>
        {props.belowHand}
      </div>
    </main>
  );
}
