import type { S } from "@/lib/api";
import { day } from "@/lib/format";
import { recipientLabel, whoLabel } from "@/lib/labels";

export function DocsChecklist({ documents }: { documents: S["Document"][] }) {
  if (!documents.length) return <p className="muted">Brak dokumentów do złożenia.</p>;
  return (
    <ul className="docs">
      {documents.map((d, i) => (
        <li key={i} className={d.done ? "done" : ""}>
          <strong>{d.form}</strong> · {whoLabel[d.who]} → {recipientLabel[d.recipient]}
          {d.due_by && <> · do {day(d.due_by)}</>}
          <span className="sr-only">{d.done ? " (gotowe)" : " (do zrobienia)"}</span>
        </li>
      ))}
    </ul>
  );
}
