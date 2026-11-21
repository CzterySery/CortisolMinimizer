import type { ReactNode } from "react";
import type { S } from "@/lib/api";
import { day, pln } from "@/lib/format";
import { kindLabel, whoLabel } from "@/lib/labels";
import { BudgetChart } from "./budget-chart";
import { CareCalendar } from "./care-calendar";
import { DocsChecklist } from "./docs-checklist";
import { PoolsMeter } from "./pools-meter";

const severity = { error: "Błąd", warning: "Uwaga", info: "Info" } as const;

// Shared view of a computed plan: calculator, case verdicts and the end-of-game summary all render this.
export function PlanTimeline({ result }: { result: S["PlanResult"] }) {
  return (
    <div className="plan-grid">
      <Panel title="Kwoty zasiłków">
        <p>{Object.entries(result.bases).map(([who, base]) => `${whoLabel[who as keyof typeof whoLabel]}: podstawa ${pln(base)}`).join(" · ")}</p>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Kto</th><th>Okres</th><th>Od – do</th><th>Kwota</th></tr></thead>
          <tbody>{result.calendar.map((c, i) => <tr key={i}>
            <td>{whoLabel[c.who]}</td><td>{kindLabel[c.kind]}</td><td>{day(c.start)} – {day(c.end)}</td><td>{pln(c.benefit)}</td>
          </tr>)}</tbody>
        </table></div>
      </Panel>
      <Panel title="Budżet"><BudgetChart months={result.months} /></Panel>
      <Panel title="Opieka"><CareCalendar calendar={result.calendar} /></Panel>
      <Panel title="Pozostałe urlopy"><PoolsMeter pools={result.pools} /></Panel>
      <Panel title="Dokumenty i terminy"><DocsChecklist documents={result.documents} /></Panel>
      <Panel title="Ryzyka i uwagi">
        <ul className="issues">
          {result.issues.map((x) => <li key={x.code} className={x.severity}><strong>{severity[x.severity]}:</strong> {x.text} <cite>{x.rule}</cite></li>)}
        </ul>
        {Number(result.top_up) > 0 && <p>Wyrównanie do 100%: {pln(result.top_up)} (na wniosek).</p>}
      </Panel>
      <Panel title="Skąd te kwoty?">
        <ul className="explain">{result.explain.map((e, i) => <li key={i}>{e.text} <cite>{e.rule}</cite></li>)}</ul>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel"><h2 className="eyebrow">{title}</h2>{children}</section>;
}
