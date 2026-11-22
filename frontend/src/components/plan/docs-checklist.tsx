import type { S } from "@/lib/api";
import type { ReactNode } from "react";
import { day } from "@/lib/format";
import { recipientLabel, whoLabel } from "@/lib/labels";

export function DocsChecklist({ documents, onInspect, actionLabel, renderEditor, compact = false }: {
  documents: S["Document"][];
  onInspect?: (doc: S["Document"]) => void;
  actionLabel?: (doc: S["Document"]) => string;
  renderEditor?: (doc: S["Document"]) => ReactNode;
  compact?: boolean;
}) {
  if (!documents.length) return <p className="muted">Brak dokumentów do złożenia.</p>;
  return (
    <ul className="docs">
      {documents.map((d, i) => (
        <li key={i} className={d.done ? "done" : ""}>
          {onInspect ? <button type="button" className="doc-guide-link" onClick={() => onInspect(d)}><strong>{d.form}</strong><span> · {actionLabel?.(d) ?? "Zobacz gdzie wpisać dane ↗"}</span></button> : <strong>{d.form}</strong>} · {whoLabel[d.who]} → {recipientLabel[d.recipient]}
          {d.due_by && <> · do {day(d.due_by)}</>}
          {d.start && <small>Okres: {day(d.start)}{d.end && <> – {day(d.end)}</>}</small>}
          {!compact && <small>{d.note && <>{d.note} </>}({d.rule})</small>}
          <span className="sr-only">{d.done ? " (gotowe)" : " (do zrobienia)"}</span>
          {renderEditor?.(d)}
        </li>
      ))}
    </ul>
  );
}
