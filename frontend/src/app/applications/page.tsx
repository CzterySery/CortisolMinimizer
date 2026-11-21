"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, type S } from "@/lib/api";
import { recipientLabel } from "@/lib/labels";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";
import { DocsChecklist } from "@/components/plan/docs-checklist";

// End of the game: the plan becomes pre-filled applications sent (simulated) to the employer or ZUS.
export default function Applications() {
  return <Suspense><ApplicationsInner /></Suspense>;
}

function ApplicationsInner() {
  const gameId = useSearchParams().get("game");
  const [summary, setSummary] = useState<S["GameState"]>();
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});

  useEffect(() => {
    if (!gameId) return;
    api.GET("/api/v1/game/{game_id}/summary", { params: { path: { game_id: gameId } } })
      .then(({ data, error }) => (error ? setOut({ error }) : setSummary(data)));
  }, [gameId]);

  const submit = async (doc: S["Document"]) =>
    setOut(await api.POST("/api/v1/applications", { body: { form: doc.form, who: doc.who, payload: {} } }));

  const documents = summary?.result?.documents ?? [];
  return (
    <main className="page">
      <PageHeader eyebrow="Wnioski" title="Plan gotowy." accent="Czas na papiery.">
        Każda decyzja z gry ma swój dokument. Wypełnimy go za Ciebie i wyślemy do pracodawcy albo ZUS (symulacja).
      </PageHeader>
      {!gameId && <p className="muted">Najpierw <Link href="/">zagraj partię</Link>, żeby przygotować wnioski.</p>}
      {documents.length > 0 && <DocsChecklist documents={documents} />}
      <div className="actions">
        {documents.map((d, i) => <button key={i} className="button" onClick={() => submit(d)}>Wyślij {d.form} · {recipientLabel[d.recipient]}</button>)}
      </div>
      {(out.data || out.error) ? <ApiResult {...out} /> : null}
    </main>
  );
}
