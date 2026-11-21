"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type S } from "@/lib/api";
import { userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

// Simulated mObywatel login: pick a persona, keep the mock token, go to "Moje dane".
export default function Login() {
  const router = useRouter();
  const [personas, setPersonas] = useState<S["Persona"][]>();
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});

  useEffect(() => {
    api.GET("/api/v1/auth/personas").then(({ data, error }) => (error ? setOut({ error }) : setPersonas(data)));
  }, []);

  const login = async (persona_id: string) => {
    const session = await api.POST("/api/v1/auth/mobywatel", { body: { persona_id } });
    if (session.error) return setOut(session);
    userToken.set(session.data.token);
    router.push("/me");
  };

  return (
    <main className="page">
      <PageHeader eyebrow="mObywatel · symulacja" title="Zaloguj się," accent="a resztę pobierzemy z ZUS.">
        To demonstracja: wybierz przykładową osobę zamiast prawdziwego logowania.
      </PageHeader>
      <div className="choice-grid">
        {personas?.map((p) => (
          <button key={p.id} className="choice" onClick={() => login(p.id)}><strong>{p.name}</strong><span>{p.description}</span></button>
        ))}
      </div>
      {(out.data || out.error) ? <ApiResult {...out} /> : null}
    </main>
  );
}
