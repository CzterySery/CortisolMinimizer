import type { S } from "@/lib/api";
import { kindLabel, whoLabel } from "@/lib/labels";
import { LegalBasis } from "@/components/legal-basis";

type Block = S["Block-Input"];

// Leave/benefit blocks: the same primitive the game's cards produce. Next: presets
// ("standard", "81,5%", "podział z tatą", "pół etatu") that fill this list.
export function BlocksEditor({ value, onChange, whos = ["mother", "father"] }: {
  value: Block[]; onChange: (b: Block[]) => void; whos?: Block["who"][];
}) {
  const update = (i: number, patch: Partial<Block>) => onChange(value.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <fieldset className="form-section">
      <legend>Plan urlopów</legend>
      {value.map((b, i) => (
        <div key={i} className="leave-period"><p className="eyebrow">Okres {i + 1}</p><div className="block-row">
          <select aria-label="Kto" value={b.who} onChange={(e) => update(i, { who: e.target.value as Block["who"] })}>
            {whos.map((k) => <option key={k} value={k}>{whoLabel[k]}</option>)}
          </select>
          <select aria-label="Rodzaj" value={b.kind} onChange={(e) => update(i, { kind: e.target.value as Block["kind"], work_fraction: "0" })}>
            {Object.entries(kindLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input required aria-label="Od" type="date" value={b.start} onChange={(e) => update(i, { start: e.target.value })} />
          <input required aria-label="Dni" type="number" min={1} value={b.days} onChange={(e) => update(i, { days: Number(e.target.value) })} />
          <button type="button" className="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>Usuń</button>
        </div>{b.kind === "parental" && <label className="field">Praca podczas rodzicielskiego (część pełnego etatu)
          <input type="number" min={0} max={0.5} step={0.05} value={b.work_fraction ?? "0"} onChange={(e) => update(i, { work_fraction: e.target.value })} />
          <small>0 oznacza pełny urlop, 0,5 — pracę na pół etatu. Dni powyżej to cały okres kalendarzowy, także jego wydłużenie.</small>
        </label>}
        {b.kind !== "vacation" && <details><summary>Dokładne dane płatnika dla tego okresu (opcjonalnie)</summary>
          <label className="field">Potwierdzona podstawa dla tego okresu (zł/mies.)
            <input type="number" min={0.01} step="0.01" value={b.base_monthly ?? ""}
              onChange={(e) => update(i, { base_monthly: e.target.value || null })} />
            <small>Pierwszeństwo przed ogólną podstawą rodzica, np. po przerwie lub przy złożonych składnikach Z-3.</small>
          </label>
          {b.kind === "rehab" && <label className="field">Wskaźnik waloryzacji rehabilitacyjnego
            <input type="number" min={1} step="0.0001" value={b.rehab_indexation_factor ?? ""}
              onChange={(e) => update(i, { rehab_indexation_factor: e.target.value || null })} />
            <small>Wskaźnik ogłoszony dla kwartału rozpoczęcia świadczenia, np. 1,05; 1 oznacza brak podwyższenia.</small>
          </label>}
          {["maternity", "parental", "supplementary"].includes(b.kind) && <label className="field">Potwierdzona miesięczna zaliczka PIT od pełnego zasiłku (zł)
            <input type="number" min={0} step="0.01" value={b.monthly_tax_advance ?? ""}
              onChange={(e) => update(i, { monthly_tax_advance: e.target.value || null })} />
            <small>Dla podwyższenia niskiego zasiłku; 0 tylko przy potwierdzonym braku zaliczki. Kalkulator nie wyznacza podatku.</small>
          </label>}
        </details>}
        <LegalBasis rules={[({ maternity: "maternity-pool", parental: "parental-pool", paternity: "paternity",
          supplementary: "supplementary", sick: "sick-right", care: "care-right", rehab: "rehab",
          job_loss_benefit: "job-loss-before", vacation: "" } as const)[b.kind], ...(b.kind === "parental" ? ["part-time"] : [])]} />
        </div>
      ))}
      <button type="button" className="button button-dashed"
              onClick={() => {
                const last = value.at(-1);
                const next = last?.start ? new Date(`${last.start}T00:00:00Z`) : null;
                if (next && last) next.setUTCDate(next.getUTCDate() + last.days);
                onChange([...value, { who: "mother", kind: "parental", start: next?.toISOString().slice(0, 10) ?? "", days: 7 }]);
              }}>
        + Dodaj okres
      </button>
    </fieldset>
  );
}
