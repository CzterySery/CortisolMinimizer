import layouts from "../../../shared/zus-form-layouts.json";
import periodBindings from "../../../shared/zus-form-period-bindings.json";
import type { S } from "./api";
import { day } from "./format";

export type GuideDoc = S["Document"];
export type OfficialForm = (typeof layouts)[number];
export type PdfField = OfficialForm["pages"][number]["fields"][number];
export const officialForms = layouts;

export function officialForm(doc: GuideDoc): OfficialForm | undefined {
  const form = doc.form;
  const id = /^Z-3a\b/i.test(form) ? "z3a" : /^Z-3\b/i.test(form) ? "z3" : /^ZAM\b/i.test(form) ? "zam"
    : /^Z-15(?:A|B)?\b/i.test(form) ? "z15" : /^ZAS-53\b/i.test(form) ? "zas53" : /^ZNp-7\b/i.test(form) ? "znp7"
      : form.includes("81,5%") && doc.recipient === "zus" ? "zam" : undefined;
  return layouts.find((item) => item.id === id);
}

export function documentIssuer(doc: GuideDoc): "parent" | "employer" | "doctor" {
  if (/^Z-3(?:a)?\b/i.test(doc.form)) return "employer";
  if (/e-ZLA/i.test(doc.form)) return "doctor";
  return "parent";
}

// Curated bindings use full native widget names and checked labels/types, not positional field indices.
export function suggestedField(form: OfficialForm, field: PdfField, doc: GuideDoc, plan?: S["Plan-Input"]): string | undefined {
  const period = doc.start && doc.end ? `${day(doc.start)} – ${day(doc.end)}` : undefined;
  const block = plan?.blocks?.find((b) => b.who === doc.who && b.start === doc.start);
  const binding = (periodBindings as Record<string, Record<string, { name: string; phrase: string }>>)[form.id]?.[block?.kind ?? ""];
  if (binding && field.type === "Text" && field.name === binding.name && field.label.includes(binding.phrase)) return period;
  return undefined;
}

export function leaveRule(doc: GuideDoc): string {
  const title = doc.form.toLowerCase();
  return title.includes("wysokości zasiłku macierzyńskiego") ? "job-loss-before" : title.includes("łączenie") ? "part-time" : title.includes("ojcowski") ? "paternity" : title.includes("rodzicielski")
    ? "parental-docs" : title.includes("uzupełniający") ? "supplementary" : title.includes("81,5%") ? "averaged"
      : title.includes("warunkach") ? "adoption" : "maternity-pool";
}
