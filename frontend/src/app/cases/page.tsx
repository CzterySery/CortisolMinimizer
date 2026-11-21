"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

// Jury flow: upload a ZUS form PDF (or pick a sample) -> review extracted fields -> verdict + amounts.
export default function Cases() {
  const [samples, setSamples] = useState<S["CaseInput-Output"][]>();
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});

  useEffect(() => {
    api.GET("/api/v1/cases/samples").then(({ data, error }) => (error ? setOut({ error }) : setSamples(data)));
  }, []);

  const upload = async (file: File) => {
    const { data, error } = await api.POST("/api/v1/cases/parse", {
      body: { file: file as unknown as string }, // generated type says string for binary; the serializer sends the File
      bodySerializer: (b) => { const fd = new FormData(); fd.append("file", b.file); return fd; },
    });
    setOut({ data, error });
  };

  const evaluate = async (body: S["CaseInput-Input"]) => setOut(await api.POST("/api/v1/cases/evaluate", { body }));

  return (
    <main className="page">
      <PageHeader eyebrow="Sprawdź sprawę" title="Masz już dokumenty?" accent="Sprawdźmy je.">
        Wgraj formularz (Z-3, Z-3a, ZAM, ZAS-53) albo wybierz przykład. Pokażemy, czy jest ubezpieczenie i ile wyniesie zasiłek.
      </PageHeader>
      <div className="stack">
        <label className="dropzone">
          <span>Wybierz plik PDF</span>
          <input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {samples && samples.length > 0 && (
          <div className="actions">
            {samples.map((s, i) => <button key={i} className="button" onClick={() => evaluate(s)}>Przykład {i + 1}: {s.event}, {s.event_date}</button>)}
          </div>
        )}
        {(out.data || out.error) ? <ApiResult {...out} /> : null}
      </div>
    </main>
  );
}
