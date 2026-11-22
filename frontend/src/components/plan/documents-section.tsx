"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type S } from "@/lib/api";
import { day } from "@/lib/format";
import { recipientLabel, whoLabel } from "@/lib/labels";
import { applicationReceipts } from "@/lib/session";
import { documentKey } from "@/lib/document-identity";
import { ApiResult } from "@/components/api-result";
import { DocsChecklist } from "@/components/plan/docs-checklist";
import { DocumentGuide } from "@/components/forms/document-guide";
import { documentIssuer, officialForm, prefilledFields } from "@/lib/document-guides";

type Doc = S["Document"];
const key = (d: { form: string; who: string }) => `${d.form}|${d.who}`;
type Receipt = { scope: string; key: string; payload: Record<string, string>; official_fields: Record<string, string> };
const readReceipts = (): Receipt[] => {
  try { const value: unknown = JSON.parse(applicationReceipts.get() ?? "[]");
    return Array.isArray(value) ? value.filter((v) => v && typeof v.scope === "string" && typeof v.key === "string"
      && v.payload && v.official_fields) : []; } catch { return []; }
};

// Required paperwork is generated only from a plan saved by the calculator. Without one, show sent account
// documents only; neither login alone nor the sample game creates a checklist for the user's case.
export function DocumentsSection({ plan, account, token, allowSending = true, onSubmitted }: {
  plan?: S["Plan-Input"]; account?: S["ZusAccount"]; token?: string; allowSending?: boolean; onSubmitted?: () => void;
}) {
  const section = useRef<HTMLElement>(null);
  const [documents, setDocuments] = useState<Doc[]>();
  const [error, setError] = useState<unknown>();
  const [sent, setSent] = useState<string>();
  const [guide, setGuide] = useState<{ doc: Doc; name?: string; fieldEdits?: Record<string, string> }>();
  const [selected, setSelected] = useState<string>();
  const [localReceipts, setLocalReceipts] = useState<Receipt[]>([]);
  const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

  useEffect(() => {
    if (window.location.hash === "#dokumenty") section.current?.scrollIntoView({ block: "start" });
  }, []);

  useEffect(() => {
    const restored = readReceipts().filter((r) => r.scope === (token ?? "anonymous"));
    setLocalReceipts(restored); // eslint-disable-line react-hooks/set-state-in-effect -- synchronize guarded browser storage after mounting/changing account
  }, [token]);

  const receipts: Receipt[] = [...localReceipts, ...(account?.applications ?? [])
    .filter((a) => Object.keys(a.payload ?? {}).length && !localReceipts.some((r) => r.key === documentKey(a)))
    .map((a) => ({ scope: token ?? "anonymous", key: documentKey(a),
      payload: Object.fromEntries(Object.entries(a.payload).filter(([key]) => !key.startsWith("pdf:"))),
      official_fields: Object.fromEntries(Object.entries(a.payload).filter(([key]) => key.startsWith("pdf:")).map(([key, value]) => [key.slice(4), value])),
    }))];
  const filed = new Set([...receipts.map((r) => r.key), ...(account?.applications ?? []).map(documentKey)]);

  useEffect(() => {
    if (!plan) {
      setDocuments(undefined);
      setError(undefined);
      return;
    }
    const controller = new AbortController();
    api.POST("/api/v1/calc/plan", { body: plan, signal: controller.signal }).then(({ data, error }) => {
      if (controller.signal.aborted) return;
      if (error) { setError(error); setDocuments(undefined); }
      else { setError(undefined); setDocuments(data.documents); }
    }).catch(() => { if (!controller.signal.aborted) setError("Nie udało się pobrać listy dokumentów. Odśwież stronę."); });
    return () => controller.abort();
  }, [plan]);

  const combined = new Map((plan ? documents ?? [] : []).map((d) => [documentKey(d), { ...d, done: d.done || filed.has(documentKey(d)) }]));
  for (const item of account?.applications ?? []) {
    const identity = documentKey(item);
    if (!combined.has(identity)) combined.set(identity, { form: item.form, who: item.who, recipient: item.recipient,
      start: item.start ?? null, end: item.end ?? null, due_by: null, done: true,
      note: `${item.status} · złożono ${day(item.filed_on)}`, rule: "Potwierdzenie złożenia (symulacja)" });
  }
  const shown = [...combined.values()];
  const canSend = (doc: Doc) => allowSending && !doc.done && documentIssuer(doc) === "parent";

  return (
    <section ref={section} id="dokumenty" aria-labelledby="documents-title" className="stack account-documents">
      <h2 id="documents-title">Twoje dokumenty</h2>
      <p className="muted">
        {plan ? "Lista dokumentów wynika z planu przygotowanego w kalkulatorze. Dokumenty już wysłane są oznaczone." : account
          ? "Lista pokazuje tylko dokumenty wysłane z Twojego konta mObywatel."
          : "Wymagane dokumenty pojawią się tutaj po zalogowaniu lub przygotowaniu planu w kalkulatorze."}
      </p>
      {!plan && (account
        ? <p className="notice">Skorzystaj z kalkulatora, aby dowiedzieć się, których dokumentów jeszcze potrzebujesz.</p>
        : <p className="muted"><Link href="/calculator">Przejdź do kalkulatora i przygotuj swój plan</Link>, aby zobaczyć wymagane dokumenty.</p>)}
      {error ? <ApiResult error={error} /> : null}
      {sent && <p className="notice" role="status">{sent}</p>}
      {(plan || shown.length > 0) && <><p className="muted">{plan
        ? "Kliknij niewysłany wniosek, aby uzupełnić dane i wysłać go w symulacji. Wysłane dokumenty i zaświadczenia możesz podejrzeć."
        : "Wysłane dokumenty i zaświadczenia możesz podejrzeć."}</p>
        <DocsChecklist documents={shown} compact
          actionLabel={(doc) => canSend(doc) ? selected === documentKey(doc) ? "Zwiń formularz" : "Wypełnij i wyślij (symulacja)" : "Zobacz dokument ↗"}
          onInspect={(doc) => {
            if (canSend(doc)) setSelected((current) => current === documentKey(doc) ? undefined : documentKey(doc));
            else {
              const receipt = receipts.find((r) => r.key === documentKey(doc));
              setGuide({ doc, name: receipt?.payload.imie_nazwisko ?? (account?.persona.who === doc.who ? account.persona.name : undefined),
                fieldEdits: receipt?.official_fields });
            }
          }}
          renderEditor={(doc) => canSend(doc) && selected === documentKey(doc) && <ApplicationForm
            key={`${documentKey(doc)}|${account?.persona.id}`} doc={doc} auth={auth}
            name={account?.persona.who === doc.who ? account.persona.name
              : account?.related_parents?.find((parent) => parent.who === doc.who)?.name ?? ""}
            birth={plan?.family.birth_date ?? ""} plan={plan} account={account}
            onSent={(id, payload, official_fields) => {
              const receipt = { scope: token ?? "anonymous", key: documentKey(doc), payload, official_fields };
              const all = [...readReceipts().filter((r) => r.scope !== receipt.scope || r.key !== receipt.key), receipt];
              applicationReceipts.set(JSON.stringify(all)); setLocalReceipts(all.filter((r) => r.scope === receipt.scope));
              setSelected(undefined);
              setSent(`Wysłano (symulacja): ${doc.form} → ${recipientLabel[doc.recipient]}, numer ${id}.`);
              onSubmitted?.();
            }} />}
        />
        {receipts.length > 0 && <details className="panel"><summary>Treść złożonych symulacji</summary>
          {receipts.map((r) => <section key={r.key}><p><strong>Wysłany szkic · symulacja</strong></p>
            <dl>{Object.entries({ ...r.payload, ...r.official_fields }).map(([label, value]) => <div key={label}>
              <dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl></section>)}
        </details>}
        {plan && <p className="muted">Zaświadczenie płatnika (Z-3 / Z-3a) wypełnia pracodawca lub zleceniodawca, a e-ZLA wystawia lekarz. Dlatego nie wyświetlamy dla nich przycisku samodzielnego wysłania.</p>}</>}
      {guide && <DocumentGuide key={`${key(guide.doc)}|${guide.doc.start}`} doc={guide.doc} plan={plan} name={guide.name} account={account}
        fieldEdits={guide.fieldEdits} onClose={() => setGuide(undefined)} />}
    </section>
  );
}

function ApplicationForm({ doc, auth, name, birth, onSent, plan, account }: {
  doc: Doc; auth?: Record<string, string>; name: string; birth: string; plan?: S["Plan-Input"]; account?: S["ZusAccount"];
  onSent: (id: number, payload: Record<string, string>, official_fields: Record<string, string>) => void;
}) {
  const [fields, setFields] = useState({ name, child: "", birth, fullCopy: false, notes: doc.note });
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});
  const [sending, setSending] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [fieldEdits, setFieldEdits] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof fields>) => setFields({ ...fields, ...patch });
  const usc = doc.recipient === "usc";
  const layout = officialForm(doc);
  const filled = layout ? prefilledFields(layout, doc, plan, fields.name, account) : {};
  const writable = new Set(layout?.pages.filter((p) => layout.id !== "znp7" || p.number < 3).flatMap((p) => p.fields.map((f) => f.id)) ?? []);
  const official_fields = Object.fromEntries(Object.entries({ ...Object.fromEntries(Object.entries(filled).map(([id, f]) => [id, f.value])), ...fieldEdits })
    .filter(([id]) => writable.has(id)));
  const firstNameId = layout?.pages[0].fields.find((f) => /Wpisz (swoje imię|imię osoby ubezpieczonej)/.test(f.label))?.id;
  const lastNameId = layout?.pages[0].fields.find((f) => /Wpisz (swoje nazwisko|nazwisko osoby ubezpieczonej)/.test(f.label))?.id;
  const pdfName = firstNameId && lastNameId && official_fields[firstNameId] && official_fields[lastNameId]
    ? `${official_fields[firstNameId]} ${official_fields[lastNameId]}` : undefined;
  const payload = { imie_nazwisko: pdfName ?? fields.name, okres_od: doc.start ?? "", okres_do: doc.end ?? "", uwagi: fields.notes };

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      const result = usc
        ? await api.POST("/api/v1/usc/birth-certificate", { headers: auth, body: {
            who: doc.who, child_name: fields.child, birth_date: fields.birth, full_copy: fields.fullCopy } })
        : await api.POST("/api/v1/applications", { headers: auth, body: {
            form: doc.form, who: doc.who, recipient: doc.recipient, start: doc.start, end: doc.end,
            document_id: documentKey(doc), official_fields, payload } });
      setOut(result);
      if (result.data && !(usc && fields.fullCopy)) onSent(result.data.id,
        usc ? { dziecko: fields.child, data_urodzenia: fields.birth, odpis: fields.fullCopy ? "zupełny" : "skrócony" } : payload, official_fields);
    } catch {
      setOut({ error: "Nie udało się wysłać wniosku. Spróbuj ponownie." });
    } finally { setSending(false); }
  };

  return (
    <form className="form-card application-editor" aria-label={`Wypełnij i wyślij: ${doc.form}`} onSubmit={(event) => { event.preventDefault(); void send(); }}>
      <h3>Wypełnij i wyślij (symulacja)</h3>
      <p>{whoLabel[doc.who]} → {recipientLabel[doc.recipient]}{doc.due_by && <> · do {day(doc.due_by)}</>}</p>
      <button type="button" className="button" onClick={() => setShowGuide(true)}>Pokaż demo: co wpisać i gdzie</button>
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
      {!usc && <details><summary>Podgląd treści wysyłanej symulacji</summary><p>{doc.form} → {recipientLabel[doc.recipient]}</p>
        <dl>{Object.entries({ ...payload, ...official_fields }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
        <p>Podstawa prawna: {doc.rule}. Wpisane pola zostaną zapisane razem z symulacją, bez zmiany oficjalnego PDF-u.</p></details>}
      {showGuide && <DocumentGuide doc={doc} plan={plan} name={fields.name} account={account} fieldEdits={fieldEdits}
        onFieldsChange={setFieldEdits} onClose={() => setShowGuide(false)} />}
      <button type="submit" className="button button-primary" disabled={sending || (usc ? !fields.child.trim() || !fields.birth : !fields.name.trim())}>
        {sending ? "Wysyłam…" : `Wyślij do: ${recipientLabel[doc.recipient]}`}
      </button>
      {(out.data || out.error) ? <ApiResult {...out} /> : null}
    </form>
  );
}
