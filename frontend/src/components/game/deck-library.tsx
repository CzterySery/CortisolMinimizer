"use client";

import { useEffect, useRef, useState } from "react";
import type { Round } from "@/types/game";
import { DecisionCard } from "./decision-card";

export function DeckLibrary({ open, onClose, rounds }: { open: boolean; onClose: () => void; rounds: Round[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState(1);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const round = rounds.find((item) => item.id === stage)!;
  return <dialog className="deck-dialog" ref={dialog} onClose={onClose} aria-labelledby="deck-library-title"
    onCancel={(event) => { event.preventDefault(); dialog.current?.close(); }}>
    <header className="dialog-heading"><div><p className="eyebrow">Pełna talia · 30 kart</p><h2 id="deck-library-title">Poznaj swoje możliwości</h2></div>
      <button className="button" autoFocus onClick={() => dialog.current?.close()}>Zamknij talię</button></header>
    <nav className="deck-tabs" aria-label="Etapy talii">{rounds.map((item) => <button className="button" key={item.id}
      aria-pressed={item.id === stage} onClick={() => setStage(item.id)}>{item.id}. {item.title}</button>)}</nav>
    <p className="muted">{round.description} Sześć kart w puli; ich dostępność zależy od sytuacji rodziny.</p>
    <div className="deck-grid">{round.cards.map((card) => <DecisionCard key={card.id} card={card} index={0} category={round.title} />)}</div>
  </dialog>;
}
