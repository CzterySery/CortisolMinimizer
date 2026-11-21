"use client";

import { api } from "@/lib/api";
import { adminHeaders } from "@/lib/session";
import { JsonEditor } from "@/components/json-editor";
import { PageHeader } from "@/components/page-header";

// Legal parameters (rates, durations). Each save is a new version; the backend validates before storing.
export default function AdminParams() {
  return (
    <>
      <PageHeader eyebrow="Panel administracyjny" title="Parametry prawne" />
      <JsonEditor
        label="Parametry (JSON)"
        load={() => api.GET("/api/v1/admin/params", { headers: adminHeaders() })}
        save={(body) => api.PUT("/api/v1/admin/params", { headers: adminHeaders(), body })}
      />
    </>
  );
}
