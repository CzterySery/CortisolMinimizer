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
function documentBlock(form: OfficialForm, doc: GuideDoc, plan?: S["Plan-Input"]) {
  const matches = plan?.blocks?.filter((b) => b.who === doc.who && b.start === doc.start
    && Boolean((periodBindings as Record<string, Record<string, unknown>>)[form.id]?.[b.kind])
    && doc.end && new Date(Date.parse(b.start) + (b.days - 1) * 86400000).toISOString().slice(0, 10) === doc.end);
  return matches?.length === 1 ? matches[0] : undefined;
}

export function suggestedField(form: OfficialForm, field: PdfField, doc: GuideDoc, plan?: S["Plan-Input"]): string | undefined {
  const period = doc.start && doc.end ? `${day(doc.start)} – ${day(doc.end)}` : undefined;
  const block = documentBlock(form, doc, plan);
  const binding = (periodBindings as Record<string, Record<string, { name: string; phrase: string }>>)[form.id]?.[block?.kind ?? ""];
  if (binding && field.type === "Text" && field.name === binding.name && field.label.includes(binding.phrase)) return period;
  return undefined;
}

export type FilledField = { value: string; source: string };

// A payer is usable only when exactly one insurance period covers the whole requested period.
// Never copy the logged-in parent's identity into the other parent's paperwork.
export function knownPayer(doc: GuideDoc, account?: S["ZusAccount"]): string | undefined {
  if (account?.persona.who !== doc.who || !doc.start || !doc.end) return undefined;
  const periods = account.insurance.filter((p) => p.start <= doc.start! && (!p.end || p.end >= doc.end!));
  return periods.length === 1 ? periods[0].payer : undefined;
}

export function prefilledFields(form: OfficialForm, doc: GuideDoc, plan?: S["Plan-Input"], name?: string,
  account?: S["ZusAccount"]): Record<string, FilledField> {
  if (doc.rule === "Oficjalny wzór ZUS") return {};
  const result: Record<string, FilledField> = {};
  const ownName = name ?? (account?.persona.who === doc.who ? account.persona.name : undefined);
  // Two components are unambiguous for the sample personas. Longer names need manual separation.
  const parts = ownName?.trim().split(/\s+/);
  const payer = knownPayer(doc, account);
  const block = documentBlock(form, doc, plan);
  const adoption = plan?.family.adoption;
  const checkbox = block?.kind === "maternity" ? (adoption ? "nawarunkach" : "macierzynskiego")
    : block?.kind === "parental" ? "rodzicielskiego" : block?.kind === "supplementary" ? "uzMacierzynskiego"
      : block?.kind === "paternity" ? "ojcowskiego" : undefined;
  for (const page of form.pages) for (const field of page.fields) {
    const period = suggestedField(form, field, doc, plan);
    if (period) result[field.id] = { value: period, source: "Okres tego dokumentu w Twoim planie" };
    // Exact full native widget names and checked labels protect against other-parent/payer fields.
    const prefix = "topmostSubform[0].Page1[0].";
    if (page.number === 1 && field.type === "Text") {
      if (parts?.length === 2 && ["Imie[0]", "Imię[0]"].some((n) => field.name === prefix + n)
        && /Wpisz (swoje imię|imię osoby ubezpieczonej)/.test(field.label))
        result[field.id] = { value: parts[0], source: "Imię i nazwisko podane we wniosku lub na koncie — sprawdź podział" };
      if (parts?.length === 2 && field.name === prefix + "Nazwisko[0]"
        && /Wpisz (swoje nazwisko|nazwisko osoby ubezpieczonej)/.test(field.label))
        result[field.id] = { value: parts[1], source: "Imię i nazwisko podane we wniosku lub na koncie — sprawdź podział" };
      if (payer && field.name === prefix + "Nazwaplatnika[0]" && field.label.includes("płatnika składek"))
        result[field.id] = { value: payer, source: "Jedyny okres ubezpieczenia na koncie obejmujący cały okres wniosku" };
    }
    if (form.id === "zam" && checkbox && field.type === "CheckBox"
      && field.name === `topmostSubform[0].Page2[0].${checkbox}[0]` && field.label.startsWith("Zaznacz, jeśli wnioskujesz"))
      result[field.id] = { value: "X", source: "Rodzaj urlopu dla tego dokumentu w Twoim planie" };
  }
  return result;
}

export function leaveRule(doc: GuideDoc): string {
  const title = doc.form.toLowerCase();
  return title.includes("wysokości zasiłku macierzyńskiego") ? "job-loss-before" : title.includes("łączenie") ? "part-time" : title.includes("ojcowski") ? "paternity" : title.includes("rodzicielski")
    ? "parental-docs" : title.includes("uzupełniający") ? "supplementary" : title.includes("81,5%") ? "averaged"
      : title.includes("warunkach") ? "adoption" : "maternity-pool";
}
