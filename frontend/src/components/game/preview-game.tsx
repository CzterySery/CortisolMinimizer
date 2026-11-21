"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Card, GamePreview } from "@/types/game";
import { api, type S } from "@/lib/api";
import { planHandoff, savedGame } from "@/lib/session";
import { getCardSignals } from "@/lib/card-signals";
import { gameScores } from "@/lib/game-result";
import { ensurePlayable } from "@/lib/deal";
import { getDecisionNodeForCard, getDecisionTreeRound, buildCalculatorHandoffPlan } from "@/lib/decision-tree";
import { GameBoard } from "./game-board";
import { KnowledgeExplorer } from "./knowledge-explorer";

type Simulation = S["GameSimulation"];
type Scenario = NonNullable<S["SimulationRequest"]["scenario_id"]>;
const scenarioLabels: Record<Scenario, string> = {
  standard: "Wspólny początek", hospital: "Powrót ze szpitala", "za-zyciem": "Dodatkowe wsparcie",
};

function decoratePlayedCard(base: Card, roundIndex: number, playedIds: string[]): Card {
  const node = getDecisionNodeForCard(roundIndex, base.id, playedIds);
  if (!node) return base;
  return {
    ...base,
    title: node.title,
    description: node.description,
    tags: [node.badge, node.strategyBadge, node.branchTag, node.strategyId],
    design: base.design
      ? ({ ...base.design, title: node.title, description: node.description } as Card["design"])
      : undefined,
  };
}

function decisionTreeProfiles(balance: { money: number; time: number }) {
  const diff = balance.time - balance.money;
  if (Math.abs(diff) <= 6) {
    return [{ id: "aura", title: "✨ Aura Farming (Świadomy Balans Czasu i Budżetu)" }];
  }
  if (diff > 6) {
    return [{ id: "time", title: "🧘 Kortyzol Minimizer (Maksimum czasu z dzieckiem)" }];
  }
  return [{ id: "money", title: "💰 Zasiłki Maxing (Maksimum wsparcia budżetu)" }];
}

