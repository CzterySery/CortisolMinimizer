"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, type S } from "@/lib/api";
import { planHandoff } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";
import { PlanTimeline } from "@/components/plan/plan-timeline";

// End screen: score breakdown, the family's plan, and the bridges to paperwork and the calculator.
export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<S["GameState"]>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    api.GET("/api/v1/game/{game_id}/summary", { params: { path: { game_id: id } } })
      .then(({ data, error }) => (error ? setError(error) : setState(data)));
  }, [id]);

  if (!state) return <main className="page"><ApiResult error={error} /></main>;
  const score = state.statistics.find((s) => s.id === "happiness")?.value ?? 0;

  return (
    <main className="page">
      <PageHeader eyebrow="Wasz plan jest na stole" title="Pięć decyzji." accent={`${score} pkt szczęścia.`} />
      <ul className="score-lines">
        {state.combos_hit.map((c) => <li key={c}>Combo: {c}</li>)}
        {state.bonuses.map((b) => <li key={b.label}>{b.label}: +{b.points}</li>)}
      </ul>
      {state.result && <PlanTimeline result={state.result} />}
      <div className="actions">
        <Link href={`/applications?game=${id}`} className="button button-primary">Przygotuj wnioski</Link>
        <button className="button" onClick={() => { planHandoff.put(state.plan); router.push("/calculator"); }}>Otwórz w kalkulatorze</button>
        <Link href="/" className="button">Zagraj ponownie</Link>
      </div>
    </main>
  );
}
