"use client";

import { useState } from "react";
import type { Card, GamePreview } from "@/types/game";
import { GameBoard } from "./game-board";
import { DeckLibrary } from "./deck-library";

const modes = [
  { id: "calm", title: "Kortyzol Minimizer", text: "Ciągłość opieki, stabilny budżet i formalności na czas." },
  { id: "benefits", title: "Zasiłki Maxing", text: "Porównuj należne świadczenia i dochód całej rodziny." },
  { id: "aura", title: "Aura Farming", text: "Wspólny czas i podział opieki dopasowany do rodziny." },
];

function deal(preview: GamePreview): Card[][] {
  return preview.rounds.map((round) => {
    const pool = [...round.cards];
    for (let i = pool.length - 1; i > 0; i--) {
      const random = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
      const j = Math.floor(random * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, preview.hand_size);
  });
}

// Backend-free walk through the card catalog: no stats, no session, refresh resets. The real game is /game/[id].
export function PreviewGame({ preview }: { preview: GamePreview }) {
  const [played, setPlayed] = useState<Card[]>([]);
  const [hands, setHands] = useState(() => preview.rounds.map((round) => round.cards.slice(0, preview.hand_size)));
  const [mode, setMode] = useState(modes[0]);
  const [started, setStarted] = useState(false);
  const [library, setLibrary] = useState(false);
  const round = preview.rounds[played.length];

  function restart() {
    setHands(deal(preview));
    setPlayed([]);
    setStarted(true);
  }

  return (
    <>
    <section className="deck-toolbar" aria-label="Talia i cel rozgrywki">
      <div><p className="eyebrow">Talia rodzicielskich decyzji</p><h2>30 kart. Wasz własny układ.</h2>
        <p>5 etapów · po 6 kart w puli · 3 karty w ręce</p></div>
      <div className="deck-toolbar-actions"><button className="button" onClick={() => setLibrary(true)}>Przejrzyj 30 kart</button>
        <button className="button button-primary" onClick={restart}>{started ? "Nowe rozdanie" : "Potasuj i rozdaj"}</button></div>
      <div className="mode-options" role="group" aria-label="Wybierz cel planu">{modes.map((item) =>
        <button key={item.id} className={`mode-option ${mode.id === item.id ? "selected" : ""}`} aria-pressed={mode.id === item.id}
          onClick={() => setMode(item)}><strong>{item.title}</strong><span>{item.text}</span></button>)}</div>
      <p className="deck-disclaimer">Podgląd talii: wybierasz decyzje i poznajesz ich skutki. Warunki dostępności, wyliczenia i punktację sprawdzi silnik gry po podaniu sytuacji rodziny.</p>
    </section>
    <GameBoard
      mode="preview"
      stages={preview.rounds}
      currentRound={round ? round.id : null}
      totalRounds={preview.total_rounds}
      handSize={preview.hand_size}
      statistics={preview.statistics}
      played={played}
      hand={hands[played.length] ?? []}
      previewGoal={mode.text}
      onPlay={(cardId) => {
        const card = hands[played.length]?.find((item) => item.id === cardId);
        // drop and click can both fire for one card: accept only the first play of this round
        if (card) setPlayed((previous) => (previous.length === played.length ? [...previous, card] : previous));
      }}
      onReset={restart}
    />
    <DeckLibrary open={library} onClose={() => setLibrary(false)} rounds={preview.rounds} />
    </>
  );
}
