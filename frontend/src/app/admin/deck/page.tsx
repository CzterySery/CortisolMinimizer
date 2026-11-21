"use client";

import { api } from "@/lib/api";
import { adminHeaders } from "@/lib/session";
import { JsonEditor } from "@/components/json-editor";
import { PageHeader } from "@/components/page-header";

export default function AdminDeck() {
  return (
    <>
      <PageHeader eyebrow="Panel administracyjny" title="Talia kart" />
      <JsonEditor
        label="Talia (JSON)"
        load={() => api.GET("/api/v1/admin/deck", { headers: adminHeaders() })}
        save={(body) => api.PUT("/api/v1/admin/deck", { headers: adminHeaders(), body })}
      />
    </>
  );
}
