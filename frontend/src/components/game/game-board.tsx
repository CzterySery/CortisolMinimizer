import Link from "next/link";
import type { GamePreview } from "@/types/game";
import { DecisionCard } from "./decision-card";
import { RoundTrack } from "./round-track";
import { Statistics } from "./statistics";

export function GameBoard({ preview }: { preview: GamePreview }) {
  const round = preview.rounds.find((item) => item.id === preview.current_round);
  if (!round) throw new Error("Brak rundy podglądu.");

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Zasiłkowy Poker — strona główna"><span className="brand-mark" aria-hidden="true">z<span>.</span></span><span>Zasiłkowy Poker<small>Małe decyzje. Wasza przyszłość.</small></span></Link>
        <span className="preview-badge"><span />Podgląd planszy</span>
      </header>
      <main className="game-layout">
        <Statistics statistics={preview.statistics} />
        <div className="main-board">
          <RoundTrack rounds={preview.rounds} currentRound={preview.current_round} />
          <section className="story" aria-labelledby="story-title">
            <p className="eyebrow">Runda 0{round.id} / 0{preview.total_rounds} <span>·</span> {round.title}</p>
            <h1 id="story-title">Nowy rozdział.<br /><span>Wasze zasady.</span></h1>
            <p>{round.description}</p>
          </section>
          <section className="hand-section" aria-labelledby="hand-title">
            <div className="section-heading"><h2 id="hand-title">Twoja ręka</h2><span>{preview.hand_size} karty · jedna decyzja w każdej rundzie</span></div>
            <div className="hand">{round.cards.map((card, index) => <DecisionCard key={card.id} card={card} index={index} />)}</div>
            <p className="preview-note">To podgląd stołu. Zagrywanie kart będzie dostępne w kolejnym etapie.</p>
          </section>
        </div>
        <div className="deck" aria-hidden="true"><span /><span /><span><b>z.</b></span><small>Talia decyzji</small></div>
      </main>
      <footer className="site-footer"><span>Gra edukacyjna o rodzicielstwie i świadczeniach</span><span>5 rund. Wiele możliwości.</span></footer>
    </div>
  );
}
