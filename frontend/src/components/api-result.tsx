// Placeholder output until a page has real UI: backend errors (e.g. 501 "not implemented yet") or raw JSON.
export function ApiResult({ data, error }: { data?: unknown; error?: unknown }) {
  if (error) {
    const detail = (error as { detail?: unknown }).detail ?? error;
    return <p className="notice" role="alert">{typeof detail === "string" ? detail : JSON.stringify(detail)}</p>;
  }
  if (data === undefined) return <p className="muted" role="status">Ładowanie…</p>;
  return <pre className="raw-json">{JSON.stringify(data, null, 2)}</pre>;
}
