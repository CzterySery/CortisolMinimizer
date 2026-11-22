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
import { DocumentGuide } from "@/components/forms/document-guide";
import { documentIssuer, officialForms } from "@/lib/document-guides";

type Doc = S["Document"];
const key = (d: { form: string; who: string }) => `${d.form}|${d.who}`;
const documentKey = (d: Doc) => `${key(d)}|${d.recipient}|${d.start ?? ""}|${d.end ?? ""}`;

// The user's own paperwork, from the plan saved in the calculator or "Moje dane". The game never produces
// applications. Documents ZUS already has (simulated eZUS account) are ticked off; the rest can be filled in and sent.
export default function Applications() {
  const [plan, setPlan] = useState<S["Plan-Input"]>();
  const [documents, setDocuments] = useState<Doc[]>();
  const [account, setAccount] = useState<S["ZusAccount"]>();
  const [filed, setFiled] = useState<Set<string>>(new Set());
  const [error, setError] = useState<unknown>();
  const [sent, setSent] = useState<string>();
  const [guide, setGuide] = useState<{ doc: Doc; name?: string }>();
  const [selected, setSelected] = useState<string>();
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
      setFiled((current) => new Set([...current, ...data.applications.map(key)]));
    });
  }, []);

  const shown = documents?.map((d) => ({ ...d, done: d.done || filed.has(key(d)) || filed.has(documentKey(d)) }));
  const canSend = (doc: Doc) => !doc.done && documentIssuer(doc) === "parent";

  return (
    <main className="page">
      <PageHeader eyebrow="Twoje dokumenty" title="Twoje dokumenty." accent="Co, gdzie i do kiedy.">
        Lista dla Twojego planu z kalkulatora. {account ? "Dokumenty, które ZUS już ma, są odhaczone." : "Po zalogowaniu przez mObywatel odhaczymy dokumenty, które ZUS już ma."}
      </PageHeader>
      {!plan && <p className="muted">Najpierw <Link href="/calculator">policz swój plan w kalkulatorze</Link> albo otwórz <Link href="/me">Moje dane</Link>, a potem wybierz „Przygotuj wnioski”.</p>}
      {error ? <ApiResult error={error} /> : null}
      {sent && <p className="notice" role="status">{sent}</p>}
      {shown && <><p className="muted">Kliknij niewysłany wniosek, aby uzupełnić dane i wysłać go w symulacji. Wysłane dokumenty i zaświadczenia możesz podejrzeć.</p>
        <DocsChecklist documents={shown}
          actionLabel={(doc) => canSend(doc) ? selected === documentKey(doc) ? "Zwiń formularz" : "Wypełnij i wyślij (symulacja)" : "Zobacz dokument ↗"}
          onInspect={(doc) => {
            if (canSend(doc)) setSelected((current) => current === documentKey(doc) ? undefined : documentKey(doc));
            else setGuide({ doc, name: account?.persona.who === doc.who ? account.persona.name : undefined });
          }}
          renderEditor={(doc) => canSend(doc) && selected === documentKey(doc) && <ApplicationForm
            key={`${documentKey(doc)}|${account?.persona.id}`} doc={doc} auth={auth}
            name={account?.persona.who === doc.who ? account.persona.name : ""}
            birth={plan?.family.birth_date ?? ""}
            onInspect={(name) => setGuide({ doc, name })}
            onSent={(id) => {
              setFiled((current) => new Set(current).add(documentKey(doc))); setSelected(undefined);
              setSent(`Wysłano (symulacja): ${doc.form} → ${recipientLabel[doc.recipient]}, numer ${id}.`);
            }} />}
        />
        <p className="muted">Zaświadczenie płatnika (Z-3 / Z-3a) wypełnia pracodawca lub zleceniodawca, a e-ZLA wystawia lekarz. Dlatego nie wyświetlamy dla nich przycisku samodzielnego wysłania.</p></>}
      <details className="form-template-library"><summary>Przejrzyj oficjalne formularze ZUS — demo pól</summary>
        <p className="muted">Biblioteka wzorów, niezależna od listy wymaganej dla Twojego planu.</p>
        <div className="choice-grid">{officialForms.map((form) => <button type="button" className="choice" key={form.id}
          onClick={() => setGuide({ doc: { form: form.code, who: "mother", recipient: "zus", done: false,
            due_by: null, start: null, end: null, rule: "Oficjalny wzór ZUS", note: "Podgląd wzoru — bez danych osoby i okresów z planu." } })}>
          <strong>{form.code}</strong><span>{form.title}</span><span>{form.pages.length} stron · {form.issuer === "employer" ? "wypełnia płatnik" : "wniosek"}</span>
        </button>)}</div>
      </details>
      {guide && <DocumentGuide key={`${key(guide.doc)}|${guide.doc.start}`} doc={guide.doc} plan={plan} name={guide.name} account={account} onClose={() => setGuide(undefined)} />}
    </main>
  );
}

