"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type S } from "@/lib/api";
import { recipientLabel } from "@/lib/labels";
import { myPlan } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";
import { DocsChecklist } from "@/components/plan/docs-checklist";

// The user's own paperwork, from the plan they built in the calculator. The game teaches with sample families
// and never produces applications. Documents already filed with ZUS get marked from ZUS data (simulated login).
export default function Applications() {
  const [plan, setPlan] = useState<S["Plan-Input"]>();
  const [documents, setDocuments] = useState<S["Document"][]>();
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});

  useEffect(() => {
    const saved = myPlan.get() as S["Plan-Input"] | undefined;
    if (!saved) return;
    setPlan(saved); // eslint-disable-line react-hooks/set-state-in-effect -- one-time read of client-only storage
    api.POST("/api/v1/calc/plan", { body: saved })
      .then(({ data, error }) => (error ? setOut({ error }) : setDocuments(data.documents)));
  }, []);

  const submit = async (doc: S["Document"]) =>
    setOut(await api.POST("/api/v1/applications", { body: { form: doc.form, who: doc.who, payload: {} } }));

  return (
    <main className="page">
      <PageHeader eyebrow="Wnioski" title="Twoje dokumenty." accent="Co, gdzie i do kiedy.">
        Lista dla Twojego planu z kalkulatora. Dokumenty złożone już w ZUS zobaczysz po zalogowaniu przez mObywatel.
      </PageHeader>
      {!plan && <p className="muted">Najpierw <Link href="/calculator">policz swój plan w kalkulatorze</Link>, a potem wybierz „Przygotuj wnioski”.</p>}
      {documents && <DocsChecklist documents={documents} />}
      <div className="actions">
        {documents?.map((d, i) => <button key={i} className="button" onClick={() => submit(d)}>Wyślij {d.form} · {recipientLabel[d.recipient]}</button>)}
      </div>
      {(out.data || out.error) ? <ApiResult {...out} /> : null}
    </main>
  );
}
