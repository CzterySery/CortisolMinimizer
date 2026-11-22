"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";
import { adminHeaders } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

const kindLabel: Record<string, string> = { application: "Wniosek", usc: "Odpis aktu (USC)", pue: "Pytanie (PUE)" };

// Everything sent through the simulated channels: applications to the employer/ZUS, USC requests, PUE questions.
export default function AdminSubmissions() {
  const [rows, setRows] = useState<S["Submission"][]>();
  const [error, setError] = useState<unknown>();

  const load = async () => {
    const { data, error } = await api.GET("/api/v1/admin/submissions", { headers: adminHeaders() });
    if (error) setError(error); else { setRows(data); setError(undefined); }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- load once with the stored token

  return (
    <>
      <PageHeader title="Złożone wnioski">
        Rejestr symulowanych zgłoszeń wysłanych do ZUS, pracodawcy i USC (najnowsze na górze).
      </PageHeader>
      <button className="button" onClick={load}>Odśwież</button>
      {error ? <ApiResult error={error} /> : null}
      {rows && (rows.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>#</th><th>Rodzaj</th><th>Treść</th><th>Adresat</th><th>Osoba</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>{rows.map((r) => {
              const p = r.payload as Record<string, string | null | undefined>;
              return <tr key={r.id}>
                <td>{r.id}</td><td>{kindLabel[r.kind] ?? r.kind}</td><td>{p.form ?? p.question}</td>
                <td>{p.recipient ?? "ZUS"}</td><td>{p.persona ?? "bez logowania"}</td><td>{r.status}</td>
                <td>{new Date(r.created_at).toLocaleString("pl-PL")}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : <p className="muted">Nic jeszcze nie wysłano.</p>)}
    </>
  );
}
