import { useState } from "react";
import type { S } from "@/lib/api";
import { employmentLabel } from "@/lib/labels";

type Family = S["Family-Input"];
type Parent = S["Parent-Input"];

// Family facts shared by the calculator and the case review. Still to add: hospitalization, adoption/foster.
export function FamilyForm({ value, onChange }: { value: Family; onChange: (f: Family) => void }) {
  const set = (patch: Partial<Family>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="form-section">
      <legend>Rodzina</legend>
      <div className="form-grid">
        <ParentFields label="Mama" value={value.mother} onChange={(mother) => set({ mother })} />
        {value.father
          ? <ParentFields label="Tata" value={value.father} onChange={(father) => set({ father })} onRemove={() => set({ father: null })} />
          : <button type="button" className="button button-dashed" onClick={() => set({ father: { employment: "employee" } })}>+ Dodaj drugiego rodzica</button>}
        <label className="field">Przewidywana data porodu
          <input type="date" value={value.due_date} onChange={(e) => set({ due_date: e.target.value })} />
        </label>
        <label className="field">Liczba dzieci przy porodzie
          <input type="number" min={1} value={value.children ?? 1} onChange={(e) => set({ children: Number(e.target.value) })} />
        </label>
        <label className="field-check">
          <input type="checkbox" checked={!!value.za_zyciem} onChange={(e) => set({ za_zyciem: e.target.checked })} />
          Zaświadczenie „Za życiem”
        </label>
      </div>
    </fieldset>
  );
}

function ParentFields({ label, value, onChange, onRemove }: { label: string; value: Parent; onChange: (p: Parent) => void; onRemove?: () => void }) {
  return (
    <fieldset className="form-card">
      <legend>{label}</legend>
      {onRemove && <button type="button" className="button button-dashed" onClick={onRemove}>Usuń drugiego rodzica</button>}
      <label className="field">Forma zatrudnienia
        <select value={value.employment} onChange={(e) => onChange({ ...value, employment: e.target.value as Parent["employment"] })}>
          {Object.entries(employmentLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      <label className="field">Podstawa wymiaru zasiłku (zł/mies.)
        <input type="number" min={0} step="0.01" value={value.base_monthly ?? ""} onChange={(e) => onChange({ ...value, base_monthly: e.target.value || null })} />
      </label>
      <details>
        <summary>Więcej danych: wynagrodzenie z Z-3, ubezpieczenie</summary>
        <SalaryHistory value={value.salary_history ?? []} onChange={(salary_history) => onChange({ ...value, salary_history })} />
        {value.employment !== "employee" && value.employment !== "none" && <label className="field-check">
          <input type="checkbox" checked={!!value.voluntary_sickness} onChange={(e) => onChange({ ...value, voluntary_sickness: e.target.checked })} />
          Dobrowolne ubezpieczenie chorobowe
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
const MONTH_LINE = /^\s*(\d{4}-\d{2})\s+([\d\s]+(?:[.,]\d{1,2})?)(?:\s+(\d+)\s*\/\s*(\d+))?\s*$/;

// Z-3 pay, one month per line: "2025-10 7200,00", optionally "2025-10 3600 10/21" (worked / required days).
// Raw text stays local so half-typed lines aren't lost; only complete lines reach the plan.
function SalaryHistory({ value, onChange }: { value: MonthPay[]; onChange: (v: MonthPay[]) => void }) {
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
    <label className="field">Wynagrodzenie brutto z Z-3 (miesiąc i kwota w wierszu; zastępuje podstawę, gdy ta jest pusta)
      <textarea rows={4} placeholder={"2025-10 7200,00\n2025-11 3600,00 10/21"} value={text} onChange={(e) => update(e.target.value)} />
      <small className="muted">{value.length} mies. · opcjonalnie dni przepracowane/wymagane, np. 10/21</small>
    </label>
  );
}
