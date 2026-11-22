import type { Card } from "@/types/game";
import audit from "../../../shared/card-impacts.json" with { type: "json" };

export type Direction = "up" | "down" | "same" | "depends";
export interface CardSignal { label: string; direction: Direction; emphasis: number }
export interface CardSignals {
  money: CardSignal;
  time: CardSignal;
  knowledge: CardSignal;
  comparison: string;
  period: string;
  moneyReason: string;
  timeReason: string;
  knowledgeReason: string;
  later: string;
  ruleIds: string[];
  /** Overrides the base card's conditions/rules when the card is a round-1 situation carrier. */
  conditions?: string;
}

// Illustrative game weights, never amounts, days or legal parameters.
const profiles: Record<string, "leave" | "partial" | "reserve" | "learn" | "payment" | "application" | "transfer" | "work"> = {
  "1A": "leave", "1B": "leave", "1C": "learn", "1D": "learn", "1E": "learn", "1F": "learn",
  "2A": "leave", "2B": "partial", "2C": "reserve", "2D": "learn", "2E": "learn", "2F": "learn",
  "3A": "payment", "3B": "application", "3C": "transfer", "3D": "learn", "3E": "learn", "3F": "learn",
  "4A": "leave", "4B": "leave", "4C": "work", "4D": "reserve", "4E": "leave", "4F": "leave",
  "5A": "leave", "5B": "leave", "5C": "work", "5D": "leave", "5E": "leave", "5F": "leave",
};
const effects = {
  leave: [2, 3, 0], partial: [1, 1, 0], reserve: [0, -1, 1], learn: [0, -1, 3],
  payment: [3, 0, 0], application: [3, -1, 1], transfer: [1, 1, 0], work: [3, -2, 0],
} as const;
function signal(emphasis: number, up: string, down: string): CardSignal {
  return { emphasis, direction: emphasis > 0 ? "up" : emphasis < 0 ? "down" : "same",
    label: emphasis > 0 ? up : emphasis < 0 ? down : "Bez zmiany" };
}

// Rounds 1–2 of the decision tree reuse deck cards (1A/1B/1D, 2A–2C) only as carriers for the family situation
// and its stage. These set which rules apply, not a money/time trade-off, so they leave the balance unchanged
// and show their own conditions and rules instead of the unrelated base card's (keyed by the tree's branch tag).
const SITUATIONS: Record<string, { what: string; conditions: string; ruleIds: string[] }> = {
  birth: { what: "urodzenie dziecka", ruleIds: ["maternity-pool", "parental-pool", "paternity", "insured-parent"],
    conditions: "Ścieżka urodzenia: spodziewany lub niedawny poród. Wymagany tytuł do ubezpieczenia chorobowego (umowa o pracę, zlecenie lub JDG z dobrowolnym chorobowym)." },
  adoption: { what: "przysposobienie dziecka", ruleIds: ["adoption", "maternity-pool", "parental-pool", "paternity", "insured-parent"],
    conditions: "Przyjęcie dziecka na wychowanie i złożenie wniosku o przysposobienie w sądzie opiekuńczym; urlop przysługuje do ukończenia przez dziecko 14 lat. Wymagany tytuł do ubezpieczenia chorobowego." },
  foster: { what: "przyjęcie dziecka do niezawodowej rodziny zastępczej", ruleIds: ["adoption", "maternity-pool", "parental-pool", "paternity", "insured-parent"],
    conditions: "Niezawodowa rodzina zastępcza; dziecko do 7 lat, a przy odroczeniu obowiązku szkolnego do 10 lat. Wymagany tytuł do ubezpieczenia chorobowego." },
  planning_pregnancy: { what: "planowanie ciąży", ruleIds: ["insured-parent", "sick-right", "prebirth"],
    conditions: "Zasiłek macierzyński wymaga tytułu do ubezpieczenia chorobowego w dniu porodu. Zasiłek chorobowy w ciąży przysługuje dopiero po okresie wyczekiwania, dłuższym przy dobrowolnym ubezpieczeniu." },
  about_to_birth: { what: "zbliżający się poród", ruleIds: ["prebirth", "maternity-pool", "birth-docs"],
    conditions: "Pracownica może zacząć część urlopu macierzyńskiego przed przewidywaną datą porodu na podstawie zaświadczenia lekarskiego; pozostała część przypada po porodzie." },
  already_born: { what: "dziecko już urodzone", ruleIds: ["maternity-pool", "averaged", "paternity", "parental-pool"],
    conditions: "Po porodzie liczą się terminy: wniosek o wariant uśredniony, termin urlopu ojcowskiego i wnioski o urlop rodzicielski składane z wyprzedzeniem." },
  adoption_under_7: { what: "przysposobienie młodszego dziecka", ruleIds: ["adoption", "maternity-pool", "parental-pool"],
    conditions: "Przysposobienie dziecka przed ukończeniem 7 lat: urlop na warunkach macierzyńskiego i rodzicielski w pełnym wymiarze, licząc od przyjęcia dziecka." },
  adoption_under_14: { what: "przysposobienie starszego dziecka", ruleIds: ["adoption", "maternity-pool", "parental-pool"],
    conditions: "Przysposobienie dziecka w wieku od 7 do 14 lat: urlop na warunkach macierzyńskiego i rodzicielski w krótszym wymiarze, licząc od przyjęcia dziecka." },
  adoption_pending: { what: "przygotowanie do przysposobienia", ruleIds: ["adoption", "paternity", "insured-parent"],
    conditions: "Uprawnienia zaczynają się od przyjęcia dziecka na wychowanie i wystąpienia do sądu o przysposobienie; termin urlopu ojcowskiego liczy się od uprawomocnienia przysposobienia." },
  foster_under_7: { what: "piecza nad dzieckiem do 7 lat", ruleIds: ["adoption", "maternity-pool", "parental-pool"],
    conditions: "Niezawodowa rodzina zastępcza przyjmuje dziecko przed ukończeniem 7 lat; urlop na warunkach macierzyńskiego liczy się od przyjęcia dziecka." },
  foster_school_deferral: { what: "piecza z odroczeniem obowiązku szkolnego", ruleIds: ["adoption", "maternity-pool", "parental-pool"],
    conditions: "Przy odroczonym obowiązku szkolnym niezawodowa rodzina zastępcza może przyjąć dziecko do 10 lat; potrzebna decyzja o odroczeniu." },
  foster_za_zyciem: { what: "piecza nad dzieckiem z zaświadczeniem „Za życiem”", ruleIds: ["adoption", "za-zyciem", "parental-pool"],
    conditions: "Zaświadczenie „Za życiem” wydłuża wymiar urlopu rodzicielskiego, ale nie przydziela automatycznie wszystkich tygodni ani nie znosi części wyłącznych rodziców." },
};

