import type { Round } from "@/types/game";

export function RoundTrack({ rounds, currentRound }: { rounds: Round[]; currentRound: number }) {
  return (
    <section className="rounds-section" aria-labelledby="rounds-title">
      <div className="section-heading"><h2 id="rounds-title">Wasza historia</h2><span>5 miejsc na ważne decyzje</span></div>
      <ol className="round-track">
        {rounds.map((round) => (
          <li key={round.id} aria-current={round.id === currentRound ? "step" : undefined}>
            <div className={`round-slot ${round.id === currentRound ? "current" : ""}`}>
              <span className="round-number">0{round.id}</span>
              <span className="slot-mark" aria-hidden="true">{round.id === currentRound ? "+" : "·"}</span>
              <span className="slot-caption">{round.id === currentRound ? "Twoja pierwsza decyzja" : "Miejsce na kartę"}</span>
            </div>
            <p className="round-label">{round.title}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
