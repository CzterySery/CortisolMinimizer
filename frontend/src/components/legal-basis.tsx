import legal from "../../../shared/legal-rules.json";
import manifest from "../../../Documents/legal/manifest.json";

// Uses the same checked quotes, locators and allowlisted originals as the game's evidence UI.
export function LegalBasis({ rules }: { rules: string[] }) {
  const selected = legal.rules.filter((rule) => rules.includes(rule.id));
  if (!selected.length) return null;
  return <details className="legal-basis">
    <summary>Dlaczego o to pytamy? · Podstawa prawna</summary>
    {selected.map((rule) => <section key={rule.id}>
      <p>{rule.summary}</p>
      {rule.evidence.map((e, i) => <div key={`${e.document_id}-${i}`}>
        <a href={`/sources/${e.document_id}#${e.markdown_anchor}`} target="_blank" rel="noreferrer">{e.locator} ↗</a>
        <blockquote>{e.quote}</blockquote>
        <a href={`/legal/${e.document_id}.${manifest.find((source) => source.id === e.document_id)?.pdf_pages ? "pdf" : "docx"}${e.pdf_page ? `#page=${e.pdf_page}` : ""}`} target="_blank" rel="noreferrer">Oryginał{e.pdf_page ? ` · str. ${e.pdf_page}` : ""} ↗</a>
      </div>)}
    </section>)}
    <small>Przepisy i cytaty z materiałów konkursowych ZUS; zastosowanie zależy od daty i okoliczności sprawy.</small>
  </details>;
}
