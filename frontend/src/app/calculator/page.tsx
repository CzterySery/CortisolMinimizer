"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type S } from "@/lib/api";
import { employmentLabel, whoLabel } from "@/lib/labels";
import { myPlan, planHandoff, userToken } from "@/lib/session";
import { BlocksEditor } from "@/components/forms/blocks-editor";
import { FamilyForm, ParentFields } from "@/components/forms/family-form";
import { LegalBasis } from "@/components/legal-basis";
import { PageHeader } from "@/components/page-header";
import { PlanTimeline } from "@/components/plan/plan-timeline";

type Plan = S["Plan-Input"];
type Parent = S["Parent-Input"];
type Who = "mother" | "father";
type IncomeMode = "base" | "history" | "unknown" | "estimate";
const steps = ["Sytuacja", "Dziecko", "Mama", "Drugi rodzic", "Dodatkowe dane", "Urlopy", "Wypłata", "Wynik"];
const titles = ["Od czego zaczynamy?", "Powiedz nam o dziecku.", "Z czego wynika ubezpieczenie mamy?",
  "Czy planujecie opiekę we dwoje?", "Czy są dodatkowe okoliczności?", "Jak chcecie podzielić czas?",
  "Jak ma być wypłacany zasiłek?", "Wasz plan."];
const initial: Plan = { family: { mother: { employment: "none" }, due_date: "", children: 1 }, blocks: [], rate_variant: "standard" };

