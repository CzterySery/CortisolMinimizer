import type { S } from "@/lib/api";
import { employmentLabel } from "@/lib/labels";

type Family = S["Family-Input"];
type Parent = S["Parent-Input"];

// Family facts shared by the calculator, the case review and a custom game start.
// Still to add: salary history (MonthPay rows), hospitalization, adoption/foster, "Pobierz z ZUS" prefill.
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
    </fieldset>
  );
}
