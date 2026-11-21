"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";

// Live calculator: recompute after each edit, debounced, and drop stale responses.
export function usePlan(plan: S["Plan-Input"], delayMs = 400) {
  const [result, setResult] = useState<S["PlanResult"]>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      api.POST("/api/v1/calc/plan", { body: plan, signal: ctrl.signal })
        .then(({ data, error }) => { setError(error); if (data) setResult(data); })
        .catch((e) => { if (!ctrl.signal.aborted) setError({ detail: String(e) }); });
    }, delayMs);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [plan, delayMs]);

  return { result, error };
}
