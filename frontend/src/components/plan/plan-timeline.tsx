import type { ReactNode } from "react";
import type { S } from "@/lib/api";
import { day, pln } from "@/lib/format";
import { kindLabel, whoLabel } from "@/lib/labels";
import { CareCalendar } from "./care-calendar";
import { DocsChecklist } from "./docs-checklist";
import { PoolsMeter } from "./pools-meter";
import { LegalBasis } from "@/components/legal-basis";

const severity = { error: "Błąd", warning: "Uwaga", info: "Info" } as const;

// Shared view of a computed plan: calculator, case verdicts and the end-of-game summary all render this.
export function PlanTimeline({ result, unknownBases = [] }: { result: S["PlanResult"]; unknownBases?: ("mother" | "father")[] }) {
  return (
    <div className="plan-grid">
      <Panel title="Kwoty zasiłków">
        {result.issues.some((issue) => issue.code === "base.estimate") && <p className="notice"><strong>Wynik orientacyjny.</strong> Użyliśmy jednej pensji brutto zamiast pełnej historii wynagrodzeń. Kwoty potwierdź po ustaleniu podstawy przez płatnika.</p>}
        {unknownBases.length > 0 && <p className="notice">Brakuje danych do kwot: {unknownBases.map((who) => whoLabel[who]).join(", ")}. Brak podstawy nie oznacza zerowego dochodu. Uzupełnij ją, aby zobaczyć pełny budżet.</p>}
        <p>{Object.entries(result.bases).filter(([, base]) => Number(base) > 0).map(([who, base]) => `${whoLabel[who as keyof typeof whoLabel]}: podstawa ${pln(base)}`).join(" · ")}</p>
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Kto</th><th>Okres</th><th>Od – do</th><th>Kwota</th></tr></thead>
          <tbody>{result.calendar.map((c, i) => <tr key={i}>
            <td>{whoLabel[c.who]}</td><td>{kindLabel[c.kind]}</td><td>{day(c.start)} – {day(c.end)}</td><td>{unknownBases.includes(c.who) ? "Brak danych" : pln(c.benefit)}</td>
          </tr>)}</tbody>
        </table></div>
      </Panel>
      <Panel title="Opieka"><CareCalendar calendar={result.calendar} /></Panel>
      <Panel title="Pozostałe urlopy"><PoolsMeter pools={result.pools} /></Panel>
      <Panel title="Dokumenty i terminy" className="plan-documents"><DocsChecklist documents={result.documents} /></Panel>
      {(result.issues.length > 0 || Number(result.top_up) > 0) && <Panel title="Ryzyka i uwagi" className="plan-issues">
        <ul className="issues">
          {result.issues.map((x) => <li key={x.code} className={x.severity}><strong>{severity[x.severity]}:</strong> {x.text} <cite>{x.rule}</cite><LegalBasis rules={[x.code.split(".")[0]]} /></li>)}
        </ul>
        {Number(result.top_up) > 0 && <p>Wyrównanie do 100%: {pln(result.top_up)} (na wniosek).</p>}
      </Panel>}
      <details className="panel"><summary>Skąd te kwoty? · Szczegóły obliczeń</summary>
        <ul className="explain">{result.explain.filter((e) => !unknownBases.some((who) => e.text.startsWith(`${whoLabel[who]}:`)) &&
          e.rule !== "założenie kalkulatora").map((e, i) => <li key={i}>{e.text} <cite>{e.rule}</cite></li>)}</ul>
        <LegalBasis rules={["base", "standard-rates", "floor"]} />
      </details>
    </div>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><h2 className="eyebrow">{title}</h2>{children}</section>;
}
