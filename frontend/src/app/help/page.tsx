"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";
import { userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

const QUICK_QUESTIONS = [
  "Ile trwa urlop ojcowski?",
  "Jak działa wniosek o 81,5% zasiłku?",
  "Ile trwa uzupełniający urlop macierzyński dla wcześniaka?",
  "Czy zadłużenie składkowe na JDG blokuje zasiłek?",
  "Kto wypłaca zasiłek — pracodawca czy ZUS?",
  "Kiedy trzeba dołączyć odpis aktu urodzenia?",
];

const LINK_BADGES: Record<string, string> = {
  "https://www.zus.pl": "zus.pl · Zakład Ubezpieczeń Społecznych",
  "https://www.gov.pl/web/rodzina/urlop-rodzicielski": "gov.pl · MRPiPS",
  "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo": "pip.gov.pl · Państwowa Inspekcja Pracy",
  "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego": "gov.pl · Urząd Stanu Cywilnego",
};

function getHostBadge(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function Help() {
  const [links, setLinks] = useState<S["Link"][]>([]);
  const [charities, setCharities] = useState<S["Charity"][]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<{ data?: S["PueReply"]; error?: unknown }>({});

  useEffect(() => {
    api.GET("/api/v1/info/links").then(({ data }) => setLinks(data ?? []));
    api.GET("/api/v1/info/charities").then(({ data }) => setCharities(data ?? []));
  }, []);

  const askQuestion = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const token = userToken.get();
      setReply(
        await api.POST("/api/v1/pue/messages", {
          body: { question: trimmed },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const ask = () => askQuestion(question);

  return (
    <main className="page">
      <PageHeader eyebrow="Pomoc" title="Nie jesteście sami." accent="Tu znajdziecie wsparcie." />
      <div className="stack">
        <section className="panel rag-assistant">
          <h2 className="eyebrow">Asystent prawny ZUS</h2>
          <p className="muted">
            Zadaj pytanie o urlopy rodzicielskie, zasiłki, formularze (ZAM, Z-15, ZAS-53, ZNp-7, Z-3) lub składki.
            Asystent przeszukuje załadowane dokumenty ZUS i Kodeks pracy oraz zwraca krótką odpowiedź z linkami do źródeł.
          </p>
          <div className="rag-chips" aria-label="Przykładowe pytania">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                className="rag-chip"
                onClick={() => {
                  setQuestion(q);
                  void askQuestion(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <label className="field">
            Twoje pytanie
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Np. Ile trwa urlop ojcowski i kiedy złożyć wniosek?"
            />
          </label>
          <div className="actions">
            <button className="button button-primary" onClick={ask} disabled={!question.trim() || loading}>
              {loading ? "Szukam w przepisach…" : "Wyślij pytanie"}
            </button>
          </div>
          {reply.data && (
            <div className="notice rag-reply">
              <div className="rag-reply-meta">
                <strong>Odpowiedź asystenta · Zweryfikowane źródła ZUS</strong>
              </div>
              <p className="rag-answer">{reply.data.answer}</p>
              {reply.data.sources && reply.data.sources.length > 0 && (
                <div className="rag-sources">
                  <span className="eyebrow">Źródła w załadowanych dokumentach</span>
                  <ul className="rag-source-list">
                    {reply.data.sources.map((s) => (
                      <li key={`${s.url}-${s.locator}`} className="rag-source-card">
                        <a
                          href={s.url}
                          {...(s.url.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                        >
                          <strong>{s.title}</strong>
                          {s.locator ? <span className="rag-locator"> · {s.locator}</span> : null}
                        </a>
                        {s.snippet ? <small>{s.snippet}</small> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {reply.error ? <ApiResult error={reply.error} /> : null}
        </section>

        <section className="panel">
          <h2 className="eyebrow">Wsparcie w trudnych sytuacjach</h2>
          <p className="muted">
            Organizacje charytatywne, sprawdzone na ich stronach i w KRS. Pomagają m.in. po stracie dziecka, przy
            wcześniaku i ciężkiej chorobie.
          </p>
          <ul className="official-links-grid">
            {charities.map((c) => (
              <li key={c.url}>
                <a className="official-link-card" href={c.url} target="_blank" rel="noreferrer">
                  <span className="official-link-badge">{c.helps_with.join(" · ")}</span>
                  <strong className="official-link-title">
                    <span>{c.name}</span>
                    <span aria-hidden="true" className="official-link-arrow">↗</span>
                  </strong>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2 className="eyebrow">Oficjalne źródła</h2>
          <p className="muted">
            Bezpośrednie odnośniki do serwisów instytucji publicznych oraz oficjalnych wytycznych dla rodziców.
          </p>
          <ul className="official-links-grid">
            {links.map((l) => (
              <li key={l.url}>
                <a className="official-link-card" href={l.url} target="_blank" rel="noreferrer">
                  <span className="official-link-badge">{LINK_BADGES[l.url] ?? getHostBadge(l.url)}</span>
                  <strong className="official-link-title">
                    <span>{l.title}</span>
                    <span aria-hidden="true" className="official-link-arrow">↗</span>
                  </strong>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
