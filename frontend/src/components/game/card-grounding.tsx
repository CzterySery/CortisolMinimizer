"use client";

import { useId, useRef, useState } from "react";
import legal from "../../../../shared/legal-rules.json";
import params from "../../../../backend/app/data/params.json";
import manifest from "../../../../Documents/legal/manifest.json";
import type { Card } from "@/types/game";
import { getCardSignals } from "@/lib/card-signals";

const sourceTitles: Record<string, string> = Object.fromEntries(manifest.map((source) => [source.id, source.title]));

const labels: Record<string, string> = {
  description: "Co oznacza ta decyzja?", conditions: "Kiedy możesz skorzystać?",
  "stats.money": "Pieniądze", "stats.time": "Czas", "stats.happiness": "Szczęście",
  "rates.sick_pregnancy": "Chorobowe w ciąży", "rates.maternity": "Macierzyński",
  "rates.parental": "Rodzicielski", "rates.averaged": "Wariant uśredniony",
  "rates.care": "Opiekuńczy", "rates.paternity": "Ojcowski", "rates.supplementary": "Uzupełniający",
  "rates.job_loss": "Świadczenie przed porodem po utracie pracy",
  "maternity.weeks_by_children": "Tygodnie według liczby dzieci przy jednym zdarzeniu",
  "maternity.prebirth_max_weeks": "Maksimum tygodni przed porodem",
  "maternity.mother_personal_weeks": "Wymagane tygodnie mamy po porodzie",
  "maternity.adoption_min_weeks": "Minimalny wymiar przy przyjęciu (tygodnie)",
  "paternity.days": "Pula ojcowskiego (dni)", "paternity.min_part_days": "Najkrótsza część ojcowskiego (dni)",
  "paternity.max_parts": "Maksymalna liczba części ojcowskiego", "paternity.notice_days": "Wyprzedzenie wniosku ojcowskiego (dni)",
  "paternity.use_by_child_months": "Granica wieku przy urodzeniu (miesiące)",
  "parental.exclusive_weeks": "Wyłączna część każdego rodzica (tygodnie)",
  "parental.max_parts": "Limit części rodzicielskiego", "parental.last_child_age_years": "Rok ukończenia tego wieku — ścieżka urodzenia",
  "parental.weeks_za_zyciem_single": "Za życiem: jedno dziecko (tygodnie)",
  "parental.weeks_za_zyciem_multiple": "Za życiem: poród mnogi (tygodnie)",
  "parental.part_time_max_fraction": "Maksymalna część etatu przy łączeniu",
  "parental.part_time_cap_weeks_single": "Limit wydłużenia bez Za życiem: jedno dziecko (tygodnie)",
  "parental.part_time_cap_weeks_multiple": "Limit wydłużenia bez Za życiem: poród mnogi (tygodnie)",
  "deadlines.averaged_request_days_after_birth": "Termin wniosku uśrednionego od zdarzenia (dni)",
  "deadlines.part_time_notice_days": "Wyprzedzenie wniosku o pracę podczas urlopu (dni)",
  "deadlines.supplementary_notice_days_before_maternity_end": "Wniosek przed końcem macierzyńskiego (dni)",
  "sick.period_days_pregnancy": "Okres zasiłkowy w ciąży (dni)",
  "sick.waiting_days_mandatory": "Zwykłe wyczekiwanie — ubezpieczenie obowiązkowe (dni)",
  "sick.waiting_days_voluntary": "Zwykłe wyczekiwanie — ubezpieczenie dobrowolne (dni)",
  "sick.employer_days": "Wynagrodzenie chorobowe w roku (dni)",
  "sick.employer_days_50plus": "Wynagrodzenie chorobowe — właściwa grupa wieku (dni)",
  "supplementary.extreme.cap_weeks": "Okno hospitalizacji — najwcześniejszy poród / niska masa (tygodnie)",
  "supplementary.preterm.cap_weeks": "Okno hospitalizacji — wcześniak (tygodnie)",
  "supplementary.term.cap_weeks": "Okno hospitalizacji — poród o czasie (tygodnie)",
  "care.days_per_year_child_under_14": "Wspólny roczny limit opieki nad dziećmi do lat 14 (dni)",
  payer_threshold_insured: "Próg liczby ubezpieczonych — płatnik wypłaca powyżej",
  debt_threshold_pct_min_wage: "Próg zadłużenia jako część płacy minimalnej",
  contribution_deduction: "Potrącenie składkowe — zasady zależą od tytułu",
  parental_benefit_floor: "Kwota świadczenia rodzicielskiego użyta do podwyższenia (zł)",
};

