"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";
import { month, pln } from "@/lib/format";
import { whoLabel } from "@/lib/labels";
import { ApiResult } from "@/components/api-result";
import { BlocksEditor } from "@/components/forms/blocks-editor";
import { FamilyForm } from "@/components/forms/family-form";
import { PageHeader } from "@/components/page-header";
import { PlanTimeline } from "@/components/plan/plan-timeline";

type Sample = S["SampleCase"];
type Uploaded = { sha256: string; title: string };
const blank: S["Plan-Input"] = {
  family: { mother: { employment: "employee" }, due_date: "2026-09-20" },
  blocks: [{ who: "mother", kind: "maternity", start: "2026-09-20", days: 140 }],
};

// Jury flow: pick one of the transcribed ZUS sample cases or upload its PDF (recognized by hash), or type the data
// from any case by hand. The verdict comes from the same calculator and rules as everything else.
export default function Cases() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sample, setSample] = useState<Sample>();
  const [manual, setManual] = useState<S["Plan-Input"]>();
  const [uploaded, setUploaded] = useState<Uploaded>(); // the uploaded PDF the manual form was read from
  const [verdict, setVerdict] = useState<S["CaseVerdict"]>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    api.GET("/api/v1/cases/samples").then(({ data, error }) => (error ? setError(error) : setSamples(data)));
  }, []);

  // with `from`, the backend stores the checked (possibly corrected) case as that file's reading
  const evaluate = async (plan: S["Plan-Input"], picked?: Sample, from?: Uploaded) => {
    setSample(picked); setVerdict(undefined); setError(undefined);
    const { data, error } = await api.POST("/api/v1/cases/evaluate", {
      body: { plan, title: from?.title }, params: { query: { upload: from?.sha256 } },
    });
    if (error) setError(error); else setVerdict(data);
  };

  const upload = async (file: File) => {
    setVerdict(undefined); setSample(undefined); setError(undefined); setManual(undefined); setUploaded(undefined);
    setMessage("Odczytujemy plik… Skan bez warstwy tekstowej czyta model AI, co może potrwać kilka minut.");
    const { data, error } = await api.POST("/api/v1/cases/parse", {
      body: { file: file as unknown as string }, // generated type says string for binary; the serializer sends the File
      bodySerializer: (b) => { const fd = new FormData(); fd.append("file", b.file); return fd; },
    });
    if (error) { setMessage(undefined); return setError(error); }
    setMessage(data.message);
    if (data.sha256) setUploaded({ sha256: data.sha256, title: data.extracted?.title ?? "" });
    if (data.sample) void evaluate(data.sample.plan as S["Plan-Input"], data.sample);
    else if (data.extracted) { setManual(data.extracted.plan as S["Plan-Input"]); void evaluate(data.extracted.plan as S["Plan-Input"]); }
    else setManual(blank);
  };

  return (
    <main className="page">
      <PageHeader eyebrow="Sprawdź sprawę" title="Masz już dokumenty?" accent="Sprawdźmy je.">
        Wybierz przykładową sprawę ZUS albo wgraj PDF sprawy. Skan odczyta model AI (Google Gemini), a odczytane dane sprawdzisz i poprawisz w formularzu. Prawo do zasiłku i kwoty liczy kalkulator, nie model.
      </PageHeader>
      <div className="stack">
        <section className="choice-grid" aria-label="Przykładowe sprawy ZUS">
          {samples.map((s) => (
            <button key={s.id} className="choice" onClick={() => { setManual(undefined); setUploaded(undefined); setMessage(undefined); void evaluate(s.plan as S["Plan-Input"], s); }}>
              <strong>{s.title}</strong><span>{s.source}</span>
            </button>
          ))}
        </section>
        <div className="actions">
          <label className="dropzone">
            <span>Wgraj PDF sprawy</span>
            <input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          <button className="button button-dashed" onClick={() => { setManual(blank); setUploaded(undefined); setSample(undefined); setVerdict(undefined); setMessage(undefined); }}>Wpisz dane ręcznie</button>
        </div>
        {message && <p className="notice" role="status">{message}</p>}
        {manual && <div className="stack">
          <FamilyForm value={manual.family} onChange={(family) => setManual({ ...manual, family })} />
          <fieldset className="form-section">
            <legend>Wysokość zasiłku</legend>
            <label className="field-check"><input type="radio" name="case-rate" checked={manual.rate_variant !== "averaged"} onChange={() => setManual({ ...manual, rate_variant: "standard" })} /> 100% / 70%</label>
            <label className="field-check"><input type="radio" name="case-rate" checked={manual.rate_variant === "averaged"} onChange={() => setManual({ ...manual, rate_variant: "averaged" })} /> 81,5%</label>
          </fieldset>
          <BlocksEditor value={manual.blocks ?? []} onChange={(blocks) => setManual({ ...manual, blocks })} />
          {uploaded && <p className="muted">Po sprawdzeniu zapiszemy te dane (z Twoimi poprawkami) dla wgranego pliku: po ponownym wgraniu wrócą w tej postaci.</p>}
          <div className="actions"><button className="button button-primary" onClick={() => evaluate(manual, undefined, uploaded)}>Sprawdź sprawę</button></div>
        </div>}
        {error ? <ApiResult error={error} /> : null}
        {verdict && <Verdict verdict={verdict} sample={sample} />}
      </div>
    </main>
  );
}

function Verdict({ verdict, sample }: { verdict: S["CaseVerdict"]; sample?: Sample }) {
  const yes = (ok: boolean, good: string, bad: string) => <li className={ok ? "done" : "error"}>{ok ? good : bad}</li>;
  return (
    <section className="stack" aria-live="polite">
      <section className="panel">
        <h2 className="eyebrow">Wynik</h2>
        <ul className="docs">
          {yes(verdict.insured, "Ubezpieczenie chorobowe: jest", "Ubezpieczenie chorobowe: brak")}
          {yes(verdict.waiting_period_ok, "Okres wyczekiwania: spełniony", "Okres wyczekiwania: niespełniony")}
          {yes(!verdict.debt_block, "Zadłużenie składkowe: nie blokuje", "Zadłużenie składkowe: blokuje zasiłki")}
          {yes(verdict.entitled, "Prawo do zasiłku: tak", "Prawo do zasiłku: nie (szczegóły w „Ryzyka i uwagi”)")}
        </ul>
        {sample && <>
          <p><strong>Decyzja ZUS:</strong> {sample.zus_outcome} {sample.zus_entitled === verdict.entitled ? "Wynik kalkulatora jest zgodny." : "Wynik kalkulatora jest inny."}</p>
          {sample.granted.map((g) => (
            <div key={g.who} className="table-scroll"><table className="data-table">
              <thead><tr><th>{whoLabel[g.who]}</th><th>ZUS</th><th>Kalkulator</th></tr></thead>
              <tbody>
                {g.base && <tr><td>Podstawa wymiaru</td><td>{pln(g.base)}</td><td>{pln(verdict.result.bases[g.who] ?? 0)}</td></tr>}
                {Object.entries(g.months).map(([m, amount]) => <tr key={m}>
                  <td>Wypłata za {month(m)}</td><td>{pln(amount)}</td>
                  <td>{pln(verdict.result.months.find((row) => row.month === m)?.benefit[g.who] ?? 0)}</td>
                </tr>)}
              </tbody>
            </table></div>
          ))}
          {sample.note && <p className="muted">{sample.note}</p>}
        </>}
      </section>
      <PlanTimeline result={verdict.result} />
    </section>
  );
}
