"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";
import { userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";

// Former /help page, now the bottom of the home page: first the assistant chat, then all links.
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

export function HelpChat() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<{ data?: S["PueReply"]; error?: unknown }>({});

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

  return (
    <section className="panel rag-assistant" aria-labelledby="home-chat-title">
      <h2 className="home-help-title" id="home-chat-title">Asystent prawny ZUS</h2>
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
      <div className="rag-question-wrap">
        <label className="rag-question-label" htmlFor="rag-question-input">Twoje pytanie</label>
        <div className="rag-input-row">
          <textarea
            id="rag-question-input"
            rows={1}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (question.trim() && !loading) void askQuestion(question);
              }
            }}
            placeholder="Np. Ile trwa urlop ojcowski i kiedy złożyć wniosek?"
          />
          <button className="button button-primary rag-submit-btn" onClick={() => askQuestion(question)} disabled={!question.trim() || loading}>
            {loading ? "Szukam w przepisach…" : "Wyślij pytanie"}
          </button>
        </div>
      </div>
      {reply.data && (
        <div className="notice rag-reply" role="status">
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
                    <a href={s.url} {...(s.url.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
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
  );
}

export function HelpLinks() {
  const [links, setLinks] = useState<S["Link"][]>([]);
  const [charities, setCharities] = useState<S["Charity"][]>([]);

  useEffect(() => {
    api.GET("/api/v1/info/links").then(({ data }) => setLinks(data ?? []));
    api.GET("/api/v1/info/charities").then(({ data }) => setCharities(data ?? []));
  }, []);

  return (
    <section className="panel home-links" aria-labelledby="home-links-title">
      <h2 className="home-help-title" id="home-links-title">Przydatne linki</h2>
      <div className="home-links-group">
        <h3>Oficjalne źródła</h3>
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
      </div>
      <div className="home-links-group">
        <h3>Wsparcie w trudnych sytuacjach</h3>
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
      </div>
    </section>
  );
}