function ApplicationForm({ doc, auth, name, birth, onSent, onInspect }: {
  doc: Doc; auth?: Record<string, string>; name: string; birth: string; onSent: (id: number) => void; onInspect: (name: string) => void;
}) {
  const [fields, setFields] = useState({ name, child: "", birth, fullCopy: false, notes: doc.note });
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});
  const [sending, setSending] = useState(false);
  const set = (patch: Partial<typeof fields>) => setFields({ ...fields, ...patch });
  const usc = doc.recipient === "usc";

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      const result = usc
        ? await api.POST("/api/v1/usc/birth-certificate", { headers: auth, body: {
            who: doc.who, child_name: fields.child, birth_date: fields.birth, full_copy: fields.fullCopy } })
        : await api.POST("/api/v1/applications", { headers: auth, body: {
            form: doc.form, who: doc.who, recipient: doc.recipient,
            payload: { imie_nazwisko: fields.name, okres_od: doc.start ?? "", okres_do: doc.end ?? "", uwagi: fields.notes } } });
      setOut(result);
      if (result.data && !(usc && fields.fullCopy)) onSent(result.data.id);
    } catch {
      setOut({ error: "Nie udało się wysłać wniosku. Spróbuj ponownie." });
    } finally { setSending(false); }
  };

  return (
    <form className="form-card application-editor" aria-label={`Wypełnij i wyślij: ${doc.form}`} onSubmit={(event) => { event.preventDefault(); void send(); }}>
      <h3>Wypełnij i wyślij (symulacja)</h3>
      <p>{whoLabel[doc.who]} → {recipientLabel[doc.recipient]}{doc.due_by && <> · do {day(doc.due_by)}</>}</p>
      <button type="button" className="button" onClick={() => onInspect(fields.name)}>Pokaż demo: co wpisać i gdzie</button>
      <div className="form-grid">
        {usc ? <>
          <label className="field">Imię i nazwisko dziecka<input required value={fields.child} onChange={(e) => set({ child: e.target.value })} /></label>
          <label className="field">Data urodzenia<input required type="date" value={fields.birth} onChange={(e) => set({ birth: e.target.value })} /></label>
          <label className="field-check"><input type="checkbox" checked={fields.fullCopy} onChange={(e) => set({ fullCopy: e.target.checked })} /> Odpis zupełny (zamiast skróconego)</label>
        </> : <>
          <label className="field">Imię i nazwisko<input required value={fields.name} onChange={(e) => set({ name: e.target.value })} /></label>
          {doc.start && <p className="muted">Okres: {day(doc.start)} – {doc.end ? day(doc.end) : "…"}</p>}
          <label className="field">Uwagi i załączniki<textarea rows={3} value={fields.notes} onChange={(e) => set({ notes: e.target.value })} /></label>
        </>}
      </div>
      <button type="submit" className="button button-primary" disabled={sending || (usc ? !fields.child.trim() || !fields.birth : !fields.name.trim())}>
        {sending ? "Wysyłam…" : `Wyślij do: ${recipientLabel[doc.recipient]}`}
      </button>
      {(out.data || out.error) ? <ApiResult {...out} /> : null}
    </form>
  );
}
