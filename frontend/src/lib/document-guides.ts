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
function documentKinds(doc: GuideDoc): S["Block-Input"]["kind"][] {
  const title = doc.form.toLowerCase();
  if (title.includes("w wysokości zasiłku")) return ["job_loss_benefit"];
  if (title.includes("chorobow")) return ["sick"];
  if (title.includes("opiekuńcz")) return ["care"];
  if (title.includes("rehabilit")) return ["rehab"];
  if (title.includes("ojcowsk")) return ["paternity"];
  if (title.includes("rodzicielsk")) return ["parental"];
  if (title.includes("uzupełniając")) return ["supplementary"];
  if (title.includes("macierzyńsk") || title.includes("macierzyństw")) return ["maternity", "parental", "paternity", "supplementary"];
  return [];
}

function documentBlock(doc: GuideDoc, plan?: S["Plan-Input"]) {
  const matches = plan?.blocks?.filter((b) => b.who === doc.who && b.start === doc.start
    && documentKinds(doc).includes(b.kind)
    && doc.end && new Date(Date.parse(b.start) + (b.days - 1) * 86400000).toISOString().slice(0, 10) === doc.end);
  return matches?.length === 1 ? matches[0] : undefined;
}

export function suggestedField(form: OfficialForm, field: PdfField, doc: GuideDoc, plan?: S["Plan-Input"]): string | undefined {
  const period = doc.start && doc.end ? `${day(doc.start)} – ${day(doc.end)}` : undefined;
  const block = documentBlock(doc, plan);
  const binding = (periodBindings as Record<string, Record<string, { name: string; phrase: string }>>)[form.id]?.[block?.kind ?? ""];
  if (binding && field.type === "Text" && field.name === binding.name && field.label.includes(binding.phrase)) return period;
  return undefined;
}

export type FilledField = { value: string; source: string };

// Use a unique covering period, or the explicitly requested former payer certificate.
// Never copy the logged-in parent's payer into the other parent's paperwork.
function payerPeriod(doc: GuideDoc, account?: S["ZusAccount"]): S["InsurancePeriod"] | undefined {
  if (account?.persona.who !== doc.who || !doc.start || !doc.end) return undefined;
  const periods = account.insurance.filter((p) => p.start <= doc.start! && (!p.end || p.end >= doc.end!));
  if (periods.length) return periods.length === 1 ? periods[0] : undefined;
  if (documentIssuer(doc) === "employer" && doc.note.includes("były")) {
    const ended = account.insurance.filter((p) => p.end && p.end < doc.start!).sort((a, b) => b.end!.localeCompare(a.end!));
    if (ended.length && (!ended[1] || ended[0].end !== ended[1].end)) return ended[0];
  }
  return undefined;
}

export function knownPayer(doc: GuideDoc, account?: S["ZusAccount"]): string | undefined {
  const period = payerPeriod(doc, account);
  return period?.payer_data?.name ?? period?.payer;
}

export function knownPayerDetails(doc: GuideDoc, account?: S["ZusAccount"]): S["DemoPayerData"] | undefined {
  return payerPeriod(doc, account)?.payer_data ?? undefined;
}

