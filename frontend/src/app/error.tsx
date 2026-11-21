"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="status-page">
      <h1>Nie udało się przygotować stołu.</h1>
      <p>Sprawdź połączenie z API i spróbuj ponownie.</p>
      <button className="retry-button" onClick={reset}>Spróbuj ponownie</button>
    </main>
  );
}