function parameterValue(path: string) {
  let value: unknown = params;
  for (const part of path.split(".")) value = (value as Record<string, unknown>)[part];
  if (Array.isArray(value)) return value.join(" / ");
  if (path.startsWith("rates.") || path.includes("fraction") || path.includes("pct_") || path === "contribution_deduction") {
    return new Intl.NumberFormat("pl-PL", { style: "percent", maximumFractionDigits: 2 }).format(Number(value));
  }
  return String(value).replace(".", ",");
}

export function CardGrounding({ card }: { card: Card }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [field, setField] = useState("description");
  const design = card.design;
  if (!design) return null;
  const claims = design.claims;
  const signals = getCardSignals(card);
  const explanation = field.startsWith("parameter:") ? "Wartość z konfiguracji podglądu. W konkretnej sprawie trzeba zastosować wersję właściwą dla daty zdarzenia i sprawdzić wyjątki." :
    field === "description" ? design.description : field === "conditions" ? design.conditions :
    field === "stats.money" ? signals?.moneyReason ?? design.stats.money.explanation : field === "stats.time" ? signals?.timeReason ?? design.stats.time.explanation :
    "Szczęście jest umownym bilansem pieniędzy i czasu w opisanym porównaniu: poprawa jednego obszaru i pogorszenie drugiego równoważą się. Gdy wpływ na dochód lub czas jest nieznany, bilans też pozostaje niepewny. To mechanika gry, nie miara zdrowia ani gwarancja samopoczucia.";
  const ruleIds = field === "stats.money" || field === "stats.time" ? signals?.ruleIds ?? [] : design.claims.find((claim) => claim.field === field)?.rule_ids ?? [];
  const rules = legal.rules.filter((rule) => ruleIds.includes(rule.id));
  function inspect(next: string) { setField(next); if (!dialog.current?.open) dialog.current?.showModal(); }
  function hint(next: string, text: string) {
    const refs = next === "stats.money" || next === "stats.time" ? signals?.ruleIds ?? [] : claims.find((claim) => claim.field === next)?.rule_ids ?? [];
    const locators = legal.rules.filter((rule) => refs.includes(rule.id)).flatMap((rule) => rule.evidence.map((e) => `${sourceTitles[e.document_id]} · ${e.locator}`));
    return `${text}\n${locators.slice(0, 3).join("; ")}\nKliknij, aby przeczytać uzasadnienie.`;
  }
  return <>
    <p className="grounded-description"><button className="grounded-text" onClick={() => inspect("description")}
      title={hint("description", design.description)}>{design.description}<span aria-hidden="true"> ⓘ</span></button></p>
    <button className="card-conditions" onClick={() => inspect("conditions")} title={hint("conditions", design.conditions)}>Warunki zagrania <span aria-hidden="true">↗</span></button>
    <dialog ref={dialog} className="evidence-dialog" aria-labelledby={headingId}
      onCancel={(event) => { event.preventDefault(); dialog.current?.close(); }}>
      <header className="dialog-heading"><div><p className="eyebrow">Karta {card.id} · {card.title}</p>
        <h2 id={headingId}>{labels[field.replace("parameter:", "")] ?? "Podstawa informacji"}</h2></div>
        <button className="button" autoFocus onClick={() => dialog.current?.close()}>Zamknij wyjaśnienie</button></header>
    <div className="card-effects" aria-label="Wpływ decyzji">
      <button onClick={() => inspect("stats.money")} title={hint("stats.money", signals?.moneyReason ?? design.stats.money.explanation)}><span aria-hidden="true">zł</span><strong>Pieniądze</strong><small>{signals?.money.label ?? "Budżet rodziny"}</small></button>
      <button onClick={() => inspect("stats.time")} title={hint("stats.time", signals?.timeReason ?? design.stats.time.explanation)}><span aria-hidden="true">◷</span><strong>Czas</strong><small>{signals?.time.label ?? "Plan opieki"}</small></button>
      <button onClick={() => inspect("stats.happiness")} title="Bilans pieniędzy i czasu; kliknij, aby poznać zasady."><span aria-hidden="true">☺</span><strong>Szczęście</strong><small>{signals?.happiness.label ?? "Bilans planu"}</small></button>
    </div>
      <p className="evidence-explanation">{explanation}</p>
      {signals && !field.startsWith("parameter:") && <section className="impact-context" aria-label="Założenia porównania">
        <p><strong>Porównujemy:</strong> {signals.comparison}</p>
        <p><strong>Okres:</strong> {signals.period}.</p>
        <p><strong>Później:</strong> {signals.later}</p>
        <p>Kierunek dotyczy tego porównania i spełnionych warunków karty. Nie jest wyliczeniem dochodu rodziny ani rankingiem wszystkich kart.</p>
      </section>}
      {rules.map((rule) => <section className="evidence-rule" key={rule.id}><p>{rule.summary}</p>
        {rule.evidence.map((e, index) => <div className="evidence-quote" key={`${e.document_id}-${index}`}>
          <strong>{sourceTitles[e.document_id]} · {e.locator}</strong><blockquote>{e.quote}</blockquote>
          <div className="actions"><a href={`/sources/${e.document_id}#${e.markdown_anchor}`} target="_blank" rel="noreferrer">Przeczytaj w kontekście ↗</a>
            <a href={`/legal/${e.document_id}.pdf#page=${e.pdf_page}`} target="_blank" rel="noreferrer">Oryginał PDF · str. {e.pdf_page} ↗</a></div>
          {e.source_kind === "guidance" && <small>Objaśnienia ZUS — źródło pomocnicze.</small>}
        </div>)}
        {rule.external_verification && <p className="muted"><a href={rule.external_verification.url} target="_blank" rel="noreferrer">Sprawdź pełny tekst ustawy: {rule.external_verification.locator} ↗</a></p>}
      </section>)}
      {field !== "stats.happiness" && <>
        <p className="evidence-version">Materiał konkursowy ZUS. Cytat sprawdzony w dostarczonym pliku; zastosowanie przepisu zależy od daty i okoliczności sprawy.</p>
        {design.parameter_refs.length > 0 && <details className="parameter-list"><summary>Wartości i limity powiązane z kartą</summary>
          <p className="muted">Najedź na wartość lub kliknij ją, aby sprawdzić jej źródło.</p>
          {design.parameter_refs.map((path) => <button key={path} className="parameter-item" onClick={() => { setField(`parameter:${path}`); if (dialog.current) dialog.current.scrollTop = 0; }}
            title={hint(`parameter:${path}`, labels[path] ?? "Parametr świadczenia")}><span>{labels[path] ?? "Parametr świadczenia"}</span><strong>{parameterValue(path)} ⓘ</strong></button>)}
        </details>}
      </>}
      {design.combo && <div className="combo-description"><strong>Combo: {design.combo.name}</strong><p>Połącz z kartą {design.combo.with.join(" lub ")}. Bonus wymaga sprawdzenia rzeczywistego planu; samo zebranie kart nie wystarcza.</p></div>}
      {design.notes && <p className="muted">Ta ścieżka wymaga uzupełnienia parametrów przed uruchomieniem wyliczeń.</p>}
    </dialog>
  </>;
}
