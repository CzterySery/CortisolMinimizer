"use client";

import { useEffect, useState } from "react";
import { api, type S } from "@/lib/api";
import { day } from "@/lib/format";
import { adminHeaders } from "@/lib/session";
import { ApiResult } from "@/components/api-result";
import { PageHeader } from "@/components/page-header";

type Value = string | number | number[] | Tree;
type Tree = { [key: string]: Value };

// Polish labels and units by parameter path. "%" fields hold fractions (0.815) and show the percentage next to them.
// A parameter missing here still shows up under its key, so new backend fields are never hidden.
const GROUPS: Record<string, string> = {
  employee_contributions: "Składki pracownika (art. 3 pkt 3)", rates: "Stawki zasiłków (część podstawy)",
  rehab: "Świadczenie rehabilitacyjne", sick: "Zasiłek chorobowy", maternity: "Urlop macierzyński",
  parental: "Urlop rodzicielski", paternity: "Urlop ojcowski", supplementary: "Uzupełniający urlop macierzyński",
  "supplementary.extreme": "Poród bardzo wcześnie albo masa do 1000 g", "supplementary.preterm": "Poród przedwczesny",
  "supplementary.term": "Poród o czasie", deadlines: "Terminy wniosków", care: "Zasiłek opiekuńczy", game: "Gra",
  adoption: "Przyjęcie dziecka: adopcja i piecza niezawodowa",
};
const FIELDS: Record<string, [string, string]> = {
  "adoption.foster_age_years": ["Granica wieku w pieczy niezawodowej", "lat"],
  "adoption.foster_deferred_age_years": ["… z odroczeniem obowiązku szkolnego", "lat"],
  "adoption.adoption_age_years": ["Granica wieku przy przysposobieniu", "lat"],
  "adoption.short_parental_weeks": ["Rodzicielski po minimalnym 9-tygodniowym urlopie", "tyg."],
  "adoption.short_parental_za_zyciem_weeks": ["… z zaświadczeniem „Za życiem”", "tyg."],
  "adoption.application_days": ["Wniosek po spełnieniu przesłanek", "dni"],
  "adoption.start_days": ["Rozpoczęcie urlopu po spełnieniu przesłanek", "dni"],
  effective_from: ["Obowiązuje od", ""],
  contribution_deduction: ["Odliczenie składek (osoby niebędące pracownikami, minimalna podstawa)", "%"],
  "employee_contributions.pension": ["Emerytalna", "%"], "employee_contributions.disability": ["Rentowa", "%"],
  "employee_contributions.sickness": ["Chorobowa", "%"],
  min_wage: ["Płaca minimalna", "zł"],
  voluntary_base_cap: ["Najwyższa podstawa przy dobrowolnym chorobowym (po odliczeniu składek)", "zł"],
  parental_benefit_floor: ["Najniższy zasiłek macierzyński miesięcznie", "zł"],
  payer_threshold_insured: ["Płatnik sam wypłaca zasiłki, gdy zgłasza więcej niż", "osób"],
  debt_threshold_pct_min_wage: ["Zaległość JDG blokująca zasiłki (część płacy minimalnej)", "%"],
  "rates.sick": ["Chorobowy", "%"], "rates.sick_pregnancy": ["Chorobowy w ciąży", "%"],
  "rates.maternity": ["Macierzyński", "%"], "rates.supplementary": ["Uzupełniający", "%"],
  "rates.paternity": ["Ojcowski", "%"], "rates.job_loss": ["Po likwidacji pracodawcy (art. 30 ust. 3)", "%"],
  "rates.parental": ["Rodzicielski", "%"], "rates.averaged": ["Wariant uśredniony", "%"], "rates.care": ["Opiekuńczy", "%"],
  "rates.rehab_first_period": ["Rehabilitacyjne, pierwszy okres", "%"], "rates.rehab": ["Rehabilitacyjne, dalej", "%"],
  "rates.rehab_pregnancy": ["Rehabilitacyjne w ciąży", "%"],
  "rehab.first_period_days": ["Pierwszy okres (wyższa stawka)", "dni"], "rehab.max_months": ["Najdłużej", "mies."],
  "sick.employer_days": ["Wynagrodzenie chorobowe od pracodawcy", "dni"],
  "sick.employer_days_50plus": ["… od 50. roku życia", "dni"], "sick.period_days": ["Okres zasiłkowy", "dni"],
  "sick.period_days_pregnancy": ["Okres zasiłkowy w ciąży", "dni"],
  "sick.period_days_after_insurance": ["Po ustaniu ubezpieczenia", "dni"],
  "sick.waiting_days_mandatory": ["Okres wyczekiwania, ubezpieczenie obowiązkowe", "dni"],
  "sick.waiting_days_voluntary": ["Okres wyczekiwania, ubezpieczenie dobrowolne", "dni"],
  "sick.break_days_same_period": ["Przerwa, po której okres zasiłkowy liczy się od nowa", "dni"],
  "maternity.weeks_by_children": ["Wymiar przy 1, 2, 3, 4, 5+ dzieciach", "tyg."],
  "maternity.prebirth_max_weeks": ["Najwięcej przed porodem", "tyg."],
  "maternity.mother_personal_weeks": ["Mama wykorzystuje sama po porodzie", "tyg."],
  "maternity.mother_personal_weeks_incapacity": ["… przy orzeczeniu o niezdolności", "tyg."],
  "maternity.stillbirth_weeks": ["Przy martwym urodzeniu lub zgonie dziecka", "tyg."],
  "maternity.after_death_min_days": ["Najmniej od zgonu dziecka", "dni"],
  "maternity.adoption_min_weeks": ["Najmniej przy przyjęciu dziecka", "tyg."],
  "maternity.pregnancy_weeks": ["Czas trwania ciąży (do oceny ryzyk)", "tyg."],
  "parental.weeks_single": ["Jedno dziecko", "tyg."], "parental.weeks_multiple": ["Więcej dzieci", "tyg."],
  "parental.weeks_za_zyciem_single": ["„Za życiem”, jedno dziecko", "tyg."],
  "parental.weeks_za_zyciem_multiple": ["„Za życiem”, więcej dzieci", "tyg."],
  "parental.exclusive_weeks": ["Wyłącznie dla każdego z rodziców", "tyg."], "parental.max_parts": ["Najwięcej części", "części"],
  "parental.last_child_age_years": ["Do końca roku, w którym dziecko kończy", "lat"],
  "parental.part_time_max_fraction": ["Praca w trakcie urlopu najwyżej (część etatu)", "%"],
  "parental.part_time_cap_weeks_single": ["Urlop wydłużony pracą, jedno dziecko", "tyg."],
  "parental.part_time_cap_weeks_multiple": ["… więcej dzieci", "tyg."],
  "parental.part_time_cap_weeks_za_zyciem_single": ["… „Za życiem”, jedno dziecko", "tyg."],
  "parental.part_time_cap_weeks_za_zyciem_multiple": ["… „Za życiem”, więcej dzieci", "tyg."],
  "paternity.days": ["Wymiar", "dni"], "paternity.min_part_days": ["Najkrótsza część", "dni"],
  "paternity.max_parts": ["Najwięcej części", "części"], "paternity.use_by_child_months": ["Do ukończenia przez dziecko", "mies."],
  "paternity.notice_days": ["Wniosek z wyprzedzeniem", "dni"],
  "supplementary.extreme.before_pregnancy_week": ["Poród przed tygodniem ciąży", "tydz."],
  "supplementary.extreme.max_weight_g": ["albo masa urodzeniowa najwyżej", "g"],
  "supplementary.extreme.cap_weeks": ["Najwięcej", "tyg."],
  "supplementary.preterm.before_pregnancy_week": ["Poród przed tygodniem ciąży", "tydz."],
  "supplementary.preterm.cap_weeks": ["Najwięcej", "tyg."],
  "supplementary.term.min_stay_days": ["Najkrótszy pobyt dziecka w szpitalu", "dni"],
  "supplementary.term.window_from_day": ["Pobyt liczony od dnia życia", "dzień"],
  "supplementary.term.window_to_day": ["… do dnia życia", "dzień"], "supplementary.term.cap_weeks": ["Najwięcej", "tyg."],
  "deadlines.averaged_request_days_after_birth": ["Wniosek o 81,5% najpóźniej po porodzie", "dni"],
  "deadlines.parental_notice_days": ["Wniosek o rodzicielski z wyprzedzeniem", "dni"],
  "deadlines.part_time_notice_days": ["Wniosek o pracę w trakcie rodzicielskiego z wyprzedzeniem", "dni"],
  "deadlines.supplementary_notice_days_before_maternity_end": ["Wniosek o uzupełniający przed końcem macierzyńskiego", "dni"],
  "deadlines.maternity_resign_notice_days": ["Rezygnacja mamy z części macierzyńskiego przed powrotem", "dni"],
  "deadlines.maternity_takeover_notice_days": ["Wniosek taty o resztę macierzyńskiego z wyprzedzeniem", "dni"],
  "care.days_per_year_child_under_14": ["Rocznie na dziecko do 14 lat", "dni"],
  "care.days_per_year_other": ["Rocznie na innego członka rodziny", "dni"],
  "game.round_offsets_days": ["Początki rund względem porodu", "dni"],
  "game.budget_target_ratio": ["Cel budżetu (część dochodu bez urlopów)", "%"],
};
const percent = (v: string) => `${(Number(v) * 100).toLocaleString("pl-PL", { maximumFractionDigits: 4 })}%`;

