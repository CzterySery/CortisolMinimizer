import type { S } from "@/lib/api";
import { month, pln } from "@/lib/format";

// Monthly family income as CSS bars (no chart library). Months below the family's target are flagged.
export function BudgetChart({ months }: { months: S["MonthRow"][] }) {
  if (!months.length) return <p className="muted">Brak danych.</p>;
  const max = Math.max(1, ...months.map((m) => Number(m.total)));
  return (
    <div className="budget-chart">
      <ol className="budget-bars" aria-label="Dochód rodziny miesiąc po miesiącu">
        {months.map((m) => (
          <li key={m.month} title={`${month(m.month)}: ${pln(m.total)}`}>
            <span className={`bar ${m.below_target ? "below" : ""}`} style={{ height: `${(Number(m.total) / max) * 100}%` }} />
            <span className="sr-only">{month(m.month)}: {pln(m.total)}{m.below_target ? ", poniżej celu" : ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
