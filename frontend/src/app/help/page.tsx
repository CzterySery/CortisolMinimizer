"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";
import { userToken } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

export default function Help() {
  const [links, setLinks] = useState<S["Link"][]>([]);
  const [charities, setCharities] = useState<S["Charity"][]>([]);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<{ data?: S["PueReply"]; error?: unknown }>({});

  useEffect(() => {
    api.GET("/api/v1/info/links").then(({ data }) => setLinks(data ?? []));
    api.GET("/api/v1/info/charities").then(({ data }) => setCharities(data ?? []));
  }, []);

  const ask = async () => {
    const token = userToken.get();
    setReply(await api.POST("/api/v1/pue/messages", { body: { question }, headers: token ? { Authorization: `Bearer ${token}` } : undefined }));
  };

  return (
    <main className="page">
      <PageHeader eyebrow="Pomoc" title="Nie jesteście sami." accent="Tu znajdziecie wsparcie." />
      <div className="plan-grid">
        <section className="panel">
          <h2 className="eyebrow">Wsparcie w trudnych sytuacjach</h2>
          <p className="muted">Organizacje charytatywne, sprawdzone na ich stronach i w KRS. Pomagają m.in. po stracie dziecka, przy wcześniaku i ciężkiej chorobie.</p>
          <ul className="docs">{charities.map((c) => <li key={c.url}>
            <a href={c.url} target="_blank" rel="noreferrer"><strong>{c.name}</strong></a> · {c.helps_with.join(", ")}
            <small>{c.description}{c.phone && <> Tel. {c.phone}.</>} KRS {c.krs}.</small>
          </li>)}</ul>
        </section>
        <section className="panel">
          <h2 className="eyebrow">Oficjalne źródła</h2>
          <ul className="link-list">{links.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.title}</a></li>)}</ul>
        </section>
        <section className="panel">
          <h2 className="eyebrow">Zapytaj ZUS (symulacja PUE/eZUS)</h2>
          <label className="field">Twoje pytanie
            <textarea rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <button className="button button-primary" onClick={ask} disabled={!question.trim()}>Wyślij pytanie</button>
          {reply.data && <div className="notice"><p>{reply.data.answer}</p>
            <ul className="link-list">{reply.data.links.map((l) => <li key={l}><a href={l} {...(l.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{l}</a></li>)}</ul></div>}
          {reply.error ? <ApiResult error={reply.error} /> : null}
        </section>
      </div>
    </main>
  );
}
