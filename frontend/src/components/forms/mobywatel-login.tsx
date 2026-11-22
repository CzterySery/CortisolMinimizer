"use client";

import { useEffect, useId, useRef, useState } from "react";
import { api, type S } from "@/lib/api";
import { userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";

// Simulated mObywatel login: pick a persona, keep the mock token, go to "Moje dane".
export function MobywatelLogin({ onLogin }: { onLogin: () => void }) {
  const [personas, setPersonas] = useState<S["Persona"][]>();
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();

  useEffect(() => {
    const element = dialog.current;
    if (open) element?.showModal(); else element?.close();
    return () => element?.close();
  }, [open]);

  useEffect(() => {
    const controller = new AbortController();
    api.GET("/api/v1/auth/personas", { signal: controller.signal }).then(({ data, error }) => {
      if (!controller.signal.aborted) { if (error) setOut({ error }); else setPersonas(data); }
    }).catch(() => { if (!controller.signal.aborted) setOut({ error: "Nie udało się pobrać profili demonstracyjnych." }); });
    return () => controller.abort();
  }, []);

  const login = async (persona_id: string) => {
    if (busy) return;
    setBusy(true); setOut({});
    try {
      const session = await api.POST("/api/v1/auth/mobywatel", { body: { persona_id } });
      if (session.error) { setOut(session); return; }
      userToken.set(session.data.token);
      window.history.replaceState(null, "", "/me");
      onLogin();
    } catch { setOut({ error: "Nie udało się zalogować. Spróbuj ponownie." }); }
    finally { setBusy(false); }
  };

  return (
    <section id="logowanie" className="panel mobywatel-login-entry">
      <p className="muted">Zaloguj się przez mObywatel, aby pobrać dane z ZUS i złożone dokumenty (symulacja).</p>
      <button type="button" className="button button-primary mobywatel-login-trigger" onClick={() => setOpen(true)}>Zaloguj się przez mObywatel</button>
      <dialog ref={dialog} className="mobywatel-login-dialog" aria-labelledby={title}
        onCancel={(event) => { event.preventDefault(); setOpen(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <header className="mobywatel-login-heading"><h2 id={title}>3 symulacje</h2>
          <button type="button" className="button" autoFocus onClick={() => setOpen(false)}>Zamknij</button></header>
        <p className="muted">Wybierz przykładową osobę. To demonstracja logowania mObywatelem — wszystkie dane są fikcyjne.</p>
        <div className="choice-grid">
        {personas?.map((p) => (
          <button type="button" key={p.id} className="choice" disabled={busy} onClick={() => login(p.id)}><strong>{p.name}</strong><span>{p.description}</span></button>
        ))}
        </div>
        {!personas && !out.error && <p className="muted" role="status">Wczytuję przykładowe osoby…</p>}
        {(out.data || out.error) ? <ApiResult {...out} /> : null}
      </dialog>
    </section>
  );
}
