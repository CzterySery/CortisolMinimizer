"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type S } from "@/lib/api";
import { day, pln } from "@/lib/format";
import { recipientLabel, whoLabel } from "@/lib/labels";
import { myPlan, userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

// "Moje dane z ZUS" after the simulated mObywatel login: one eZUS account view, plus the way into the calculator
// and the person's own applications.
export default function Me() {
  const router = useRouter();
  const [account, setAccount] = useState<S["ZusAccount"]>();
  const [error, setError] = useState<unknown>();
  const [loggedIn, setLoggedIn] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const token = userToken.get();
    if (!token) { setLoggedIn(false); return; } // eslint-disable-line react-hooks/set-state-in-effect -- one-time read of client-only storage
    api.GET("/api/v1/zus/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data, error, response }) => {
        if (response.status === 401) {
          // The simulated session is signed per backend process, so a restart invalidates it: log in again.
          userToken.set(); setExpired(true); setLoggedIn(false);
        } else if (error) setError(error);
        else setAccount(data);
      });
  }, []);

  if (!loggedIn) return (
    <main className="page">
      <PageHeader eyebrow="Moje dane" title="Co wie o Was" accent="ZUS?" />
      {expired && <p className="notice" role="status">Sesja wygasła. Zaloguj się ponownie.</p>}
      <section className="panel">
        <p className="muted">Nie jesteś zalogowany. Zaloguj się przez mObywatel, aby zobaczyć swoje dane z ZUS: ubezpieczenia, zwolnienia e-ZLA, zaświadczenie o niezaleganiu i złożone wnioski (symulacja).</p>
        <div className="actions"><Link className="button button-primary" href="/login">Zaloguj się przez mObywatel</Link></div>
      </section>
    </main>
  );
  if (!account) return <main className="page">{error ? <ApiResult error={error} /> : <p className="muted" role="status">Wczytuję dane z ZUS…</p>}</main>;

  const open = (path: string) => {
    if (path === "/applications") myPlan.put(account.plan);
    router.push(path);
  };
  const logout = () => { userToken.set(); router.push("/login"); };

  return (
    <main className="page">
      <PageHeader eyebrow="Moje dane · symulacja eZUS" title={account.persona.name} accent="Co wie o Tobie ZUS.">
        {account.persona.description}
      </PageHeader>
      <div className="actions">
        <button className="button button-primary" onClick={() => open("/calculator")}>Przelicz mój plan w kalkulatorze</button>
        <button className="button" onClick={() => open("/applications")}>Moje wnioski</button>
        <button className="button button-dashed" onClick={logout}>Wyloguj</button>
      </div>
      <div className="plan-grid">
        <section className="panel">
          <h2 className="eyebrow">Ubezpieczenia</h2>
          {account.insurance.length ? <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Tytuł</th><th>Płatnik</th><th>Okres</th><th>Chorobowe</th><th>Podstawa składek</th></tr></thead>
            <tbody>{account.insurance.map((i) => <tr key={`${i.title}-${i.start}`}>
              <td>{i.title}</td><td>{i.payer}</td><td>{day(i.start)} – {i.end ? day(i.end) : "obecnie"}</td>
              <td>{i.sickness_insurance ? "tak" : "nie"}</td><td>{pln(i.contribution_base)}</td>
            </tr>)}</tbody>
          </table></div> : <p className="notice">Brak tytułu do ubezpieczenia chorobowego: zasiłki nie przysługują.</p>}
        </section>
        <section className="panel">
          <h2 className="eyebrow">Zaświadczenie o niezaleganiu w składkach</h2>
          <p>Stan na {day(account.debt.as_of)} (dzień powstania prawa do świadczenia): zaległość <strong>{pln(account.debt.debt)}</strong>.</p>
          {account.debt.blocks_benefits
            ? <p className="notice">Zaległość wstrzymuje zasiłki do czasu spłaty całości (art. 2a ustawy zasiłkowej).</p>
            : <p className="muted">Zaległość nie wstrzymuje zasiłków.</p>}
        </section>
        <section className="panel">
          <h2 className="eyebrow">Zwolnienia lekarskie (e-ZLA)</h2>
          {account.ezla.length ? <div className="table-scroll"><table className="data-table">
            <thead><tr><th>Numer</th><th>Okres</th><th>Kod B (ciąża)</th></tr></thead>
            <tbody>{account.ezla.map((z) => <tr key={z.number}>
              <td>{z.number}</td><td>{day(z.start)} – {day(z.end)}</td><td>{z.code_b ? "tak, zasiłek 100%" : "nie"}</td>
            </tr>)}</tbody>
          </table></div> : <p className="muted">Brak zwolnień.</p>}
        </section>
        <section className="panel">
          <h2 className="eyebrow">Złożone dokumenty</h2>
          {account.applications.length ? <ul className="docs">{account.applications.map((a, i) => (
            <li key={i} className="done"><strong>{a.form}</strong> · {whoLabel[a.who]} → {recipientLabel[a.recipient]} · {day(a.filed_on)}<small>{a.status}</small></li>
          ))}</ul> : <p className="muted">Nic jeszcze nie złożono.</p>}
        </section>
      </div>
    </main>
  );
}