function setIn(tree: Tree, keys: string[], value: Value): Tree {
  const [head, ...rest] = keys;
  return { ...tree, [head]: rest.length ? setIn(tree[head] as Tree, rest, value) : value };
}

// Legal parameters, edited as a typed form. Each save is a new version from its "Obowiązuje od" date;
// the backend validates every field before storing, and the calculator uses the version in force on the event date.
export default function AdminParams() {
  const [params, setParams] = useState<Tree>();
  const [versions, setVersions] = useState<S["ConfigVersion"][]>([]);
  const [out, setOut] = useState<{ data?: unknown; error?: unknown }>({});

  const load = async () => {
    const [p, v] = await Promise.all([api.GET("/api/v1/admin/params", { headers: adminHeaders() }),
      api.GET("/api/v1/admin/params/versions", { headers: adminHeaders() })]);
    if (p.error) return setOut({ error: p.error });
    setParams(p.data as unknown as Tree); setVersions(v.data ?? []); setOut({});
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- load once with the stored token

  const save = async () => {
    const result = await api.PUT("/api/v1/admin/params", { headers: adminHeaders(), body: params as never });
    setOut(result);
    if (result.data) void api.GET("/api/v1/admin/params/versions", { headers: adminHeaders() }).then(({ data }) => setVersions(data ?? []));
  };

  return (
    <>
      <PageHeader title="Parametry prawne">
        Edycja obowiązujących stawek zasiłków i wymiarów urlopów z zapisem nowych wersji według daty wejścia w życie.
      </PageHeader>
      <div className="actions">
        <button className="button" onClick={load}>Wczytaj</button>
        <button className="button button-primary" onClick={save} disabled={!params}>Zapisz nową wersję</button>
      </div>
      {(out.data || out.error) ? <ApiResult {...out} /> : null}
      {versions.length > 0 && <p className="muted">Wersje: {versions.map((v) => `${v.version} (od ${day(v.effective_from)})`).join(" · ")}</p>}
      {params && <div className="stack">
        <fieldset className="form-section"><legend>Ogólne</legend><div className="form-grid">
          {Object.entries(params).filter(([, v]) => typeof v !== "object" || Array.isArray(v)).map(([k, v]) =>
            <Field key={k} path={k} value={v} onChange={(nv) => setParams(setIn(params, [k], nv))} />)}
        </div></fieldset>
        {Object.entries(params).filter(([, v]) => typeof v === "object" && !Array.isArray(v)).map(([k, v]) =>
          <Group key={k} path={k} tree={v as Tree} onChange={(keys, nv) => setParams(setIn(params, [k, ...keys], nv))} />)}
      </div>}
    </>
  );
}

function Group({ path, tree, onChange }: { path: string; tree: Tree; onChange: (keys: string[], v: Value) => void }) {
  return (
    <fieldset className="form-section"><legend>{GROUPS[path] ?? path}</legend><div className="form-grid">
      {Object.entries(tree).map(([k, v]) => typeof v === "object" && !Array.isArray(v)
        ? <Group key={k} path={`${path}.${k}`} tree={v} onChange={(keys, nv) => onChange([k, ...keys], nv)} />
        : <Field key={k} path={`${path}.${k}`} value={v} onChange={(nv) => onChange([k], nv)} />)}
    </div></fieldset>
  );
}

function Field({ path, value, onChange }: { path: string; value: Value; onChange: (v: Value) => void }) {
  const [label, unit] = FIELDS[path] ?? [path, ""];
  // keep each value's JSON type: integers stay numbers, decimals stay strings, lists stay lists
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  const parse = (raw: string): Value => Array.isArray(value) ? raw.split(",").map((x) => Number(x.trim()))
    : typeof value === "number" && raw.trim() !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
  return (
    <label className="field">{label}{unit && unit !== "%" && ` (${unit})`}
      <input type={path === "effective_from" ? "date" : "text"} inputMode={Array.isArray(value) ? "text" : "decimal"}
        value={text} onChange={(e) => onChange(parse(e.target.value))} />
      {unit === "%" && <small className="muted">{percent(text)}</small>}
    </label>
  );
}