function situationSignals(card: Card): CardSignals {
  const neutral = signal(0, "", "");
  const { what, conditions, ruleIds } = SITUATIONS[card.tags?.[2] ?? ""] ?? SITUATIONS.birth;
  const stage = card.tags?.[3] !== "sytuacja";
  return {
    money: neutral, time: neutral, knowledge: neutral,
    comparison: stage ? `Etap sytuacji rodziny (${what}) względem pozostałych dwóch etapów w tej rundzie.`
      : `Wybór sytuacji rodziny (${what}) względem pozostałych dwóch sytuacji w pierwszej rundzie.`,
    period: "cały plan — sytuacja ustala zasady dla kolejnych rund",
    moneyReason: "Sama sytuacja rodziny nie oznacza wypłaty ani jej wysokości. Kwota zależy od podstawy wymiaru i wariantu wypłaty wybranego w kolejnych rundach, dlatego pasek pieniędzy się nie zmienia.",
    timeReason: "Sytuacja nie dodaje ani nie zużywa dni urlopu. Wymiar urlopów i limity wieku dziecka wynikają z tej sytuacji, ale wykorzystanie czasu planujesz w kolejnych rundach, dlatego pasek czasu się nie zmienia.",
    knowledgeReason: "",
    later: "Kolejne pytania, limity wieku dziecka i wymagane dokumenty dopasujemy do wybranej sytuacji.",
    ruleIds, conditions,
  };
}

export function getCardSignals(card?: Card): CardSignals | undefined {
  if (!card?.design) return undefined; // Old API IDs can have different meanings.
  if (card.tags?.[3] === "sytuacja" || (card.id.startsWith("2") && SITUATIONS[card.tags?.[2] ?? ""])) return situationSignals(card);
  const impact = audit.cards.find((item) => item.id === card.id);
  if (!impact) return undefined;
  const profile = profiles[card.id];
  if (!profile) return undefined;
  const [money, time, knowledge] = effects[profile];
  const moneyReason = money > 0
    ? "Pasek rośnie za zaplanowane świadczenie lub wybór jego wypłaty. Symbolizuje wsparcie finansowe, nie wyższy dochód niż pensja."
    : "Sama nauka lub rezerwacja urlopu nie oznacza wypłaty, więc nie zwiększa paska pieniędzy.";
  const timeReason = profile === "learn" || profile === "application"
    ? "Poznanie zasad i przygotowanie formalności wymaga chwili uwagi, więc wizualnie kosztuje odrobinę czasu. Nie zużywa dni urlopu."
    : profile === "reserve" ? "Odkładasz wolne na później. Teraz pasek lekko maleje; rezerwacja sama nie daje urlopu."
    : profile === "work" ? "Praca podczas urlopu zostawia mniej wolnego czasu na co dzień, choć okres urlopu może się wydłużyć."
    : time > 0 ? "Pasek rośnie za zaplanowane wolne lub czas na opiekę. Podział i przekazanie dni nie tworzą dodatkowej puli ustawowej."
    : "Sam wybór sposobu wypłaty nie dodaje wolnego czasu.";
  return {
    money: signal(money, "Wsparcie finansowe", "Mniej wsparcia"),
    time: signal(time, "Więcej czasu", "Mniej czasu teraz"),
    knowledge: signal(knowledge, "Większa wiedza", "Mniej wiedzy"),
    comparison: impact.comparison, period: impact.period,
    moneyReason: `${moneyReason} ${impact.money_reason}`, timeReason: `${timeReason} ${impact.time_reason}`,
    knowledgeReason: knowledge > 0 ? "Poznajesz zasady, formalności lub planowanie terminów. To wiedza w grze, a nie uzyskanie uprawnienia czy złożenie wniosku."
      : "Ta karta skupia się na wykorzystaniu urlopu lub świadczenia, więc nie podnosi paska wiedzy.",
    later: impact.later, ruleIds: impact.rule_ids,
  };
}
