import { useState } from "react";
import type { S } from "@/lib/api";
import { employmentLabel } from "@/lib/labels";

type Family = S["Family-Input"];
type Parent = S["Parent-Input"];

// The calculator and case review share exactly the same family facts.
export function FamilyForm({ value, onChange, section = "all", birthStatus }: {
  value: Family; onChange: (f: Family) => void;
  section?: "all" | "child" | "health"; birthStatus?: "expected" | "born";
}) {
  const set = (patch: Partial<Family>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="form-section">
      <legend>Rodzina</legend>
      <div className="form-grid">
        {section === "all" && <><label className="field">Sytuacja rodziny
          <select value={value.adoption?.kind ?? "birth"} onChange={(e) => {
            const kind = e.target.value;
            set({ adoption: kind === "birth" ? null : {
              kind: kind as "adoption" | "foster", accepted_on: value.adoption?.accepted_on ?? value.due_date,
              court_applied_on: value.adoption?.court_applied_on ?? null,
              school_deferred: value.adoption?.school_deferred ?? false,
              children: (value.children ?? 1) > 1 ? (value.adoption?.children?.length ? value.adoption.children :
                Array.from({ length: Math.min(value.children!, 20) }, () => ({ birth_date: value.birth_date ?? value.due_date }))) : [],
            } });
          }}>
            <option value="birth">Urodzenie dziecka</option>
            <option value="adoption">Przyjęcie dziecka i wniosek o przysposobienie</option>
            <option value="foster">Rodzina zastępcza niezawodowa</option>
          </select>
        </label>
        <ParentFields label="Mama" value={value.mother} onChange={(mother) => set({ mother })} />
        {value.father
          ? <ParentFields label="Tata" value={value.father} onChange={(father) => set({ father })} onRemove={() => set({ father: null })} />
          : <button type="button" className="button button-dashed" onClick={() => set({ father: { employment: "employee" } })}>+ Dodaj drugiego rodzica</button>}</>}
        {section !== "health" && <>
        {!value.adoption && birthStatus !== "born" && <label className="field">Przewidywana data porodu
          <input required={section === "child"} type="date" value={value.due_date} onChange={(e) => set({ due_date: e.target.value })} />
        </label>}
        {birthStatus !== "expected" && <label className="field">{value.adoption ? "Data urodzenia przyjętego dziecka" : "Faktyczna data urodzenia (jeśli dziecko już się urodziło)"}
          <input required={section === "child"} type="date" value={value.birth_date ?? ""} onChange={(e) => set({ birth_date: e.target.value || null,
            ...(!value.due_date && e.target.value ? { due_date: e.target.value } : {}),
            ...(value.adoption?.children?.length === 1 && e.target.value ? { adoption: { ...value.adoption,
              children: [{ ...value.adoption.children[0], birth_date: e.target.value }],
            } } : {}),
          })} />
        </label>}
        {!value.adoption && birthStatus !== "expected" && <label className="field">Jeśli dziecko urodziło się martwe lub zmarło: data (przy martwym urodzeniu data porodu)
          <input type="date" value={value.child_died_on ?? ""} onChange={(e) => set({ child_died_on: e.target.value || null })} />
        </label>}
        <label className="field">{value.adoption ? "Liczba dzieci przyjętych jednocześnie" : "Liczba dzieci przy porodzie"}
          <input type="number" min={1} value={value.children ?? 1} onChange={(e) => {
            const count = Number(e.target.value);
            set({ children: count, ...(value.adoption ? { adoption: { ...value.adoption,
              children: Array.from({ length: Math.max(0, Math.min(count, 20)) }, (_, i) => value.adoption?.children?.[i] ?? {
                birth_date: i === 0 ? value.birth_date ?? "" : "", school_deferred: false,
              }),
            } } : {}) });
          }} />
        </label>
        {value.adoption && <>
          {(value.children ?? 1) > 1 && (value.adoption.children ?? []).map((child, index) => <fieldset className="form-card" key={index}>
            <legend>Dziecko {index + 1}</legend>
            <label className="field">Data urodzenia dziecka {index + 1}
              <input required={section === "child"} type="date" value={child.birth_date} onChange={(e) => set({ adoption: { ...value.adoption!,
                children: value.adoption!.children!.map((c, i) => i === index ? { ...c, birth_date: e.target.value } : c),
              } })} />
            </label>
            {value.adoption!.kind === "foster" && <label className="field-check">
              <input type="checkbox" checked={!!child.school_deferred} onChange={(e) => set({ adoption: { ...value.adoption!,
                children: value.adoption!.children!.map((c, i) => i === index ? { ...c, school_deferred: e.target.checked } : c),
              } })} /> Odroczenie szkolne — dziecko {index + 1}
            </label>}
          </fieldset>)}
          {section === "all" && <label className="field">Rodzic składający wniosek o 81,5%
            <select value={value.adoption.applicant ?? "mother"} onChange={(e) => set({ adoption: { ...value.adoption!, applicant: e.target.value as "mother" | "father" } })}>
              <option value="mother">Mama</option><option value="father">Tata</option>
            </select>
          </label>}
          <label className="field">Data przyjęcia na wychowanie
            <input required={section === "child"} type="date" value={value.adoption.accepted_on} onChange={(e) => set({ due_date: e.target.value || value.due_date, adoption: { ...value.adoption!, accepted_on: e.target.value } })} />
          </label>
          {value.adoption.kind === "adoption" ? <>
            <label className="field">Data wystąpienia do sądu o przysposobienie
              <input required={section === "child"} type="date" value={value.adoption.court_applied_on ?? ""} onChange={(e) => set({ adoption: { ...value.adoption!, court_applied_on: e.target.value || null } })} />
            </label>
            <details className="form-card"><summary>Przysposobienie jest już prawomocne</summary><label className="field">Data prawomocnego przysposobienia (do urlopu ojcowskiego)
              <input type="date" value={value.adoption.court_final_on ?? ""} onChange={(e) => set({ adoption: { ...value.adoption!, court_final_on: e.target.value || null } })} />
            </label></details>
          </> : <label className="field-check">
            <input type="checkbox" checked={!!value.adoption.school_deferred} onChange={(e) => set({ adoption: { ...value.adoption!, school_deferred: e.target.checked } })} />
            Decyzja o odroczeniu obowiązku szkolnego
          </label>}
          <details className="form-card"><summary>Urlopy wykorzystane wcześniej w pieczy zastępczej</summary>
          <label className="field">Wykorzystane wcześniej dni na warunkach macierzyńskiego (przy przejściu z pieczy do adopcji)
            <input type="number" min={0} value={value.adoption.previous_maternity_days ?? 0} onChange={(e) => set({ adoption: { ...value.adoption!, previous_maternity_days: Number(e.target.value) } })} />
          </label>
          <label className="field">Wykorzystane wcześniej dni rodzicielskiego — mama
            <input type="number" min={0} value={value.adoption.previous_parental_mother_days ?? 0} onChange={(e) => set({ adoption: { ...value.adoption!, previous_parental_mother_days: Number(e.target.value) } })} />
          </label>
          <label className="field">Wykorzystane wcześniej dni rodzicielskiego — tata
            <input type="number" min={0} value={value.adoption.previous_parental_father_days ?? 0} onChange={(e) => set({ adoption: { ...value.adoption!, previous_parental_father_days: Number(e.target.value) } })} />
          </label>
          </details>
        </>}
        </>}
        {section !== "child" && <>
        <label className="field-check">
          <input type="checkbox" checked={!!value.za_zyciem} onChange={(e) => set({ za_zyciem: e.target.checked })} />
          Zaświadczenie „Za życiem”
        </label>
        </>}
      </div>
      {section !== "child" && <details className="form-card">
        <summary>Hospitalizacja dziecka — uzupełniający urlop macierzyński</summary>
        <label className="field-check">
          <input type="checkbox" checked={!!value.hospitalization} onChange={(e) => set({ hospitalization: e.target.checked ? { pregnancy_week: 0, birth_weight_g: 0, hospital_days: 0 } : null })} />
          Mam dane z zaświadczenia szpitalnego
        </label>
        {value.hospitalization && <div className="form-grid">
          <label className="field">Ukończony tydzień ciąży przy porodzie
            <input required={section === "health"} type="number" min={1} max={45} value={value.hospitalization.pregnancy_week || ""} onChange={(e) => set({ hospitalization: { ...value.hospitalization!, pregnancy_week: Number(e.target.value) } })} />
          </label>
          <label className="field">Masa urodzeniowa (g)
            <input required={section === "health"} type="number" min={1} value={value.hospitalization.birth_weight_g || ""} onChange={(e) => set({ hospitalization: { ...value.hospitalization!, birth_weight_g: Number(e.target.value) } })} />
          </label>
          <label className="field">Kwalifikujące dni pobytu w szpitalu
            <input required={section === "health"} type="number" min={1} max={105} value={value.hospitalization.hospital_days || ""} onChange={(e) => set({ hospitalization: { ...value.hospitalization!, hospital_days: Number(e.target.value) } })} />
          </label>
          <p className="muted">Wpisz wyłącznie dni z właściwego okresu: do końca 15. tygodnia po porodzie przy porodzie przed 28. tygodniem lub masie do 1000 g; do końca 8. tygodnia przy wcześniactwie. Przy porodzie o czasie: od 5. dnia do końca 8. tygodnia, z pobytem co najmniej 2 kolejnych dni, którego pierwszy dzień przypada między 5. a 28. dniem. Przy przyjęciu dziecka liczy się pobyt po przyjęciu. Przy wieloraczkach podaj najniższą masę i pobyt najdłużej hospitalizowanego dziecka.</p>
        </div>}
      </details>}
    </fieldset>
  );
}

