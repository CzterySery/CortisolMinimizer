"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import type { S } from "@/lib/api";
import { day } from "@/lib/format";
import { whoLabel } from "@/lib/labels";
import { documentIssuer, officialForm, prefilledFields, knownPayer, knownPayerDetails, parentProfile, leaveRule, type GuideDoc, type OfficialForm } from "@/lib/document-guides";
import { LegalBasis } from "@/components/legal-basis";
import "./document-guide.css";

export function DocumentGuide({ doc, plan, name, account, onClose, fieldEdits, onFieldsChange }: {
  doc: GuideDoc; plan?: S["Plan-Input"]; name?: string; account?: S["ZusAccount"]; onClose: () => void;
  fieldEdits?: Record<string, string>; onFieldsChange?: (fields: Record<string, string>) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const form = officialForm(doc);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="document-guide" aria-labelledby={title}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    onCancel={(e) => { e.preventDefault(); onClose(); }}>
    <header className="dialog-heading"><div><p className="eyebrow">Demo wypełnienia · {doc.rule === "Oficjalny wzór ZUS" ? "wzór bez danych osoby" : whoLabel[doc.who]}</p>
      <h2 id={title}>{form ? `${form.code} — gdzie wpisać dane?` : doc.form}</h2></div>
      <div className="dialog-heading-actions">
        {form && <div className="form-source-links"><a href={form.pdf} target="_blank" rel="noreferrer">Otwórz oryginalny PDF ↗</a>
          <a href={form.sourcePage} target="_blank" rel="noreferrer">Strona formularza w ZUS ↗</a></div>}
        <button type="button" className="button" autoFocus onClick={onClose}>Zamknij podgląd</button>
      </div>
    </header>
    {!form && <p className="muted">Podpowiedzi i próbne wpisy służą nauce. Nie zmieniają oryginalnego PDF-u ani nie są wysyłane do ZUS.</p>}
    {form ? <OfficialGuide form={form} doc={doc} plan={plan} name={name} account={account}
      fieldEdits={fieldEdits} onFieldsChange={onFieldsChange} /> : documentIssuer(doc) === "doctor" ?
      <section className="panel"><h3>Ten dokument wystawia lekarz</h3><p>e-ZLA trafia elektronicznie do ZUS i płatnika. Nie wypełniasz go samodzielnie. Sprawdź swoje dane oraz okres niezdolności; błąd zgłoś lekarzowi.</p><p>{doc.note}</p><LegalBasis rules={["sick-docs"]} /></section>
      : doc.recipient === "usc" ? <section className="panel"><h3>To wniosek do USC, nie formularz ZUS</h3>
        <p>Przygotuj imię i nazwisko dziecka, datę i miejsce urodzenia, wybór odpisu skróconego lub zupełnego oraz sposób odbioru. Dane wpisujesz w usłudze USC.</p>
        <p>{doc.note}</p><a href="https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-stanu-cywilnego-urodzenia-malzenstwa-zgonu" target="_blank" rel="noreferrer">Otwórz usługę odpisu aktu na gov.pl ↗</a></section>
        : <LeaveGuide doc={doc} name={name} account={account} />}
  </dialog>;
}

function OfficialGuide({ form, doc, plan, name, account, fieldEdits, onFieldsChange }: {
  form: OfficialForm; doc: GuideDoc; plan?: S["Plan-Input"]; name?: string; account?: S["ZusAccount"];
  fieldEdits?: Record<string, string>; onFieldsChange?: (fields: Record<string, string>) => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
  const edits = fieldEdits ?? localEdits;
  const setEdits = (next: Record<string, string> | ((previous: Record<string, string>) => Record<string, string>)) => {
    const updated = typeof next === "function" ? next(edits) : next;
    if (onFieldsChange) onFieldsChange(updated); else setLocalEdits(updated);
  };
  const filled = prefilledFields(form, doc, plan, name, account);
  // Derive untouched values from new account data without overwriting corrections (including clearing).
  const valueOf = (id: string) => edits[id] ?? filled[id]?.value ?? "";
  const fieldHelp = useId();
  const paper = useRef<HTMLDivElement>(null);
  const page = form.pages[pageIndex];
  const selected = page.fields[fieldIndex];
  const suggested = selected ? filled[selected.id] : undefined;
  const employerPart = form.issuer === "employer" || (form.id === "znp7" && page.number >= 3);
  const changePage = (index: number) => { setPageIndex(index); setFieldIndex(0); };
  const selectField = (index: number, scroll = false) => {
    setFieldIndex(index);
    if (scroll) paper.current?.querySelector<HTMLElement>(`[data-field="${page.fields[index]?.id}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const setExample = (value: string) => { if (selected) setEdits({ ...edits, [selected.id]: value }); };

  return <>
    {form.id === "z15" && <p className="notice">Od 24.10.2026 formularz Z-15 zastępuje Z-15A i Z-15B. Poniżej pokazujemy aktualny Z-15, również gdy pozycja planu ma starszą nazwę.</p>}
    {form.id === "znp7" && <p className="notice">Część I (strony 1–2) wypełnia osoba ubiegająca się o świadczenie. Część II (strony 3–4) wypełnia płatnik składek.</p>}
    <div className="form-page-controls">
      <button type="button" className="button" disabled={!pageIndex} onClick={() => changePage(pageIndex - 1)}>Poprzednia strona</button>
      <label className="field">Strona formularza<select value={pageIndex} onChange={(e) => changePage(Number(e.target.value))}>
        {form.pages.map((p, index) => <option key={p.number} value={index}>Strona {p.number} z {form.pages.length}{p.fields.length ? "" : " — pouczenie"}</option>)}
      </select></label>
      <button type="button" className="button" disabled={pageIndex === form.pages.length - 1} onClick={() => changePage(pageIndex + 1)}>Następna strona</button>
      <label className="field">Powiększenie<select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
        <option value={100}>Dopasuj</option><option value={150}>150%</option><option value={200}>200%</option>
      </select></label>
    </div>
    <div className="form-demo-layout">
      <div className="form-paper-scroll" tabIndex={0} aria-label="Oryginalny formularz z zaznaczonymi polami">
        <div ref={paper} className="form-paper" style={{ width: `${zoom}%`, aspectRatio: `${page.width}/${page.height}` }}>
          <Image src={page.image} width={Math.round(page.width * 1.6)} height={Math.round(page.height * 1.6)} unoptimized
            alt={`Oryginalny ${form.code}, strona ${page.number}. Pola są opisane w instrukcji obok.`} />
          {page.fields.map((field, index) => {
            const [left, top, width, height] = field.rect;
            return <button type="button" key={field.id} data-field={field.id} className={`pdf-hotspot ${selected?.id === field.id ? "is-selected" : ""}`}
              style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
              aria-label={`Pole ${index + 1}: ${field.label}`} aria-pressed={selected?.id === field.id} aria-describedby={fieldHelp}
              title={field.label} onClick={() => selectField(index)}>
              <span className="pdf-hotspot-number" aria-hidden="true">{index + 1}</span>
              {valueOf(field.id) && <span className={`pdf-example ${field.type === "CheckBox" ? "is-check" : ""}`} aria-hidden="true">{valueOf(field.id)}</span>}
            </button>;
          })}
        </div>
      </div>
      <aside className="form-field-help" id={fieldHelp}>
        {doc.rule !== "Oficjalny wzór ZUS" && <p className="notice" role="status">
          <strong>Automatycznie uzupełnione pola: {Object.keys(filled).length}.</strong> Dane z planu i konta są już widoczne w formularzu. Sprawdź je i popraw w podglądzie. Nieznane dane i oświadczenia pozostają puste.
          {name && name.trim().split(/\s+/).length !== 2 && <> Imię i nazwisko „{name}” rozdziel ręcznie na właściwe pola.</>}
        </p>}
        {account && doc.rule !== "Oficjalny wzór ZUS" && !parentProfile(doc, account)?.personalData && <p className="notice">
          {parentProfile(doc, account)
            ? "Konto nie udostępniło PESEL-u, daty urodzenia ani adresu. Zaloguj się ponownie lub uzupełnij brakujące dane ręcznie."
            : "Konto nie zawiera danych osobowych tego rodzica. Uzupełnij jego dane ręcznie."}
        </p>}
        {selected?.name.endsWith(".Dataurodzenia[0]") && selected.label.startsWith("Jeśli")
          && parentProfile(doc, account)?.personalData?.pesel && <p className="notice">
            Data urodzenia pozostaje pusta zgodnie z instrukcją ZUS: w tym polu podaje się ją tylko przy braku numeru PESEL. PESEL jest już uzupełniony.
          </p>}
        {form.issuer === "employer" && <p className="notice"><strong>Wypełnia płatnik składek — pracodawca lub zleceniodawca.</strong> Możesz sprawdzić, jakich danych potrzebuje, ale nie podpisujesz tego zaświadczenia za płatnika.</p>}
        {selected ? <>
          <p className="eyebrow">Pole {fieldIndex + 1} · strona {page.number} · {selected.type === "CheckBox" ? "zaznaczenie" : "wpis"}</p>
          <h3>Co tutaj wpisać?</h3><p className="field-official-instruction">{selected.label}</p>
          <p className="muted">{selected.reviewed ? "Podpowiedź sprawdzona z podpisem na wydruku; oryginalny opis techniczny PDF-u wymagał korekty." : "Opis pola pochodzi z oryginalnego PDF-u ZUS."} Warunek „jeśli” oznacza, że pole nie dotyczy każdej sprawy.</p>
          {suggested && <div className="suggested-field"><p><strong>Uzupełniono automatycznie</strong><br />Źródło: {suggested.source}.<br />{suggested.value}</p>
            {selected.id in edits && <p>To pole zostało zmienione w podglądzie.</p>}
            {!employerPart && selected.id in edits && <button type="button" className="button" onClick={() => setEdits((previous) => {
              const next = { ...previous }; delete next[selected.id]; return next;
            })}>Przywróć dane źródłowe</button>}</div>}
          {employerPart ? (form.issuer !== "employer" && <p className="notice">To część dla płatnika. Dane i podpis uzupełnia pracodawca, zleceniodawca albo upoważniona osoba.</p>) : (doc.rule !== "Oficjalny wzór ZUS" && <>
            {selected.type === "CheckBox" ? <label className="field-check"><input type="checkbox" checked={valueOf(selected.id) === "X"}
              onChange={(e) => setExample(e.target.checked ? "X" : "")} />Próbne zaznaczenie X</label>
              : <label className="field">Próbny wpis w tym polu<input value={valueOf(selected.id)} maxLength={220}
                placeholder="Wpisz przykład, aby zobaczyć jego miejsce" autoComplete="off" onChange={(e) => setExample(e.target.value)} /></label>}
            <p className="muted">{onFieldsChange ? "Wpisy zapisują się w tym szkicu i zostaną dołączone do wysyłanej symulacji. Oryginalny PDF pozostaje bez zmian." : "Próbne wpisy zostają wyłącznie w otwartym podglądzie."} Nie wpisuj danych, których nie znasz; PESEL, adres, dane dziecka i rachunek sprawdź we własnych dokumentach.</p>
          </>)}
          <div className="actions"><button type="button" className="button" disabled={!fieldIndex} onClick={() => selectField(fieldIndex - 1, true)}>Poprzednie pole</button>
            <button type="button" className="button" disabled={fieldIndex === page.fields.length - 1} onClick={() => selectField(fieldIndex + 1, true)}>Następne pole</button></div>
        </> : <><h3>Pouczenie z oryginalnego formularza</h3><p>Ta strona nie ma pól do wypełnienia. Przeczytaj warunki i załączniki, a następnie wróć do właściwej części wniosku.</p></>}
      </aside>
    </div>
  </>;
}

function LeaveGuide({ doc, name, account }: { doc: GuideDoc; name?: string; account?: S["ZusAccount"] }) {
  const [selected, setSelected] = useState(0);
  const profile = parentProfile(doc, account);
  const personal = profile?.personalData;
  const payer = knownPayer(doc, account);
  const payerData = knownPayerDetails(doc, account);
  const address = (data: Pick<S["DemoPersonalData"], "street" | "house_number" | "apartment_number" | "postal_code" | "city">) =>
    `${data.street} ${data.house_number}${data.apartment_number ? `/${data.apartment_number}` : ""}\n${data.postal_code} ${data.city}`;
  const insuredDetails = [name || profile?.name || "[Twoje imię i nazwisko]",
    personal?.pesel ? `PESEL: ${personal.pesel}` : "",
    personal?.birth_date ? `Data urodzenia: ${day(personal.birth_date)}` : "",
    personal ? address(personal) : ""].filter(Boolean).join("\n");
  const payerDetails = [payer || "[nazwa pracodawcy]", payerData?.nip ? `NIP: ${payerData.nip}` : "",
    payerData ? address(payerData) : "[uzupełnij adres pracodawcy]"].filter(Boolean).join("\n");
  const period = doc.start && doc.end ? `${day(doc.start)} – ${day(doc.end)}` : "[podaj okres, którego dotyczy wniosek]";
  const areas = [
    { title: "Twoje dane", value: insuredDetails, help: "Dostępne dane pochodzą z profilu osoby składającej ten wniosek. Sprawdź je przed złożeniem pisma. Dane drugiego rodzica podajesz w odpowiednim oświadczeniu, jeśli są wymagane." },
    { title: "Miejsce i data", value: "[miejscowość, data złożenia]", help: "Wpisz miejscowość i rzeczywistą datę złożenia pisma. Nie jest to automatycznie data rozpoczęcia urlopu." },
    { title: "Adresat", value: doc.recipient === "employer" ? payerDetails : "[właściwy adresat]", help: "Nazwa, NIP i adres pracodawcy, jeśli są dostępne, pochodzą z właściwego okresu ubezpieczenia tego rodzica na koncie." },
    { title: "Treść i okres", value: `${doc.form}\nOkres: ${period}`, help: "Wskaż rodzaj urlopu i dokładne daty. Okres pochodzi z planu; sprawdź go przed przepisaniem do podpisanego wniosku." },
    { title: "Oświadczenia i załączniki", value: doc.note || "[wymagane oświadczenia i załączniki]", help: "Uzupełnij wymagane oświadczenia zgodnie ze stanem faktycznym. Informacja poniżej wynika z Twojego planu. Nie składaj oświadczenia, jeśli nie potwierdzasz jego treści." },
    { title: "Podpis", value: "[Twój podpis]", help: "Podpisz dokument w wymagany sposób. Ten podgląd nie jest podpisem elektronicznym ani wysłaniem wniosku." },
  ];
  return <>
    <p className="notice">{doc.recipient === "employer" ? "To nasz przykład pisma do pracodawcy, nie oficjalny formularz ZUS. Wnioski urlopowe mogą mieć wzór przyjęty w Twojej firmie." : "To przykład treści pisma, nie oficjalny formularz ZUS. Przed złożeniem sprawdź właściwy wzór na stronie ZUS."} Kliknij fragment pisma, aby zobaczyć instrukcję.</p>
    <div className="form-demo-layout"><div className="leave-demo-paper" aria-label="Przykład wniosku urlopowego">
      <p className="eyebrow">PRZYKŁAD · SYMULACJA</p>
      {areas.map((area, index) => <button type="button" key={area.title} className={`leave-demo-field ${selected === index ? "is-selected" : ""}`}
        aria-pressed={selected === index} onClick={() => setSelected(index)}><small>{index + 1}. {area.title}</small><span>{area.value}</span></button>)}
    </div><aside className="form-field-help"><label className="field">Fragment wniosku<select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
      {areas.map((area, i) => <option key={area.title} value={i}>{i + 1}. {area.title}</option>)}
    </select></label><h3>{areas[selected].title}</h3><p>{areas[selected].help}</p>
      {doc.due_by && <p><strong>Termin z planu:</strong> {day(doc.due_by)}</p>}
      <LegalBasis rules={[leaveRule(doc)]} />
    </aside></div>
  </>;
}
