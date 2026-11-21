"use client";

import { useEffect, useState } from "react";
import type { S } from "@/lib/api";
import { planHandoff } from "@/lib/session";
import { usePlan } from "@/hooks/use-plan";
import { ApiResult } from "@/components/api-result";
import { BlocksEditor } from "@/components/forms/blocks-editor";
import { FamilyForm } from "@/components/forms/family-form";
import { PageHeader } from "@/components/page-header";
import { PlanTimeline } from "@/components/plan/plan-timeline";

const initial: S["Plan-Input"] = {
  family: {
    mother: { employment: "employee", base_monthly: "6000" },
    father: { employment: "employee", base_monthly: "8000" },
    due_date: "2027-03-01",
  },
  blocks: [{ who: "mother", kind: "maternity", start: "2027-03-01", days: 140 }],
};

// Integrated calculator (brief items b–f, j): edit the family and the leave plan, results recompute live.
export default function Calculator() {
  const [plan, setPlan] = useState<S["Plan-Input"]>(initial);
  const { result, error } = usePlan(plan);

  useEffect(() => {
    const handedOff = planHandoff.take() as S["Plan-Input"] | undefined;
    if (handedOff) setPlan(handedOff); // eslint-disable-line react-hooks/set-state-in-effect -- one-time read of client-only storage
  }, []);

  return (
    <main className="page">
      <PageHeader eyebrow="Kalkulator zasiłku" title="Policz swój plan." accent="Krok po kroku.">
        Wpisz dane rodziny i okresy urlopów. Wynik przelicza się na bieżąco, a każda kwota ma podstawę prawną.
      </PageHeader>
      <div className="calculator-layout">
        <div className="stack">
          <FamilyForm value={plan.family} onChange={(family) => setPlan({ ...plan, family })} />
          <fieldset className="form-section">
            <legend>Wysokość zasiłku</legend>
            <label className="field-check"><input type="radio" name="rate" checked={plan.rate_variant !== "averaged"} onChange={() => setPlan({ ...plan, rate_variant: "standard" })} /> 100% macierzyński, 70% rodzicielski</label>
            <label className="field-check"><input type="radio" name="rate" checked={plan.rate_variant === "averaged"} onChange={() => setPlan({ ...plan, rate_variant: "averaged" })} /> 81,5% za cały okres (wniosek do 21 dni po porodzie)</label>
          </fieldset>
          <BlocksEditor value={plan.blocks ?? []} onChange={(blocks) => setPlan({ ...plan, blocks })} />
        </div>
        <div>{error ? <ApiResult error={error} /> : result ? <PlanTimeline result={result} /> : <ApiResult />}</div>
      </div>
    </main>
  );
}
