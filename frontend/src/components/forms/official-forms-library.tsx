"use client";

import { useState } from "react";
import { officialForms, type GuideDoc } from "@/lib/document-guides";
import { DocumentGuide } from "@/components/forms/document-guide";

export function OfficialFormsLibrary() {
  const [doc, setDoc] = useState<GuideDoc>();

  return (
    <section className="home-forms-panel" aria-labelledby="home-forms-title">
      <h3 className="home-help-title" id="home-forms-title">Oficjalne formularze ZUS</h3>
      <p className="muted">Podgląd aktualnych wzorów ZUS z zaznaczonymi polami do wypełnienia.</p>
      <div className="forms-compact-grid">
        {officialForms.map((form) => (
          <button
            type="button"
            className="choice form-compact-card"
            key={form.id}
            onClick={() =>
              setDoc({
                form: form.code,
                who: "mother",
                recipient: "zus",
                done: false,
                due_by: null,
                start: null,
                end: null,
                rule: "Oficjalny wzór ZUS",
                note: "Podgląd wzoru — bez danych osoby i okresów z planu.",
              })
            }
          >
            <strong>{form.code}</strong>
            <span>{form.title}</span>
            <small>{form.pages.length} str. · {form.issuer === "employer" ? "płatnik" : "wniosek"}</small>
          </button>
        ))}
      </div>
      {doc && <DocumentGuide key={doc.form} doc={doc} onClose={() => setDoc(undefined)} />}
    </section>
  );
}
