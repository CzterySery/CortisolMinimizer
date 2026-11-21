import type { S } from "@/lib/api";
import { kindLabel, whoLabel } from "@/lib/labels";

type Block = S["Block-Input"];

// Leave/benefit blocks: the same primitive the game's cards produce. Next: presets
// ("standard", "81,5%", "podział z tatą", "pół etatu") that fill this list.
export function BlocksEditor({ value, onChange }: { value: Block[]; onChange: (b: Block[]) => void }) {
  const update = (i: number, patch: Partial<Block>) => onChange(value.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <fieldset className="form-section">
      <legend>Plan urlopów</legend>
      {value.map((b, i) => (
        <div key={i} className="block-row">
          <select aria-label="Kto" value={b.who} onChange={(e) => update(i, { who: e.target.value as Block["who"] })}>
            {Object.entries(whoLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select aria-label="Rodzaj" value={b.kind} onChange={(e) => update(i, { kind: e.target.value as Block["kind"] })}>
            {Object.entries(kindLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input aria-label="Od" type="date" value={b.start} onChange={(e) => update(i, { start: e.target.value })} />
          <input aria-label="Dni" type="number" min={1} value={b.days} onChange={(e) => update(i, { days: Number(e.target.value) })} />
          <button type="button" className="button" onClick={() => onChange(value.filter((_, j) => j !== i))}>Usuń</button>
        </div>
      ))}
      <button type="button" className="button button-dashed"
              onClick={() => onChange([...value, { who: "mother", kind: "parental", start: value.at(-1)?.start ?? "", days: 7 }])}>
        + Dodaj okres
      </button>
    </fieldset>
  );
}
