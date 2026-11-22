"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type S } from "@/lib/api";
import { day, pln } from "@/lib/format";
import { myPlan, userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";
import { DocumentsSection } from "@/components/plan/documents-section";

export default function Me() {
  const router = useRouter();
  const [account, setAccount] = useState<S["ZusAccount"]>();
  const [savedPlan, setSavedPlan] = useState<S["Plan-Input"]>();
  const [token, setToken] = useState<string>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const currentToken = userToken.get();
      setToken(currentToken); setError(undefined); setLoading(true);
      setSavedPlan(myPlan.get() as S["Plan-Input"] | undefined);
      if (!currentToken) { setAccount(undefined); setLoading(false); return; }
      try {
        // Fetch receipts even on a fresh deployment origin with no saved calculator plan.
        const response = await api.GET("/api/v1/zus/me", {
          headers: { Authorization: `Bearer ${currentToken}` }, signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.response.status === 401) {
          userToken.set(); setToken(undefined); setAccount(undefined); setExpired(true);
        } else if (response.error) { setError(response.error); setAccount(undefined); }
        else { setAccount(response.data); setExpired(false); }
      } catch {
        if (!controller.signal.aborted) setError("Nie udało się pobrać danych konta i statusów dokumentów. Spróbuj ponownie.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [reload]);

  const plan = savedPlan ?? account?.plan;
  const logout = () => { userToken.set(); router.push("/login"); };

  return (
    <main className="page">
      <PageHeader eyebrow="Moje dane" title="Moje" accent="dane i dokumenty.">
        {account ? `${account.persona.name} · ${account.persona.description}` : "Sprawdź najważniejsze dane i przygotuj dokumenty dla swojego planu."}
      </PageHeader>
      {loading && !account && !plan ? <p className="muted" role="status">Wczytuję dane i statusy dokumentów…</p> : <>
        {expired && <p className="notice" role="status">Sesja wygasła. Zaloguj się ponownie, aby pobrać złożone dokumenty z konta.</p>}
        {error ? <><ApiResult error={error} /><button type="button" className="button" onClick={() => setReload((n) => n + 1)}>Spróbuj pobrać ponownie</button></> : null}
        {account ? <>
          <div className="actions">
            <Link className="button button-primary" href="/calculator">Przelicz mój plan w kalkulatorze</Link>
            <a className="button" href="#dokumenty">Przejdź do dokumentów</a>
            <button className="button button-dashed" onClick={logout}>Wyloguj</button>
          </div>
          <div className="plan-grid account-summary">
            <section className="panel"><h2 className="eyebrow">Ubezpieczenia</h2>
              {account.insurance.length ? <ul>{account.insurance.map((insurance) => <li key={`${insurance.title}|${insurance.start}`}>
                <strong>{insurance.title}</strong> · {insurance.sickness_insurance ? "ubezpieczenie chorobowe" : "bez chorobowego"}
                <p className="muted">{insurance.payer}<br />{day(insurance.start)} – {insurance.end ? day(insurance.end) : "nadal"}</p>
              </li>)}</ul> : <p className="notice">Brak tytułu do ubezpieczenia chorobowego w danych konta.</p>}
            </section>
            <section className="panel"><h2 className="eyebrow">Składki i zadłużenie</h2>
              <p>Stan na {day(account.debt.as_of)}: <strong>{pln(account.debt.debt)}</strong> zaległości.</p>
              <p className={account.debt.blocks_benefits ? "notice" : "muted"}>{account.debt.blocks_benefits
                ? "Zaległość wstrzymuje zasiłki do czasu spłaty całości (art. 2a)." : "Zaległość nie wstrzymuje zasiłków."}</p>
              <p>Złożone dokumenty na koncie: <strong>{account.applications.length}</strong></p>
            </section>
          </div>
          <section className="panel"><h2 className="eyebrow">Zwolnienia lekarskie (e-ZLA) i podstawy składek</h2>
            {account.ezla.length ? <ul>{account.ezla.map((z) => <li key={z.number}><strong>{z.number}</strong> · {day(z.start)} – {day(z.end)}
              {z.code_b && " · kod B (ciąża)"}</li>)}</ul> : <p>Brak zwolnień.</p>}
            {account.insurance.map((insurance) => <p key={`${insurance.title}|${insurance.start}`}>{insurance.payer}: podstawa składek {pln(insurance.contribution_base)}</p>)}
          </section>
        </> : <section className="panel">
          <p>Zaloguj się przez mObywatel, aby pobrać dane z ZUS i złożone dokumenty (symulacja). Wnioski przygotowane bez logowania są pamiętane w sesji tej przeglądarki.</p>
          <Link className="button button-primary" href="/login">Zaloguj się przez mObywatel</Link>
        </section>}
        <DocumentsSection plan={plan} account={account} token={token} allowSending={!expired && (!token || !!account)}
          onSubmitted={() => { if (token) setReload((n) => n + 1); }} />
      </>}
    </main>
  );
}
