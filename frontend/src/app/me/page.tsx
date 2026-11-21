"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

type Result = { data?: unknown; error?: unknown };

// "Moje dane z ZUS" after the simulated mObywatel login: insurance titles, e-ZLA, contribution debt.
// Next: tables + "Zagraj swoją historię" / "Przelicz w kalkulatorze" prefilled from this data.
export default function Me() {
  const [token, setToken] = useState<string>();
  const [sections, setSections] = useState<Record<string, Result>>({});

  useEffect(() => {
    const t = userToken.get();
    if (!t) return;
    const init = { headers: { Authorization: `Bearer ${t}` } };
    Promise.all([
      api.GET("/api/v1/zus/me/insurance", init),
      api.GET("/api/v1/zus/me/ezla", init),
      api.GET("/api/v1/zus/me/debt-certificate", init),
    ]).then(([insurance, ezla, debt]) => {
      setToken(t);
      setSections({ "Ubezpieczenia": insurance, "Zwolnienia lekarskie (e-ZLA)": ezla, "Zaświadczenie o niezaleganiu": debt });
    });
  }, []);

  return (
    <main className="page">
      <PageHeader eyebrow="Moje dane" title="Co wie o Was" accent="ZUS?" />
      {!token ? <p className="muted">Najpierw <Link href="/login">zaloguj się przez mObywatel</Link> (symulacja).</p> : (
        <div className="plan-grid">
          {Object.entries(sections).map(([title, r]) => (
            <section key={title} className="panel"><h2 className="eyebrow">{title}</h2><ApiResult {...r} /></section>
          ))}
        </div>
      )}
    </main>
  );
}
