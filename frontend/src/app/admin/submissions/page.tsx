"use client";

import { useState } from "react";
import { api, type S } from "@/lib/api";
import { adminHeaders } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

// Applications "sent" through the simulated employer/ZUS channel.
export default function AdminSubmissions() {
  const [rows, setRows] = useState<S["Submission"][]>();
  const [error, setError] = useState<unknown>();

  const load = async () => {
    const { data, error } = await api.GET("/api/v1/admin/submissions", { headers: adminHeaders() });
    if (error) setError(error); else setRows(data);
  };

  return (
    <>
      <PageHeader eyebrow="Panel administracyjny" title="Złożone wnioski" />
      <button className="button" onClick={load}>Wczytaj</button>
      {error ? <ApiResult error={error} /> : null}
      {rows && (
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>#</th><th>Formularz</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.kind}</td><td>{r.status}</td><td>{r.created_at}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