// Authoritative replay: send every selected decision; the server recomputes a single plan.
export function PreviewGame({ preview }: { preview: GamePreview }) {
  const [played, setPlayed] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [scenario, setScenario] = useState<Scenario>("standard");
  const [simulation, setSimulation] = useState<Simulation>();
  const [baseline, setBaseline] = useState<Simulation["statistics"]>();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dealKey, setDealKey] = useState(0);
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const router = useRouter();
  const generation = useRef(0);
  const playing = useRef(false);
  const round = preview.rounds[played.length];
  const focused = simulation?.candidates.find((card) => card.id === focusedId && card.available);
  const signalCard = focused ? hand.find((card) => card.id === focused.id) : played.at(-1);
  const playedSignals = played.flatMap((card) => { const signal = getCardSignals(card); return signal ? [signal] : []; });
  const hoveredSignal = focused && signalCard ? getCardSignals(signalCard) : undefined;
  const visualBalance = gameScores(hoveredSignal ? [...playedSignals, hoveredSignal] : playedSignals);

  const playedIds = played.map((c) => c.id);
  const currentTreeRound = getDecisionTreeRound(
    played.length,
    playedIds,
    preview.rounds,
    simulation ? new Set(simulation.candidates.filter((c) => c.available).map((c) => c.id)) : undefined,
  );

  async function load(selected: string[], scenarioId: Scenario) {
    const response = await api.POST("/api/v1/game/simulate", { body: { selected, scenario_id: scenarioId } });
    if (!response.data) throw new Error(typeof response.error?.detail === "string" ? response.error.detail : "Nie udało się przeliczyć planu. Spróbuj ponownie.");
    return response.data;
  }

  const installHand = useCallback((data: Simulation, index: number, currentIds: string[] = []) => {
    if (index >= preview.total_rounds) {
      setHand([]);
      return;
    }
    const pool = preview.rounds[index]?.cards ?? [];
    const available = new Set(data.candidates.filter((card) => card.available).map((card) => card.id));
    const treeRound = getDecisionTreeRound(index, currentIds, preview.rounds, available);
    const next = ensurePlayable(treeRound.cards, pool, available);
    setHand(next);
  }, [preview]);

  async function restart(nextScenario: Scenario = scenario) {
    const current = ++generation.current;
    setBusy(true); setError(undefined); setFocusedId(null); setDealKey((key) => key + 1);
    try {
      const data = await load([], nextScenario);
      if (current !== generation.current) return;
      setScenario(nextScenario); setSimulation(data); setBaseline(data.statistics); setPlayed([]); installHand(data, 0, []);
      setReady(true);
      setDealKey((key) => key + 1);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Brak połączenia z kalkulatorem.");
    } finally { if (current === generation.current) setBusy(false); }
  }

  useEffect(() => {
    let cancelled = false;
    let stored: { selected: string[]; hand: string[]; scenario: Scenario } | undefined;
    try {
      const value = JSON.parse(savedGame.get() ?? "null");
      if (value && Object.hasOwn(scenarioLabels, value.scenario) && Array.isArray(value.selected)
        && value.selected.length <= preview.total_rounds && value.selected.every((id: unknown, index: number) =>
          preview.rounds[index]?.cards.some((card) => card.id === id))
        && Array.isArray(value.hand) && value.hand.length === (value.selected.length === preview.total_rounds ? 0 : preview.hand_size)
        && new Set(value.hand).size === value.hand.length && value.hand.every((id: unknown) =>
          preview.rounds[value.selected.length]?.cards.some((card) => card.id === id))) stored = value;
    } catch { /* Ignore malformed or unavailable storage. */ }
    const scenarioId = stored?.scenario ?? "standard";
    const selected = stored?.selected ?? [];
    load(selected, scenarioId).then((data) => { if (!cancelled) {
      setScenario(scenarioId); setSimulation(data); setBaseline(data.statistics);
      setPlayed(selected.map((id, index) => {
        const base = preview.rounds[index].cards.find((card) => card.id === id)!;
        return decoratePlayedCard(base, index, selected);
      }));
      installHand(data, selected.length, selected);
      setReady(true); setBusy(false);
    } })
      .catch(() => { if (!cancelled) { setError("Nie można połączyć się z kalkulatorem. Użyj przycisku Nowe rozdanie."); setBusy(false); } });
    return () => { cancelled = true; };
  }, [installHand, preview]);

  useEffect(() => {
    if (ready && !busy) savedGame.set(JSON.stringify({ selected: played.map((card) => card.id),
      hand: hand.map((card) => card.id), scenario }));
  }, [ready, busy, played, hand, scenario]);

  async function play(cardId: string) {
    const card = hand.find((item) => item.id === cardId);
    if (!card || busy || playing.current || !simulation?.candidates.find((item) => item.id === cardId)?.available) return;
    const current = generation.current;
    playing.current = true; setBusy(true); setError(undefined);
    try {
      const nextIds = [...played.map((item) => item.id), card.id];
      const decorated = decoratePlayedCard(card, played.length, nextIds);
      const nextPlayed = [...played, decorated];
      const data = await load(nextIds, scenario);
      if (current !== generation.current) return;
      setSimulation(data); setPlayed(nextPlayed); setFocusedId(null); installHand(data, nextPlayed.length, nextIds);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Nie udało się zagrać karty.");
      throw cause;
    } finally { playing.current = false; if (current === generation.current) setBusy(false); }
  }

  const unavailable = Object.fromEntries(hand.flatMap((card) => {
    const candidate = simulation?.candidates.find((item) => item.id === card.id);
    return candidate && !candidate.available ? [[card.id, candidate.issues.find((item) => item.severity === "error")?.text ?? "Brak uprawnienia w tej historii."]] : [];
  }));

  const finalProfiles = decisionTreeProfiles(visualBalance);

  return <>
    <GameBoard mode="preview" stages={preview.rounds} currentRound={round?.id ?? null}
      totalRounds={preview.total_rounds} handSize={preview.hand_size}
      statistics={simulation?.statistics ?? preview.statistics} baseline={baseline} projected={focused?.statistics}
      simulation={{ signals: getCardSignals(signalCard), title: signalCard?.title, hovering: !!focused, balance: visualBalance }}
      played={played} hand={hand} dealKey={dealKey} busy={busy} unavailable={unavailable}
      decisionPrompt={{
        question: currentTreeRound.question,
        subtitle: currentTreeRound.subtitle,
        path: played.map((c) => c.title),
      }}
      onFocusCard={setFocusedId} onUnfocusCard={(id) => setFocusedId((current) => current === id ? null : current)}
      onPlay={play} onReset={() => void restart()}
      finishedHand={simulation && <section className="game-result" aria-labelledby="game-result-title" role="status">
          <p className="eyebrow">Twój profil z drzewa decyzji · Koniec gry</p>
          <h2 id="game-result-title">{finalProfiles.map((profile) => profile.title).join(" + ")}</h2>
          <p>Wasza ścieżka: {played.map((c) => c.title).join(" → ")}.</p>
          <div className="actions">
          <button className="button button-primary" onClick={() => {
            planHandoff.put(buildCalculatorHandoffPlan(simulation.plan, playedIds));
            router.push("/calculator");
          }}>Pokaż ten scenariusz w kalkulatorze</button>
          </div>
        </section>}
      belowHand={<>
        {error && <p className="game-error" role="alert">{error}</p>}
        {busy && <p className="sr-only" role="status">Przeliczam wspólny plan rodziny.</p>}
        <KnowledgeExplorer stages={preview.rounds} playedIds={playedIds} />
      </>} />
  </>;
}