export function ParentFields({ label, value, onChange, onRemove, hideEmployment = false, incomeMode }: {
  label: string; value: Parent; onChange: (p: Parent) => void; onRemove?: () => void;
  hideEmployment?: boolean; incomeMode?: "base" | "history" | "unknown";
}) {
  return (
    <fieldset className="form-card">
      <legend>{label}</legend>
      {onRemove && <button type="button" className="button button-dashed" onClick={onRemove}>Usuń drugiego rodzica</button>}
      {!hideEmployment && <label className="field">Forma zatrudnienia
        <select value={value.employment} onChange={(e) => onChange({ ...value, employment: e.target.value as Parent["employment"] })}>
          {Object.entries(employmentLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>}
      {(!incomeMode || incomeMode === "base") && <label className="field">Podstawa wymiaru zasiłku (zł/mies.)
        <input aria-label="Podstawa wymiaru zasiłku (zł/mies.)" required={incomeMode === "base"} type="number" min={0.01} step="0.01" value={value.base_monthly ?? ""} onChange={(e) => onChange({ ...value, base_monthly: e.target.value || null })} />
        <small>Kwota po odliczeniu składek społecznych. To nie jest pensja brutto ani kwota przelewu netto.</small>
      </label>}
      {incomeMode === "history" && <SalaryHistory employment={value.employment} required value={value.salary_history ?? []} onChange={(salary_history) => onChange({ ...value, salary_history })} />}
      {value.employment !== "employee" && value.employment !== "none" && <label className="field-check">
        <input type="checkbox" checked={!!value.voluntary_sickness} onChange={(e) => onChange({ ...value, voluntary_sickness: e.target.checked })} />
        Dobrowolne ubezpieczenie chorobowe
      </label>}
      <details>
        <summary>Ubezpieczenie, płatnik i dodatkowe dane</summary>
        {!incomeMode && <SalaryHistory employment={value.employment} value={value.salary_history ?? []} onChange={(salary_history) => onChange({ ...value, salary_history })} />}
        {value.employment === "employee" && <label className="field-check">
          <input type="checkbox" checked={value.full_time !== false} onChange={(e) => onChange({ ...value, full_time: e.target.checked })} />
          Pełny etat (minimalna podstawa z historii wynagrodzeń)
        </label>}
        <label className="field">Ubezpieczenie od
          <input type="date" value={value.insured_since ?? ""} onChange={(e) => onChange({ ...value, insured_since: e.target.value || null })} />
        </label>
        <label className="field">Ubezpieczenie do (koniec umowy)
          <input type="date" value={value.insured_until ?? ""} onChange={(e) => onChange({ ...value, insured_until: e.target.value || null })} />
        </label>
        {value.employment !== "self_employed" && <label className="field">Płatnik zgłasza do ubezpieczenia chorobowego (osób)
          <input type="number" min={0} value={value.payer_insured_count ?? 0} onChange={(e) => onChange({ ...value, payer_insured_count: Number(e.target.value) })} />
        </label>}
        {value.employment === "self_employed" && <label className="field">Zaległość w składkach (zł)
          <input type="number" min={0} step="0.01" value={value.contribution_debt ?? ""} onChange={(e) => onChange({ ...value, contribution_debt: e.target.value || "0" })} />
        </label>}
        {value.employment === "employee" && <label className="field">Wiek
          <input type="number" min={15} value={value.age ?? 30} onChange={(e) => onChange({ ...value, age: Number(e.target.value) })} />
        </label>}
      </details>
    </fieldset>
  );
}

type MonthPay = S["MonthPay-Input"];
const MONTH_LINE = /^\s*(\d{4}-(?:0[1-9]|1[0-2]))\s+([\d\s]+(?:[.,]\d{1,2})?)(?:\s+(\d+)\s*\/\s*(\d+))?\s*$/;

// Z-3 pay, one month per line: "2025-10 7200,00", optionally "2025-10 3600 10/21" (worked / required days).
// Raw text stays local so half-typed lines aren't lost; only complete lines reach the plan.
function SalaryHistory({ value, onChange, required = false, employment = "employee" }: {
  value: MonthPay[]; onChange: (v: MonthPay[]) => void; required?: boolean; employment?: Parent["employment"];
}) {
  const [text, setText] = useState(() => value.map((m) => `${m.month} ${m.gross}${m.worked_days != null ? ` ${m.worked_days}/${m.required_days}` : ""}`).join("\n"));
  const update = (raw: string) => {
    setText(raw);
    onChange(raw.split("\n").flatMap((line) => {
      const m = MONTH_LINE.exec(line);
      return m ? [{ month: m[1], gross: m[2].replace(/\s/g, "").replace(",", "."),
        ...(m[3] ? { worked_days: Number(m[3]), required_days: Number(m[4]) } : {}) }] : [];
    }));
  };
  return (
    <label className="field">{employment === "employee" ? "Wynagrodzenie brutto z Z-3" : "Podstawy składek na ubezpieczenie chorobowe"} (miesiąc i kwota w wierszu; zastępuje podstawę, gdy ta jest pusta)
      <textarea required={required} rows={4} placeholder={"2025-10 7200,00\n2025-11 3600,00 10/21"} value={text} onChange={(e) => {
        const lines = e.target.value.split("\n").filter((line) => line.trim());
        const months = lines.map((line) => MONTH_LINE.exec(line)?.[1]);
        const valid = lines.every((line) => {
          const m = MONTH_LINE.exec(line);
          return m && (!m[3] || (Number(m[4]) > 0 && Number(m[3]) <= Number(m[4])));
        }) && new Set(months).size === months.length;
        e.target.setCustomValidity(valid ? "" : "Sprawdź wiersze: YYYY-MM kwota, opcjonalnie dni/dni. Miesiące nie mogą się powtarzać.");
        update(e.target.value);
      }} />
      <small className="muted">{value.length} mies. · opcjonalnie dni przepracowane/wymagane, np. 10/21</small>
    </label>
  );
}
