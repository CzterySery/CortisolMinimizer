"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Card, GamePreview } from "@/types/game";
import { api, type S } from "@/lib/api";
import { planHandoff } from "@/lib/session";
import { GameBoard } from "./game-board";
import { DeckLibrary } from "./deck-library";
import { CareCalendar } from "@/components/plan/care-calendar";
import { BudgetChart } from "@/components/plan/budget-chart";

type Simulation = S["GameSimulation"];
type Scenario = NonNullable<S["SimulationRequest"]["scenario_id"]>;
const scenarioLabels: Record<Scenario, string> = {
  standard: "Wspólny początek", hospital: "Powrót ze szpitala", "za-zyciem": "Dodatkowe wsparcie",
};
const modes = [
  { id: "calm", title: "Kortyzol Minimizer", text: "Ciągłość opieki i stabilny budżet." },
  { id: "benefits", title: "Zasiłki Maxing", text: "Dochód rodziny i należne świadczenia." },
  { id: "aura", title: "Aura Farming", text: "Wspólny czas i podział opieki." },
];

function draw(pool: Card[], count: number): Card[] {
  const cards = [...pool];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards.slice(0, count);
}

// Authoritative replay: send every selected decision; the server recomputes a single plan.
export function PreviewGame({ preview }: { preview: GamePreview }) {
  const [played, setPlayed] = useState<Card[]>([]);
  const [hand, setHand] = useState(preview.rounds[0].cards.slice(0, preview.hand_size));
  const [scenario, setScenario] = useState<Scenario>("standard");
  const [simulation, setSimulation] = useState<Simulation>();
  const [mode, setMode] = useState(modes[0]);
  const [library, setLibrary] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dealKey, setDealKey] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string>();
  const router = useRouter();
  const generation = useRef(0);
  const playing = useRef(false);
  const round = preview.rounds[played.length];
  const focused = simulation?.candidates.find((card) => card.id === focusedId && card.available);

  async function load(selected: string[], scenarioId: Scenario) {
    const response = await api.POST("/api/v1/game/simulate", { body: { selected, scenario_id: scenarioId } });
    if (!response.data) throw new Error(typeof response.error?.detail === "string" ? response.error.detail : "Nie udało się przeliczyć planu. Spróbuj ponownie.");
    return response.data;
  }

  function installHand(data: Simulation, index: number) {
    const pool = preview.rounds[index]?.cards ?? [];
    const next = draw(pool, preview.hand_size);
    // Always deal at least one feasible path. Keep unavailable cards inspectable for learning.
    if (next.length && !next.some((card) => data.candidates.find((item) => item.id === card.id)?.available)) {
      const available = pool.find((card) => data.candidates.find((item) => item.id === card.id)?.available);
      if (available) next[0] = available;
    }
    setHand(next);
  }

  async function restart(nextScenario: Scenario = scenario) {
    const current = ++generation.current;
    setBusy(true); setError(undefined); setFocusedId(null); setDealKey((key) => key + 1);
    try {
      const data = await load([], nextScenario);
      if (current !== generation.current) return;
      setScenario(nextScenario); setSimulation(data); setPlayed([]); installHand(data, 0);
      setDealKey((key) => key + 1);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Brak połączenia z kalkulatorem.");
    } finally { if (current === generation.current) setBusy(false); }
  }

  useEffect(() => {
    let cancelled = false;
    load([], "standard").then((data) => { if (!cancelled) { setSimulation(data); setBusy(false); } })
      .catch(() => { if (!cancelled) { setError("Nie można połączyć się z kalkulatorem. Użyj przycisku Nowe rozdanie."); setBusy(false); } });
    return () => { cancelled = true; };
  }, []);

  async function play(cardId: string) {
    const card = hand.find((item) => item.id === cardId);
    if (!card || busy || playing.current || !simulation?.candidates.find((item) => item.id === cardId)?.available) return;
    const current = generation.current;
    playing.current = true; setBusy(true); setError(undefined);
    try {
      const nextPlayed = [...played, card];
      const data = await load(nextPlayed.map((item) => item.id), scenario);
      if (current !== generation.current) return;
      setSimulation(data); setPlayed(nextPlayed); setFocusedId(null); installHand(data, nextPlayed.length);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Nie udało się zagrać karty.");
      throw cause;
    } finally { playing.current = false; if (current === generation.current) setBusy(false); }
  }

  const unavailable = Object.fromEntries(hand.flatMap((card) => {
    const candidate = simulation?.candidates.find((item) => item.id === card.id);
    return candidate && !candidate.available ? [[card.id, candidate.issues.find((item) => item.severity === "error")?.text ?? "Brak uprawnienia w tej historii."]] : [];
  }));

  return <>
    <GameBoard mode="preview" stages={preview.rounds} currentRound={round?.id ?? null}
      totalRounds={preview.total_rounds} handSize={preview.hand_size}
      statistics={simulation?.statistics ?? preview.statistics} projected={focused?.statistics}
      played={played} hand={hand} dealKey={dealKey} busy={busy} unavailable={unavailable}
      onFocusCard={setFocusedId} onUnfocusCard={(id) => setFocusedId((current) => current === id ? null : current)}
      onPlay={play} onReset={() => void restart()}
      belowHand={<>
        {error && <p className="game-error" role="alert">{error}</p>}
        {busy && <p className="sr-only" role="status">Przeliczam wspólny plan rodziny.</p>}
        {simulation && played.length === preview.total_rounds && <div className="actions">
          <button className="button button-primary" onClick={() => { planHandoff.put(simulation.plan); router.push("/calculator"); }}>Przelicz ten plan w kalkulatorze</button>
        </div>}
        <section className="deck-toolbar" aria-label="Talia i historia rodziny">
          <div><p className="eyebrow">Talia rodzicielskich decyzji</p><h2>30 kart. Wasz własny układ.</h2><p>5 etapów · po 6 kart w puli · 3 karty w ręce</p></div>
          <div className="deck-toolbar-actions"><button className="button" onClick={() => setLibrary(true)}>Przejrzyj 30 kart</button>
            <button className="button button-primary" onClick={() => void restart()} disabled={busy}>Nowe rozdanie</button></div>
          <label className="scenario-picker">Przykładowa historia <select value={scenario} disabled={busy} onChange={(event) => void restart(event.target.value as Scenario)}>
            {Object.entries(scenarioLabels).map(([id, title]) => <option value={id} key={id}>{title}</option>)}
          </select></label>
          <p className="deck-disclaimer">{simulation?.scenario.description} Kwoty są orientacyjne: kalkulator pomija PIT i upraszcza pensję za część miesiąca. Stosuje parametry z dnia narodzin do całego planu.</p>
        </section>
        {simulation && <details className="game-plan-details"><summary>Wasze dni i podstawa planu</summary>
          <p>Rodzicielski: <strong>{(focused?.pools ?? simulation.result.pools).parental_days_left} dni</strong> do zaplanowania · Ojcowski: <strong>{(focused?.pools ?? simulation.result.pools).paternity_days_left} dni</strong> · Części rodzicielskiego: {(focused?.pools ?? simulation.result.pools).parental_parts_used} wykorzystanych.</p>
          <p>Pełny macierzyński jest w planie od początku. Dni przed porodem skracają część po porodzie. Rezerwacje nie są dodatkowym urlopem.</p>
          <div className="actions"><a href="/sources/labour-code#article-180" target="_blank" rel="noreferrer">Macierzyński: art. 180 ↗</a><a href="/sources/labour-code#article-1821a" target="_blank" rel="noreferrer">Rodzicielski: art. 182¹a ↗</a><a href="/sources/labour-code#article-1823" target="_blank" rel="noreferrer">Ojcowski: art. 182³ ↗</a></div>
          <p>Paski: najniższy miesięczny dochód oraz pokrycie potrzeb opieki w stałym okresie {simulation.horizon_start} – {simulation.horizon_end}. Szczęście jest równym bilansem obu wskaźników, nie wynikiem medycznym.</p>
          <CareCalendar calendar={simulation.result.calendar} />
          <BudgetChart months={simulation.result.months} />
          <ul className="explain">{simulation.result.explain.map((item, index) => <li key={index}>{item.text} <cite>{item.rule}</cite></li>)}</ul>
          {simulation.result.issues.map((issue) => <p key={issue.code}>{issue.text} · {issue.rule}</p>)}
        </details>}
      </>} />
    <section className="mode-footer" aria-label="Cele planowania"><div className="mode-options" role="group" aria-label="Wybierz cel planu">
      {modes.map((item) => <button key={item.id} className={`mode-option ${mode.id === item.id ? "selected" : ""}`} aria-pressed={mode.id === item.id} onClick={() => setMode(item)}><strong>{item.title}</strong><span>{item.text}</span></button>)}
    </div></section>
    <DeckLibrary open={library} onClose={() => setLibrary(false)} rounds={preview.rounds} />
  </>;
}