export default function Calculator() {
  const [plan, setPlan] = useState<Plan>(initial);
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState<"birth" | "adoption" | "foster">();
  const [birthStatus, setBirthStatus] = useState<"expected" | "born">();
  const [withFather, setWithFather] = useState<boolean>();
  const [confirmed, setConfirmed] = useState<Partial<Record<Who, boolean>>>({});
  const [income, setIncome] = useState<Partial<Record<Who, IncomeMode>>>({});
  const [result, setResult] = useState<S["PlanResult"]>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const handoff = useRef<{ plan?: Plan } | null>(null);

  useEffect(() => {
    if (!handoff.current) handoff.current = { plan: planHandoff.take() as Plan | undefined };
    const ctrl = new AbortController();
    request.current = ctrl;
    const populate = (saved: Plan) => {
      setPlan(saved); setSituation(saved.family.adoption?.kind ?? "birth");
      setBirthStatus(saved.family.birth_date ? "born" : "expected"); setWithFather(!!saved.family.father);
      setConfirmed({ mother: true, father: !!saved.family.father });
      setIncome(Object.fromEntries((["mother", "father"] as const).flatMap((who) => {
        const parent = saved.family[who];
        return parent ? [[who, parent.base_monthly != null ? "base" : parent.gross_monthly_estimate != null ? "estimate" : parent.salary_history?.length ? "history" : "unknown"]] : [];
      })));
    };
    const load = async () => {
      await Promise.resolve();
      if (ctrl.signal.aborted) return;
      if (handoff.current?.plan) { populate(handoff.current.plan); return; }
      const token = userToken.get();
      if (!token) return;
      setBusy(true);
      try {
        const account = await api.GET("/api/v1/zus/me", { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (account.response.status === 401) { userToken.set(); return; }
        if (!account.data) throw new Error("Nie udało się pobrać danych profilu. Możesz uzupełnić je ręcznie.");
        populate(account.data.plan); setStep(7);
        const response = await api.POST("/api/v1/calc/plan", { body: account.data.plan, signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (!response.data) throw new Error("Nie udało się obliczyć planu z profilu. Spróbuj ponownie lub popraw dane we wcześniejszych krokach.");
        setResult(response.data);
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Nie udało się pobrać planu z profilu.");
      } finally { if (!ctrl.signal.aborted) setBusy(false); }
    };
    void load();
    return () => ctrl.abort();
  }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => () => request.current?.abort(), []);

  const update = (next: Plan) => { setPlan(next); setResult(undefined); setError(undefined); };
  const family = (next: Plan["family"]) => update({ ...plan, family: next });
  const back = (next = step - 1) => {
    request.current?.abort(); setBusy(false); setError(undefined); setResult(undefined); setStep(next);
  };
  const parentReady = (who: Who) => {
    const p = plan.family[who];
    return !!p && confirmed[who] && (p.employment === "none" || (income[who] &&
      (income[who] === "unknown" || (income[who] === "base" ? Number(p.base_monthly) > 0 :
        income[who] === "estimate" ? Number(p.gross_monthly_estimate) > 0 : !!p.salary_history?.length))));
  };
  const next = async () => {
    if (busy) return;
    setError(undefined);
    if (step === 0 && !situation) return setError("Wybierz sytuację rodziny.");
    if (step === 1 && situation === "birth" && !birthStatus) return setError("Wybierz, czy dziecko już się urodziło.");
    if (step === 2 && !parentReady("mother")) return setError("Wybierz formę zatrudnienia i sposób podania dochodów.");
    if (step === 3 && (withFather === undefined || (withFather && !parentReady("father")))) return setError("Uzupełnij dane drugiego rodzica albo wybierz plan jednej osoby.");
    if (step === 4 && !plan.blocks?.length) {
      const ctrl = new AbortController(); request.current = ctrl; setBusy(true);
      try {
        const response = await api.POST("/api/v1/calc/start", { body: plan, signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (!response.data) throw new Error("Nie udało się przygotować pierwszego okresu. Spróbuj ponownie.");
        update(response.data); setStep(5);
      } catch (e) { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Brak połączenia z kalkulatorem."); }
      finally { if (!ctrl.signal.aborted) setBusy(false); }
      return;
    }
    if (step === 6 || step === 7) {
      const ctrl = new AbortController(); request.current = ctrl; setBusy(true);
      try {
        const response = await api.POST("/api/v1/calc/plan", { body: plan, signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (!response.data) throw new Error(typeof response.error?.detail === "string" ? response.error.detail : "Sprawdź daty i dane w poprzednich krokach.");
        setResult(response.data); setStep(7);
      } catch (e) { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Nie udało się obliczyć planu."); }
      finally { if (!ctrl.signal.aborted) setBusy(false); }
      return;
    }
    setStep(step + 1);
  };
  const unknownBases = (["mother", "father"] as const).filter((who) => {
    const p = plan.family[who];
    return p && p.employment !== "none" && p.base_monthly == null && p.gross_monthly_estimate == null && !p.salary_history?.length;
  });
  const invalid = result?.issues.filter((issue) => issue.severity === "error") ?? [];
  const event = plan.family.adoption
    ? [plan.family.adoption.accepted_on, plan.family.adoption.court_applied_on ?? ""].sort().at(-1)!
    : plan.family.birth_date || plan.family.due_date;

  return <main className="page calculator-page">
    <PageHeader eyebrow="Kalkulator zasiłku" title="Policz swój plan." accent="Jedno pytanie naraz.">
      Przejdziemy przez Waszą sytuację krok po kroku. Kwoty, plan opieki i dokumenty zobaczysz na końcu.
    </PageHeader>
    <nav aria-label="Kroki kalkulatora" className="calculator-steps"><ol>
      {steps.map((name, i) => <li key={name} aria-current={i === step ? "step" : undefined}>
        {i < step ? <button type="button" onClick={() => back(i)}><span>{i + 1}</span>{name}</button>
          : <span><b>{i + 1}</b>{name}</span>}
      </li>)}
    </ol></nav>
    <section className="calculator-step" aria-labelledby="calculator-question">
      <p className="eyebrow">Krok {step + 1} z {steps.length}</p>
      <h2 id="calculator-question" ref={heading} tabIndex={-1}>{titles[step]}</h2>
      <form key={step} onSubmit={(e) => { e.preventDefault(); void next(); }}>
        <div className="stack">
          {busy && <p role="status">{step === 7 ? "Obliczam wynik na podstawie danych profilu…" : "Przygotowuję dane…"}</p>}
          {step === 0 && !busy && <>
            <LegalBasis rules={situation === "birth" ? ["maternity-pool"] : situation ? ["adoption"] : ["maternity-pool", "adoption"]} />
            <fieldset className="choice-options"><legend>Sytuacja rodziny</legend><div className="choice-grid situation-choices">
              {([ ["birth", "Urodzenie dziecka", "Czekacie na narodziny lub dziecko jest już z Wami."],
                ["adoption", "Adopcja", "Przyjęcie dziecka i wystąpienie o przysposobienie."],
                ["foster", "Rodzina zastępcza niezawodowa", "Przyjęcie dziecka w ramach pieczy zastępczej."] ] as const).map(([kind, label, description]) =>
                  <button key={kind} type="button" className="choice" aria-pressed={situation === kind} onClick={() => {
                    if (kind === situation) return;
                    setSituation(kind); update({ ...plan, blocks: [], family: { ...plan.family,
                      adoption: kind === "birth" ? null : { kind, accepted_on: "", court_applied_on: null }, hospitalization: null,
                    } });
                  }}><strong>{label}</strong><span>{description}</span></button>)}
            </div></fieldset>
            <aside className="calculator-login"><p>Masz dane na koncie ZUS? Możesz zacząć od ich pobrania w symulacji.</p>
              <Link className="button" href="/login">Zaloguj się przez mObywatel</Link>
            </aside>
          </>}
          {step === 1 && <>
            {situation === "birth" && <fieldset className="choice-options"><legend>Na jakim jesteście etapie?</legend>
              {([ ["expected", "Czekamy na narodziny"], ["born", "Dziecko już się urodziło"] ] as const).map(([status, text]) =>
                <label className="field-check" key={status}><input required type="radio" name="birth-status" checked={birthStatus === status}
                  onChange={() => { setBirthStatus(status); update({ ...plan, blocks: [], family: { ...plan.family,
                    birth_date: status === "expected" ? null : plan.family.birth_date } }); }} />{text}</label>)}
            </fieldset>}
            {(situation !== "birth" || birthStatus) && <FamilyForm value={plan.family} section="child" birthStatus={situation === "birth" ? birthStatus : undefined}
              onChange={(f) => update({ ...plan, family: f, blocks: [] })} />}
            <LegalBasis rules={[situation === "birth" ? "maternity-pool" : "adoption"]} />
          </>}
          {step === 2 && <ParentQuestion who="mother" value={plan.family.mother} confirmed={!!confirmed.mother} income={income.mother}
            onConfirm={() => setConfirmed({ ...confirmed, mother: true })} onIncome={(mode) => setIncome({ ...income, mother: mode })}
            onChange={(mother) => family({ ...plan.family, mother })} />}
          {step === 3 && <>
            <LegalBasis rules={["simultaneous", "exclusive-rate"]} />
            <fieldset className="choice-options"><legend>Czy uwzględniamy drugiego rodzica?</legend>
              <label className="field-check"><input required type="radio" name="second-parent" checked={withFather === true} onChange={() => {
                setWithFather(true); family({ ...plan.family, father: plan.family.father ?? { employment: "none" } });
              }} />Tak, planujemy razem</label>
              <label className="field-check"><input required type="radio" name="second-parent" checked={withFather === false} onChange={() => {
                setWithFather(false); update({ ...plan, blocks: (plan.blocks ?? []).filter((b) => b.who !== "father"),
                  family: { ...plan.family, father: null, adoption: plan.family.adoption ? { ...plan.family.adoption, applicant: "mother" } : null } });
              }} />Nie, liczymy plan jednej osoby</label>
            </fieldset>
            {withFather && plan.family.father && <ParentQuestion who="father" value={plan.family.father} confirmed={!!confirmed.father} income={income.father}
              onConfirm={() => setConfirmed({ ...confirmed, father: true })} onIncome={(mode) => setIncome({ ...income, father: mode })}
              onChange={(father) => family({ ...plan.family, father })} />}
          </>}
          {step === 4 && <>
            <p>Jeśli żadna z tych sytuacji Was nie dotyczy, przejdź dalej.</p>
            <FamilyForm value={plan.family} onChange={family} section="health" />
            <LegalBasis rules={["za-zyciem", "supplementary"]} />
          </>}
          {step === 5 && <>
            <p>Pierwszy okres przygotowaliśmy na podstawie danych rodziny. Możesz go zmienić, dodać kolejne okresy i podzielić je między rodziców.</p>
            <BlocksEditor value={plan.blocks ?? []} onChange={(blocks) => update({ ...plan, blocks })} whos={withFather ? ["mother", "father"] : ["mother"]} />
            <p className="muted">Dni bez wpisanego okresu traktujemy jako pracę. Rehabilitacja i opieka wymagają potwierdzenia odpowiednich przesłanek; samo wpisanie okresu nie potwierdza prawa.</p>
            <LegalBasis rules={["parental-parts", "simultaneous", "exclusive-rate"]} />
          </>}
          {step === 6 && <>
            <fieldset className="choice-options"><legend>Wariant wypłaty</legend>
              <label className="field-check"><input type="radio" name="rate" checked={plan.rate_variant !== "averaged"} onChange={() => update({ ...plan, rate_variant: "standard", averaged_request_on: null })} />
                Standardowo: 100% macierzyńskiego, 70% rodzicielskiego</label>
              <label className="field-check"><input type="radio" name="rate" checked={plan.rate_variant === "averaged"} onChange={() => update({ ...plan, rate_variant: "averaged" })} />
                81,5% — z wnioskiem w ciągu 21 dni od {plan.family.adoption ? "przyjęcia i spełnienia przesłanek" : "porodu"}</label>
            </fieldset>
            <p className="muted">Wyłączne 9 tygodni drugiego rodzica pozostaje płatne w wysokości 70%. Ojcowski i uzupełniający mają stawkę 100%.</p>
            {plan.rate_variant === "averaged" && <>
              {plan.family.adoption && <label className="field">Rodzic składający wniosek o 81,5%
                <select value={plan.family.adoption.applicant ?? "mother"} onChange={(e) => family({ ...plan.family,
                  adoption: { ...plan.family.adoption!, applicant: e.target.value as Who } })}>
                  <option value="mother">Mama</option>{withFather && <option value="father">Tata</option>}
                </select></label>}
              <label className="field">Data złożenia lub planowanego złożenia wniosku o 81,5%
                <input required type="date" value={plan.averaged_request_on ?? ""} onChange={(e) => update({ ...plan, averaged_request_on: e.target.value || null })} />
              </label>
              <p className="muted">Termin sprawdzimy dla podanej daty. Wniosek złożony wcześniej na czas nie staje się spóźniony dlatego, że dziś minęło już 21 dni.</p>
            </>}
            <LegalBasis rules={["standard-rates", "averaged", "exclusive-rate", "top-up"]} />
          </>}
          {error && <p className="notice error" role="alert">{error}</p>}
          {step === 7 && !busy && !result && <button type="submit" className="button button-primary">Spróbuj obliczyć ponownie</button>}
          {step === 7 && result && <>
            <p>{situation === "birth" ? "Urodzenie dziecka" : situation === "adoption" ? "Adopcja" : "Piecza niezawodowa"} · {event} · {withFather ? "oboje rodzice" : "plan jednej osoby"}</p>
            <p className="notice">To wyliczenie dla podanych danych — możesz cofnąć się do wcześniejszych kroków i uzupełnić lub poprawić dane.</p>
            {(["mother", "father"] as const).some((who) => {
              const parent = plan.family[who];
              return parent && ["employee", "contract"].includes(parent.employment) && !parent.payer_insured_count;
            }) && <p className="notice">Nie podano liczby osób zgłoszonych przez płatnika. Listę dokumentów przygotowujemy przy założeniu, że zasiłek wypłaca ZUS. Potwierdź to u pracodawcy lub zleceniodawcy; liczbę zmienisz w dodatkowych danych rodzica.</p>}
            {invalid.length ? <section className="panel" role="alert"><h3>Plan wymaga korekty</h3>
              <p>Najpierw popraw poniższe punkty. Dla niedozwolonego planu nie pokazujemy kwot ani wykresów.</p>
              <ul className="issues">{invalid.map((issue) => <li key={issue.code}>{issue.text}<LegalBasis rules={[issue.code.split(".")[0]]} /></li>)}</ul>
              <button type="button" className="button" onClick={() => back(5)}>Popraw plan urlopów</button>
            </section> : <>
              <PlanTimeline
                result={result}
                unknownBases={[...unknownBases]}
                assumptions={
                  <div className="calculator-assumptions">
                    <h4>Zakres obliczeń i założenia</h4>
                    <p>Zasiłki pokazujemy przed PIT. Jedna podstawa na rodzica i jedna wersja parametrów dotyczą całego planu. Szybki szacunek z jednej pensji nie zastępuje podstawy ustalonej przez płatnika.</p>
                    <p>Hospitalizację wpisujesz jako kwalifikujące dni z zaświadczenia. Wyjątki dotyczące straty dziecka, szczególnego przejęcia urlopu, niektórych okresów po ustaniu ubezpieczenia i złożonych składników wynagrodzenia wymagają osobnej weryfikacji. To wyliczenie dla podanych danych, nie decyzja ZUS.</p>
                    <a href="/sources/benefits-act#article-31" target="_blank" rel="noreferrer">Ustawa zasiłkowa — wysokość świadczeń ↗</a>
                  </div>
                }
              />
              <div className="actions"><Link href="/me#dokumenty" className="button button-primary" onClick={() => myPlan.put(plan)}>Przygotuj wnioski dla tego planu</Link></div>
            </>}
          </>}
          <div className="calculator-navigation">
            {step > 0 && <button type="button" className="button" onClick={() => back()}>Wstecz</button>}
            {step < 7 && <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? "Przygotowuję…" : step === 6 ? "Oblicz i pokaż wynik" : "Dalej"}
            </button>}
          </div>
        </div>
      </form>
    </section>
  </main>;
}

function ParentQuestion({ who, value, confirmed, income, onConfirm, onIncome, onChange }: {
  who: Who; value: Parent; confirmed: boolean; income?: IncomeMode;
  onConfirm: () => void; onIncome: (mode: IncomeMode) => void; onChange: (value: Parent) => void;
}) {
  const chooseIncome = (mode: IncomeMode) => {
    onIncome(mode);
    onChange({ ...value, base_monthly: mode === "base" ? value.base_monthly : null,
      gross_monthly_estimate: mode === "estimate" ? value.gross_monthly_estimate : null,
      salary_history: mode === "history" ? value.salary_history : [] });
  };
  return <>
    <LegalBasis rules={["insured-parent", "base", ...(confirmed && value.employment !== "none" ? ["payer", ...(value.employment === "self_employed" ? ["debt"] : [])] : [])]} />
    <label className="field">Forma zatrudnienia — {whoLabel[who].toLowerCase()}
      <select required value={confirmed ? value.employment : ""} onChange={(e) => {
        onConfirm();
        if (income === "estimate" && e.target.value !== "employee") onIncome("unknown");
        onChange({ ...value, employment: e.target.value as Parent["employment"], voluntary_sickness: false,
          gross_monthly_estimate: e.target.value === "employee" ? value.gross_monthly_estimate : null });
      }}><option value="" disabled>Wybierz formę zatrudnienia</option>{Object.entries(employmentLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </label>
    {confirmed && value.employment !== "none" && <>
      <label className="field">Jak podasz dane do wyliczenia?
        <select required value={income ?? ""} onChange={(e) => chooseIncome(e.target.value as IncomeMode)}>
          <option value="" disabled>Wybierz sposób</option>
          {value.employment === "employee" && <option value="estimate">Podam pensję brutto — szybki szacunek</option>}
          <option value="base">Znam podstawę wymiaru zasiłku</option>
          {income === "history" && <option value="history">Dokładne dane miesięczne</option>}
          <option value="unknown">Nie znam jeszcze kwot</option></select>
      </label>
      {income === "estimate" && <>
        <label className="field">Wynagrodzenie brutto z ostatniego miesiąca (zł)
          <input required type="number" min={0.01} step="0.01" value={value.gross_monthly_estimate ?? ""}
            onChange={(e) => onChange({ ...value, gross_monthly_estimate: e.target.value || null })} />
        </label>
        <p className="muted">Użyj pełnej miesięcznej pensji brutto, bez pomniejszenia za nieobecność. Wynik będzie orientacyjny. ZUS zwykle bierze średnią z 12 miesięcy; premie, podwyżki i nieobecności mogą ją zmienić.</p>
      </>}
      {income && <ParentFields label={whoLabel[who]} value={value} hideEmployment incomeMode={income === "estimate" ? "unknown" : income} onChange={onChange} />}
      {income !== "history" && <details className="income-history-choice"><summary>Chcę użyć dokładnych danych z poprzednich miesięcy</summary>
        <p>Wpisz miesięczne wynagrodzenia z Z-3 lub podstawy składek, jeśli kwoty się zmieniały.</p>
        <button type="button" className="button" onClick={() => chooseIncome("history")}>Wpisz dane miesięczne</button>
      </details>}
      {income === "unknown" && <p className="notice">Możesz zaplanować okresy i dokumenty. Nie przedstawimy brakujących kwot jako zerowego dochodu.</p>}
    </>}
    {confirmed && value.employment === "none" && <p className="notice">Brak tytułu do ubezpieczenia może oznaczać brak prawa do zasiłku. Sprawdzimy wpisane okresy; nie założymy ubezpieczenia za Ciebie.</p>}
  </>;
}
