"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";
import { userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";

// Assistant chat lives on /help; HelpLinks lives inside "Przydatne Informacje" on home.
const QUICK_QUESTIONS = [
  "Ile trwa urlop ojcowski?",
  "Jak działa wniosek o 81,5% zasiłku?",
  "Ile trwa uzupełniający urlop macierzyński dla wcześniaka?",
  "Czy zadłużenie składkowe na JDG blokuje zasiłek?",
  "Kto wypłaca zasiłek — pracodawca czy ZUS?",
  "Kiedy trzeba dołączyć odpis aktu urodzenia?",
];

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
        Jeśli skonfigurowano model AI, to on formułuje odpowiedź z tych fragmentów; kwot i uprawnień nie liczy — robi to kalkulator.
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
            <strong>{reply.data.mode === "gemini-rag"
              ? "Odpowiedź sformułował model AI na podstawie źródeł poniżej — sprawdź ją w przepisach"
              : "Odpowiedź asystenta · fragmenty źródeł ZUS"}</strong>
          </div>
          <p className="rag-answer">{reply.data.answer}</p>
          {reply.data.sources && reply.data.sources.length > 0 && (
            <div className="rag-sources">
              <span className="eyebrow">Źródła w załadowanych dokumentach</span>
              <ul className="rag-source-list">
                {reply.data.sources.map((s) => (
                  <li key={`${s.url}-${s.locator}`} className="rag-source-card">
                    <a href={s.url} target="_blank" rel="noreferrer">
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
    <section className="home-links" aria-labelledby="home-links-title">
      <h3 className="home-help-title" id="home-links-title">Przydatne linki</h3>
      <div className="home-links-group">
        <h4>Oficjalne źródła</h4>
        <ul className="simple-links-list">
          {links.map((l) => (
            <li key={l.url}>
              <a className="simple-green-link" href={l.url} target="_blank" rel="noreferrer">
                {l.title} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="home-links-group">
        <h4>Wsparcie w trudnych sytuacjach</h4>
        <p className="muted">
          Organizacje charytatywne pomagające m.in. po stracie dziecka, przy wcześniaku i ciężkiej chorobie.
        </p>
        <ul className="simple-links-list">
          {charities.map((c) => (
            <li key={c.url}>
              <a className="simple-green-link" href={c.url} target="_blank" rel="noreferrer">
                {c.name} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
