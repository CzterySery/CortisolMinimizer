"use client";

import { useState } from "react";
import { ApiResult } from "@/components/api-result";

type Res = { data?: unknown; error?: unknown };

// Admin JSON editor: load, edit, save as a new version. The backend validates; errors show inline.
// Next: replace with typed forms (params grouped with units, deck as card list with previews).
export function JsonEditor({ label, load, save }: { label: string; load: () => Promise<Res>; save: (body: never) => Promise<Res> }) {
  const [json, setJson] = useState("");
  const [out, setOut] = useState<Res>({});

  const onLoad = async () => {
    const res = await load();
    if (res.error) return setOut({ error: res.error });
    setJson(JSON.stringify(res.data, null, 2));
    setOut({});
  };

  const onSave = async () => {
    let body;
    try { body = JSON.parse(json); } catch (e) { return setOut({ error: { detail: String(e) } }); }
    setOut(await save(body as never));
  };

  return (
    <div className="stack">
      <div className="actions">
        <button className="button" onClick={onLoad}>Wczytaj</button>
        <button className="button button-primary" onClick={onSave} disabled={!json}>Zapisz nową wersję</button>
      </div>
      <textarea className="code-editor" aria-label={label} value={json} onChange={(e) => setJson(e.target.value)} />
      {(out.data || out.error) ? <ApiResult {...out} /> : null}
    </div>
  );
}
