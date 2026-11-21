"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type S } from "@/lib/api";
import { day } from "@/lib/format";
import { recipientLabel, whoLabel } from "@/lib/labels";
import { myPlan, userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";
import { DocsChecklist } from "@/components/plan/docs-checklist";

type Doc = S["Document"];
const key = (d: { form: string; who: string }) => `${d.form}|${d.who}`;

// The user's own paperwork, from the plan saved in the calculator or "Moje dane". The game never produces
// applications. Documents ZUS already has (simulated eZUS account) are ticked off; the rest can be filled in and sent.
export default function Applications() {
  const [plan, setPlan] = useState<S["Plan-Input"]>();
  const [documents, setDocuments] = useState<Doc[]>();
  const [account, setAccount] = useState<S["ZusAccount"]>();
  const [filed, setFiled] = useState<Set<string>>(new Set());
  const [error, setError] = useState<unknown>();
  const token = userToken.get();
  const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

  useEffect(() => {
    const saved = myPlan.get() as S["Plan-Input"] | undefined;
    if (!saved) return;
    setPlan(saved); // eslint-disable-line react-hooks/set-state-in-effect -- one-time read of client-only storage
    api.POST("/api/v1/calc/plan", { body: saved }).then(({ data, error }) => (error ? setError(error) : setDocuments(data.documents)));
    const t = userToken.get();
    if (t) api.GET("/api/v1/zus/me", { headers: { Authorization: `Bearer ${t}` } }).then(({ data }) => {
      if (!data) return;
      setAccount(data);
      setFiled(new Set(data.applications.map(key)));
    });
  }, []);

  const shown = documents?.map((d) => ({ ...d, done: filed.has(key(d)) }));
  const todo = shown?.filter((d) => !d.done) ?? [];

  return (
    <main className="page">
      <PageHeader eyebrow="Wnioski" title="Twoje dokumenty." accent="Co, gdzie i do kiedy.">
        Lista dla Twojego planu z kalkulatora. {account ? "Dokumenty, które ZUS już ma, są odhaczone." : "Po zalogowaniu przez mObywatel odhaczymy dokumenty, które ZUS już ma."}
      </PageHeader>
      {!plan && <p className="muted">Najpierw <Link href="/calculator">policz swój plan w kalkulatorze</Link> albo otwórz <Link href="/me">Moje dane</Link>, a potem wybierz „Przygotuj wnioski”.</p>}
      {error ? <ApiResult error={error} /> : null}
      {shown && <DocsChecklist documents={shown} />}
      {todo.length > 0 && <section className="stack">
        <h2 className="eyebrow">Wypełnij i wyślij (symulacja)</h2>
        {todo.map((d) => (
          <ApplicationForm key={`${key(d)}|${d.start}|${d.due_by}|${account?.persona.id}`} doc={d} auth={auth}
            name={account && account.persona.who === d.who ? account.persona.name : ""}
            birth={plan?.family.birth_date ?? plan?.family.due_date ?? ""}
            onSent={() => setFiled((f) => new Set(f).add(key(d)))} />
        ))}
      </section>}
    </main>
  );
}

function ApplicationForm({ doc, auth, name, birth, onSent }: {
  doc: Doc; auth?: Record<string, string>; name: string; birth: string; onSent: () => void;
}) {
  const [fields, setFields] = useState({ name, child: "", birth, fullCopy: false, notes: doc.note });
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});
  const set = (patch: Partial<typeof fields>) => setFields({ ...fields, ...patch });
  const usc = doc.recipient === "usc";

  const send = async () => {
    const result = usc
      ? await api.POST("/api/v1/usc/birth-certificate", { headers: auth, body: {
          who: doc.who, child_name: fields.child, birth_date: fields.birth, full_copy: fields.fullCopy } })
      : await api.POST("/api/v1/applications", { headers: auth, body: {
          form: doc.form, who: doc.who, recipient: doc.recipient,
          payload: { imie_nazwisko: fields.name, okres_od: doc.start ?? "", okres_do: doc.end ?? "", uwagi: fields.notes } } });
    setOut(result);
    if (result.data && !(usc && fields.fullCopy)) onSent();
  };

  return (
    <details className="form-card">
      <summary><strong>{doc.form}</strong> · {whoLabel[doc.who]} → {recipientLabel[doc.recipient]}{doc.due_by && <> · do {day(doc.due_by)}</>}</summary>
      <div className="form-grid">
        {usc ? <>
          <label className="field">Imię i nazwisko dziecka<input value={fields.child} onChange={(e) => set({ child: e.target.value })} /></label>
          <label className="field">Data urodzenia<input type="date" value={fields.birth} onChange={(e) => set({ birth: e.target.value })} /></label>
          <label className="field-check"><input type="checkbox" checked={fields.fullCopy} onChange={(e) => set({ fullCopy: e.target.checked })} /> Odpis zupełny (zamiast skróconego)</label>
        </> : <>
          <label className="field">Imię i nazwisko<input value={fields.name} onChange={(e) => set({ name: e.target.value })} /></label>
          {doc.start && <p className="muted">Okres: {day(doc.start)} – {doc.end ? day(doc.end) : "…"}</p>}
          <label className="field">Uwagi i załączniki<textarea rows={3} value={fields.notes} onChange={(e) => set({ notes: e.target.value })} /></label>
        </>}
      </div>
      <button className="button button-primary" onClick={send} disabled={usc ? !fields.child.trim() || !fields.birth : !fields.name.trim()}>
        Wyślij do: {recipientLabel[doc.recipient]}
      </button>
      {(out.data || out.error) ? <ApiResult {...out} /> : null}
    </details>
  );
}