export function prefilledFields(form: OfficialForm, doc: GuideDoc, plan?: S["Plan-Input"], name?: string,
  account?: S["ZusAccount"]): Record<string, FilledField> {
  if (doc.rule === "Oficjalny wzór ZUS") return {};
  const result: Record<string, FilledField> = {};
  const ownName = name ?? (account?.persona.who === doc.who ? account.persona.name : undefined);
  // Two components are unambiguous for the sample personas. Longer names need manual separation.
  const parts = ownName?.trim().split(/\s+/);
  const payer = knownPayer(doc, account);
  const payerData = payerPeriod(doc, account)?.payer_data;
  const personal = account?.persona.who === doc.who ? account.personal_data : undefined;
  const block = documentBlock(doc, plan);
  const adoption = plan?.family.adoption;
  const checkbox = block?.kind === "maternity" ? (adoption ? "nawarunkach" : "macierzynskiego")
    : block?.kind === "parental" ? "rodzicielskiego" : block?.kind === "supplementary" ? "uzMacierzynskiego"
      : block?.kind === "paternity" ? "ojcowskiego" : undefined;
  const kinds = documentKinds(doc);
  const kind = block?.kind ?? (kinds.length === 1 ? kinds[0] : undefined);
  const benefit = kind === "sick" ? "sick" : kind === "care" ? "care" : kind === "rehab" ? "rehab"
    : kind === "job_loss_benefit" ? "job_loss" : kind && ["maternity", "parental", "paternity", "supplementary"].includes(kind)
      ? "maternity" : kinds.length === 4 ? "maternity" : undefined;
  const certificate = form.id === "z3" || form.id === "z3a";
  const certificateFields = {
    sick: ["_1", "Tekst", "zasiłek chorobowy"], care: ["_2", "Tekstzo", "zasiłek opiekuńczy"],
    maternity: ["_3", "Tekstzm", "zasiłek macierzyński"],
    rehab: ["_4", "Tekstsr", "świadczenie rehabilitacyjne"],
    job_loss: ["zasilekwwysokosci", "Tekstzww", "zasiłek w wysokości zasiłku macierzyńskiego"],
  } as const;
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
        result[field.id] = { value: payer, source: "Płatnik przypisany do tego okresu ubezpieczenia" };
      if (payerData) {
        if (field.name === prefix + "NIP[0]" && field.label.includes("NIP płatnika składek"))
          result[field.id] = { value: payerData.nip, source: "Fikcyjny NIP płatnika demonstracyjnego" };
        if (!payerData.nip && field.name === prefix + "REGON[0]" && field.label.includes("REGON"))
          result[field.id] = { value: payerData.regon, source: "Fikcyjny REGON płatnika demonstracyjnego" };
        if (certificate && field.name === prefix + "Numertelefonu[0]" && payerData.phone)
          result[field.id] = { value: payerData.phone, source: "Telefon płatnika demonstracyjnego" };
        if (certificate && field.label.startsWith("Adres płatnika składek")) {
          const address: Record<string, string> = { Ulica: payerData.street, Numerdomu: payerData.house_number,
            Numerlokalu: payerData.apartment_number ?? "", Kodpocztowy: payerData.postal_code, Poczta: payerData.city };
          for (const [native, value] of Object.entries(address)) {
            if (value && field.name === prefix + `${native}[0]`)
              result[field.id] = { value, source: "Adres płatnika demonstracyjnego, nie osoby ubezpieczonej" };
          }
        }
      }
      if (personal?.pesel && field.name === prefix + (certificate ? "PESEL2[0]" : "PESEL[0]")
          && /^(Wpisz swój numer PESEL|Wpisz (numer )?PESEL osoby ubezpieczonej)/.test(field.label))
        result[field.id] = { value: personal.pesel, source: "Fikcyjny PESEL profilu demonstracyjnego" };
      if (personal?.birth_date && field.name === prefix + "Dataurodzenia[0]" &&
          (!personal.pesel || !field.label.startsWith("Jeśli")))
        result[field.id] = { value: personal.birth_date.split("-").reverse().join(" "), source: "Data urodzenia profilu demonstracyjnego" };
    }
    if (personal && field.type === "Text" && page.number === (certificate ? 2 : 1)
        && field.label.startsWith(certificate ? "Adres osoby ubezpieczonej" : "Twój adres")) {
      const addressFields: Record<string, string> = { Ulica: personal.street, Numerdomu: personal.house_number,
        Numerlokalu: personal.apartment_number ?? "", Kodpocztowy: personal.postal_code, Poczta: personal.city, Miejscowosc: personal.city };
      for (const [native, value] of Object.entries(addressFields)) {
        const nativeName = `topmostSubform[0].Page${page.number}[0].${native}${certificate ? "2" : ""}[0]`;
        if (value && field.name === nativeName) result[field.id] = { value, source: "Adres profilu demonstracyjnego osoby ubezpieczonej" };
      }
    }
    if (form.id === "znp7" && page.number === 3 && field.type === "Text" && payer) {
      const employerFields: Record<string, string> = { Nazwaplatnika: payer, NIP: payerData?.nip ?? "",
        REGON: payerData?.nip ? "" : payerData?.regon ?? "", Ulica: payerData?.street ?? "",
        Numerdomu: payerData?.house_number ?? "", Numerlokalu: payerData?.apartment_number ?? "",
        Kodpocztowy: payerData?.postal_code ?? "", Poczta: payerData?.city ?? "" };
      for (const [native, value] of Object.entries(employerFields)) {
        if (value && field.name === `topmostSubform[0].Page3[0].${native}[0]`)
          result[field.id] = { value, source: "Dane płatnika demonstracyjnego — część II wypełniana przez płatnika" };
      }
    }
    if (form.id === "zam" && checkbox && field.type === "CheckBox"
      && field.name === `topmostSubform[0].Page2[0].${checkbox}[0]` && field.label.startsWith("Zaznacz, jeśli wnioskujesz"))
      result[field.id] = { value: "X", source: "Rodzaj urlopu dla tego dokumentu w Twoim planie" };
    if (certificate && benefit && !(benefit === "job_loss" && form.id === "z3a") && page.number === 2) {
      const [tick, periodField, phrase] = certificateFields[benefit];
      const native = field.type === "CheckBox" ? tick : periodField;
      if (field.name === `topmostSubform[0].Page2[0].${native}[0]` && field.label.includes(phrase)) {
        const value = field.type === "CheckBox" ? "X" : doc.start && doc.end ? `${day(doc.start)} – ${day(doc.end)}` : "";
        if (value) result[field.id] = { value, source: "Rodzaj świadczenia i okres tego dokumentu" };
      }
    }
    if (form.id === "z3" && block && page.number === 3 && field.type === "CheckBox") {
      const leave = ({ maternity: adoption ? "C6" : "A6", parental: "B6", supplementary: "D6", paternity: "E6" } as Record<string, string>)[block.kind];
      const parent = plan?.family[doc.who];
      if (leave && parent?.employment === "employee" && (!parent.insured_until || parent.insured_until >= block.start)
          && field.name === `topmostSubform[0].Page3[0].${leave}[0]` && field.label.startsWith("Zaznacz, jeśli pracownikowi udzielono"))
        result[field.id] = { value: "X", source: "Rodzaj urlopu pracownika w planie" };
    }
  }
  return result;
}

export function leaveRule(doc: GuideDoc): string {
  const title = doc.form.toLowerCase();
  return title.includes("wysokości zasiłku macierzyńskiego") ? "job-loss-before" : title.includes("łączenie") ? "part-time" : title.includes("ojcowski") ? "paternity" : title.includes("rodzicielski")
    ? "parental-docs" : title.includes("uzupełniający") ? "supplementary" : title.includes("81,5%") ? "averaged"
      : title.includes("warunkach") ? "adoption" : "maternity-pool";
}
