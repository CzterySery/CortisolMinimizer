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

// Round 1 of the decision tree reuses 1A/1B/1D only as carriers for the family situation (birth, adoption,
// foster care). The situation sets which rules apply, not a money/time trade-off, so all three move the
// balance identically (not at all) instead of inheriting the unrelated profiles of the base cards.
function situationSignals(card: Card): CardSignals {
  const neutral = signal(0, "", "");
  const situation = card.tags?.[2];
  const what = situation === "adoption" ? "przysposobienie dziecka"
    : situation === "foster" ? "przyjęcie dziecka do niezawodowej rodziny zastępczej" : "urodzenie dziecka";
  return {
    money: neutral, time: neutral, knowledge: neutral,
    comparison: `Wybór sytuacji rodziny (${what}) względem pozostałych dwóch sytuacji w pierwszej rundzie.`,
    period: "cały plan — sytuacja ustala zasady dla kolejnych rund",
    moneyReason: "Sama sytuacja rodziny nie oznacza wypłaty ani jej wysokości. Kwota zależy od podstawy wymiaru i wariantu wypłaty wybranego w kolejnych rundach, dlatego pasek pieniędzy się nie zmienia.",
    timeReason: "Sytuacja nie dodaje ani nie zużywa dni urlopu. Wymiar urlopów i limity wieku dziecka wynikają z tej sytuacji, ale wykorzystanie czasu planujesz w kolejnych rundach, dlatego pasek czasu się nie zmienia.",
    knowledgeReason: "",
    later: "Kolejne pytania, limity wieku dziecka i wymagane dokumenty dopasujemy do wybranej sytuacji.",
    ruleIds: situation === "birth" || !situation
      ? ["maternity-pool", "parental-pool", "paternity", "insured-parent"]
      : ["adoption", "maternity-pool", "parental-pool", "paternity", "insured-parent"],
    conditions: situation === "adoption"
      ? "Przyjęcie dziecka na wychowanie i złożenie wniosku o przysposobienie w sądzie opiekuńczym; urlop przysługuje do ukończenia przez dziecko 14 lat. Wymagany tytuł do ubezpieczenia chorobowego."
      : situation === "foster"
        ? "Niezawodowa rodzina zastępcza; dziecko do 7 lat, a przy odroczeniu obowiązku szkolnego do 10 lat. Wymagany tytuł do ubezpieczenia chorobowego."
        : "Ścieżka urodzenia: spodziewany lub niedawny poród. Wymagany tytuł do ubezpieczenia chorobowego (umowa o pracę, zlecenie lub JDG z dobrowolnym chorobowym).",
  };
}

export function getCardSignals(card?: Card): CardSignals | undefined {
  if (!card?.design) return undefined; // Old API IDs can have different meanings.
  if (card.tags?.[3] === "sytuacja") return situationSignals(card);
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
