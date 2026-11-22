import type { Card, Round } from "@/types/game";
import type { S } from "@/lib/api";

export type StrategyId = "kortyzol" | "zasilki" | "aura" | "sytuacja";

export interface StrategyInfo {
  id: StrategyId;
  name: string;
  badge: string;
  shortDesc: string;
}

export const STRATEGIES: StrategyInfo[] = [
  {
    id: "kortyzol",
    name: "Kortyzol Minimizer",
    badge: "🧘 Kortyzol Minimizer",
    shortDesc: "Więcej czasu z dzieckiem i spokojna opieka.",
  },
  {
    id: "zasilki",
    name: "Zasiłki Maxxxing",
    badge: "💰 Zasiłki Maxxxing",
    shortDesc: "Więcej środków w rodzinnym budżecie.",
  },
  {
    id: "aura",
    name: "Balans Farming",
    badge: "✨ Balans Farming",
    shortDesc: "Równowaga i partnerski podział opieki.",
  },
];

export interface DecisionNodeSpec {
  cardId: string;
  branchTag: string;
  strategyId: StrategyId;
  strategyBadge: string;
  badge: string;
  title: string;
  description: string;
  recommendedKnowledgeIds: string[];
}

// Round 1: Mutually exclusive family situation (no strategy tags before first choice is made)
const ROUND_1_NODES: DecisionNodeSpec[] = [
  {
    cardId: "1A",
    branchTag: "birth",
    strategyId: "sytuacja",
    strategyBadge: "",
    badge: "Sytuacja · Narodziny",
    title: "Urodzenie dziecka",
    description:
      "Spodziewamy się narodzin dziecka lub właśnie zostaliśmy rodzicami. Planujemy urlop macierzyński (20 tyg.), ojcowski (14 dni) oraz rodzicielski (41 tyg.).",
    recommendedKnowledgeIds: ["1C", "1E", "2F"],
  },
  {
    cardId: "1B",
    branchTag: "adoption",
    strategyId: "sytuacja",
    strategyBadge: "",
    badge: "Sytuacja · Adopcja",
    title: "Adopcja (przysposobienie)",
    description:
      "Przyjmujemy dziecko na wychowanie i występujemy do sądu opiekuńczego. Korzystamy z urlopu na warunkach macierzyńskiego i rodzicielskiego (do 14. roku życia).",
    recommendedKnowledgeIds: ["1D", "2E", "3D"],
  },
  {
    cardId: "1D",
    branchTag: "foster",
    strategyId: "sytuacja",
    strategyBadge: "",
    badge: "Sytuacja · Piecza zastępcza",
    title: "Rodzina zastępcza niezawodowa",
    description:
      "Tworzymy niezawodową rodzinę zastępczą. Przysługuje nam zasiłek i urlop na warunkach macierzyńskiego oraz rodzicielski do 7. roku życia (lub 10. przy odroczeniu).",
    recommendedKnowledgeIds: ["1D", "1F", "3D"],
  },
];

// Round 2: Mutually exclusive stage / timing based on Round 1 choice
const ROUND_2_BY_SITUATION: Record<string, { question: string; subtitle: string; nodes: DecisionNodeSpec[] }> = {
  birth: {
    question: "Na jakim etapie oczekiwania na dziecko jesteście?",
    subtitle: "Wybierzcie Wasz obecny moment — dopasujemy start urlopu oraz podpowiemy strategię.",
    nodes: [
      {
        cardId: "2C",
        branchTag: "already_born",
        strategyId: "aura",
        strategyBadge: "✨ Balans Farming",
        badge: "Etap · Dziecko już na świecie",
        title: "Dziecko już się urodziło",
        description:
          "Macierzyński trwa od dnia porodu (całe 20 tygodni po narodzinach). Tata rezerwuje 14 dni urlopu ojcowskiego na dogodny moment przed 1. urodzinami.",
        recommendedKnowledgeIds: ["2F", "2E", "3F"],
      },
      {
        cardId: "2A",
        branchTag: "about_to_birth",
        strategyId: "kortyzol",
        strategyBadge: "🧘 Kortyzol Minimizer",
        badge: "Etap · Poród lada dzień",
        title: "Tuż przed porodem — wspólny start w domu",
        description:
          "Szykujemy się na poród: tata bierze pełne 14 dni urlopu ojcowskiego (100%) od razu po narodzinach, by przez pierwsze dwa tygodnie być razem z mamą i dzieckiem.",
        recommendedKnowledgeIds: ["2D", "2E", "2F"],
      },
      {
        cardId: "2B",
        branchTag: "planning_pregnancy",
        strategyId: "zasilki",
        strategyBadge: "💰 Zasiłki Maxxxing",
        badge: "Etap · Planowanie lub początek ciąży",
        title: "Planujemy ciążę lub jesteśmy na początku",
        description:
          "Planujemy z wyprzedzeniem: sprawdzamy chorobowe 100% w ciąży i podstawę zasiłku z 12 miesięcy, a ojcowski dzielimy elastycznie na 2 części po 7 dni.",
        recommendedKnowledgeIds: ["1C", "1E", "1F"],
      },
    ],
  },
  adoption: {
    question: "Na jakim etapie adopcji i w jakim wieku jest dziecko?",
    subtitle: "Wiek dziecka oraz moment złożenia wniosku do sądu opiekuńczego decydują o wymiarze urlopu i terminach ZUS.",
    nodes: [
      {
        cardId: "2A",
        branchTag: "adoption_under_7",
        strategyId: "kortyzol",
        strategyBadge: "🧘 Kortyzol Minimizer",
        badge: "Adopcja · Dziecko do 7 lat",
        title: "Przyjęliśmy młodsze dziecko (do 7. roku życia)",
        description:
          "Przysługuje pełny wymiar 20 tygodni urlopu na warunkach macierzyńskiego, 41 tygodni rodzicielskiego oraz 14 dni ojcowskiego od uprawomocnienia sądu.",
        recommendedKnowledgeIds: ["2E", "3D", "3F"],
      },
      {
        cardId: "2B",
        branchTag: "adoption_under_14",
        strategyId: "aura",
        strategyBadge: "✨ Balans Farming",
        badge: "Adopcja · Dziecko 7–14 lat",
        title: "Przyjęliśmy starsze dziecko (do 14. roku życia)",
        description:
          "Korzystamy z urlopu przed ukończeniem przez dziecko 14 lat (w tym gwarantowanego minimalnego wymiaru 9 tygodni urlopu na warunkach macierzyńskiego).",
        recommendedKnowledgeIds: ["2E", "3D", "1D"],
      },
      {
        cardId: "2C",
        branchTag: "adoption_pending",
        strategyId: "zasilki",
        strategyBadge: "💰 Zasiłki Maxxxing",
        badge: "Adopcja · Przed wnioskiem sądowym",
        title: "Przygotowujemy się do przyjęcia dziecka",
        description:
          "Kompletujemy wniosek do sądu opiekuńczego i weryfikujemy podstawę wymiaru zasiłku. Urlop ojcowski (14 dni) rezerwujemy na czas po uprawomocnieniu sądu.",
        recommendedKnowledgeIds: ["1E", "2F", "3D"],
      },
    ],
  },
  foster: {
    question: "Jak wygląda sytuacja dziecka w rodzinie zastępczej?",
    subtitle: "W niezawodowej rodzinie zastępczej długość urlopu zależy od wieku dziecka oraz ewentualnego odroczenia szkolnego.",
    nodes: [
      {
        cardId: "2A",
        branchTag: "foster_under_7",
        strategyId: "kortyzol",
        strategyBadge: "🧘 Kortyzol Minimizer",
        badge: "Piecza · Dziecko do 7 lat",
        title: "Przyjęcie dziecka do 7. roku życia",
        description:
          "Pełna pula 20 tygodni urlopu na warunkach macierzyńskiego oraz do 41 tygodni urlopu rodzicielskiego od dnia przyjęcia dziecka w rodzinie zastępczej.",
        recommendedKnowledgeIds: ["2E", "3D", "3F"],
      },
      {
        cardId: "2B",
        branchTag: "foster_school_deferral",
        strategyId: "aura",
        strategyBadge: "✨ Balans Farming",
        badge: "Piecza · Odroczenie szkolne (do 10 lat)",
        title: "Dziecko z odroczeniem obowiązku szkolnego",
        description:
          "Dzięki decyzji o odroczeniu obowiązku szkolnego prawo do urlopu na warunkach macierzyńskiego i rodzicielskiego trwa do ukończenia przez dziecko 10 lat.",
        recommendedKnowledgeIds: ["2E", "3D", "1D"],
      },
      {
        cardId: "2C",
        branchTag: "foster_za_zyciem",
        strategyId: "zasilki",
        strategyBadge: "💰 Zasiłki Maxxxing",
        badge: "Piecza · Dodatkowe wsparcie",
        title: "Dziecko w pieczy z zaświadczeniem „Za życiem”",
        description:
          "Korzystamy z wydłużonego wymiaru urlopu rodzicielskiego (aż do 62–65 tygodni płatnej opieki) przysługującego rodzinie zastępczej z ustawy „Za życiem”.",
        recommendedKnowledgeIds: ["3E", "2D", "3D"],
      },
    ],
  },
};

// Round 3: Tailored by Round 1 & Round 2 so foster/adoption never see irrelevant birth-only copy
function getRound3Branch(situationKey: string, r2Id: string): { question: string; subtitle: string; nodes: DecisionNodeSpec[] } {
  if (situationKey === "foster") {
    const limitLabel = r2Id === "2B" ? "10. roku życia (odroczenie szkolne)" : "7. roku życia";
    return {
      question: "Jak chcecie pobierać zasiłek i podzielić pierwsze miesiące w rodzinie zastępczej?",
      subtitle: `W pieczy zastępczej (do ${limitLabel}) zasiłek przysługuje od dnia przyjęcia dziecka na wychowanie.`,
      nodes: [
        {
          cardId: "3B",
          branchTag: "foster_want_balance",
          strategyId: "kortyzol",
          strategyBadge: "🧘 Kortyzol Minimizer",
          badge: "Piecza · Stałe 81,5% przez cały okres",
          title: "Równe 81,5% zasiłku od przyjęcia dziecka (Spokój)",
          description:
            "W ciągu 21 dni od przyjęcia dziecka składamy wniosek o uśrednioną stawkę 81,5% podstawy przez cały urlop na warunkach macierzyńskiego i rodzicielski.",
          recommendedKnowledgeIds: ["3F", "2E", "3D"],
        },
        {
          cardId: "3A",
          branchTag: "foster_want_cash",
          strategyId: "zasilki",
          strategyBadge: "💰 Zasiłki Maxxxing",
          badge: "Piecza · 100% na start, 70% później",
          title: "100% zasiłku po przyjęciu dziecka, 70% na rodzicielskim",
          description:
            "Przez pierwsze tygodnie urlopu na warunkach macierzyńskiego pobieramy pełne 100% zasiłku, co daje najwyższe wsparcie finansowe na starcie pieczy zastępczej.",
          recommendedKnowledgeIds: ["3F", "1E", "1D"],
        },
        {
          cardId: "3C",
          branchTag: "foster_want_shared",
          strategyId: "aura",
          strategyBadge: "✨ Balans Farming",
          badge: "Piecza · Podział między opiekunów",
          title: "Przekazanie części urlopu drugiemu rodzicowi zastępczemu",
          description:
            "Pierwszy opiekun wykorzystuje pierwsze 14 tygodni po przyjęciu dziecka i wraca do pracy, a drugi rodzic zastępczy przejmuje resztę puli z zasiłkiem 100%.",
          recommendedKnowledgeIds: ["3D", "2E", "1F"],
        },
      ],
    };
  }

  if (situationKey === "adoption") {
    const isOlder = r2Id === "2B";
    return {
      question: "Jaki wariant wypłaty zasiłku i podziału opieki wybieracie po adopcji?",
      subtitle: isOlder
        ? "Przy adopcji starszego dziecka (7–14 lat) kluczowe jest wykorzystanie puli przed 14. urodzinami i złożenie wniosku w 21 dni od przyjęcia."
        : "Termin 21 dni na wniosek o stawkę 81,5% biegnie od przyjęcia dziecka na wychowanie i wystąpienia do sądu opiekuńczego.",
      nodes: [
        {
          cardId: "3B",
          branchTag: "adoption_want_balance",
          strategyId: "kortyzol",
          strategyBadge: "🧘 Kortyzol Minimizer",
          badge: "Adopcja · Stałe 81,5% przez cały okres",
          title: "Stałe 81,5% zasiłku na czas budowania więzi",
          description:
            "Składamy jeden wniosek w ciągu 21 dni od przyjęcia dziecka i wniosku do sądu — otrzymujemy równe 81,5% podstawy bez spadku dochodu w drugiej części urlopu.",
          recommendedKnowledgeIds: ["3F", "2E", "3D"],
        },
        {
          cardId: "3A",
          branchTag: "adoption_want_cash",
          strategyId: "zasilki",
          strategyBadge: "💰 Zasiłki Maxxxing",
          badge: "Adopcja · 100% na start, 70% później",
          title: "100% zasiłku w pierwszym okresie po przyjęciu dziecka",
          description:
            "Pobieramy 100% podstawy przez cały urlop na warunkach macierzyńskiego, a za urlop rodzicielski 70% — maksymalizujemy gotówkę od pierwszego dnia adopcji.",
          recommendedKnowledgeIds: ["3F", "1E", "1D"],
        },
        {
          cardId: "3C",
          branchTag: "adoption_want_shared",
          strategyId: "aura",
          strategyBadge: "✨ Balans Farming",
          badge: "Adopcja · Zmiana warty rodziców",
          title: "Podział urlopu na warunkach macierzyńskiego po 14 tyg.",
          description:
            "Po pierwszych 14 tygodniach od przyjęcia dziecka pierwszy rodzic adopcyjny wraca do pracy, a drugi przejmuje pozostałe tygodnie z pełnym zasiłkiem 100%.",
          recommendedKnowledgeIds: ["3D", "2E", "1F"],
        },
      ],
    };
  }

  return {
    question: "Czego najbardziej potrzebujecie — spokoju (81,5%), gotówki na starcie (100%) czy szybkiej zmiany warty?",
    subtitle: "Wybierzcie strategię wypłaty zasiłku ZUS oraz podziału pierwszych 20 tygodni po narodzinach.",
    nodes: [
      {
        cardId: "3B",
        branchTag: "want_balance",
        strategyId: "kortyzol",
        strategyBadge: "🧘 Kortyzol Minimizer",
        badge: "Cel · Równowaga i przewidywalność",
        title: "Stałe 81,5% zasiłku przez cały rok (Spokój)",
        description:
          "Składamy jeden „długi wniosek” w ciągu 21 dni od porodu: przez cały macierzyński i rodzicielski otrzymujemy równą stawkę 81,5% bez spadku dochodu po 20 tygodniach.",
        recommendedKnowledgeIds: ["3F", "2E", "3D"],
      },
      {
        cardId: "3A",
        branchTag: "want_cash",
        strategyId: "zasilki",
        strategyBadge: "💰 Zasiłki Maxxxing",
        badge: "Cel · Maksimum gotówki na starcie",
        title: "100% zasiłku na początku, 70% później (Budżet)",
        description:
          "Przez pierwsze 20 tygodni pobieramy pełne 100% podstawy zasiłku, a za rodzicielski 70%. Daje to najwyższe wpływy w pierwszych miesiącach i pełną elastyczność.",
        recommendedKnowledgeIds: ["3F", "1E", "1D"],
      },
      {
        cardId: "3C",
        branchTag: "want_shared",
        strategyId: "aura",
        strategyBadge: "✨ Balans Farming",
        badge: "Cel · Szybki powrót mamy i podział",
        title: "Zmiana warty po 14 tygodniach (Kariera + Czas taty)",
        description:
          "Mama wykorzystuje obowiązkowe 14 tygodni po porodzie i wraca do pracy, a tata przejmuje pozostałe 6 tygodni macierzyńskiego z pełnym zasiłkiem 100%.",
        recommendedKnowledgeIds: ["3D", "2E", "1F"],
      },
    ],
  };
}

// Round 4: Tailored by Round 1 & Round 2 situation + Round 3 payout choice
function getRound4Branch(situationKey: string, r2Id: string, r3Id: string): { question: string; subtitle: string; nodes: DecisionNodeSpec[] } {
  const rateHint = r3Id === "3B" ? "ze stawką 81,5% (i 70% dla wyłącznych 9 tyg. drugiego rodzica)" : "ze stawką 70% podstawy wymiaru";

  if (situationKey === "foster") {
    const ageLimit = r2Id === "2B" ? "10. roku życia dziecka" : "7. roku życia dziecka";
    const poolWeeks = r2Id === "2C" ? "do 62–65 tygodni („Za życiem”)" : "do 38–41 tygodni";
    return {
      question: "Jak rozplanowujecie urlop rodzicielski w rodzinie zastępczej?",
      subtitle: `Macie do dyspozycji ${poolWeeks} urlopu rodzicielskiego (${rateHint}), które należy wykorzystać przed ukończeniem ${ageLimit}.`,
      nodes: [
        {
          cardId: "4A",
          branchTag: "foster_year_max_time",
          strategyId: "kortyzol",
          strategyBadge: "🧘 Kortyzol Minimizer",
          badge: "Piecza · Pełna sztafeta opiekunów",
          title: "Cały rodzicielski ciągiem + 9 tyg. drugiego opiekuna",
          description:
            `Wykorzystujemy pełną pulę rodzicielskiego bez przerwy na stabilizację dziecka w rodzinie zastępczej, w tym nieprzenoszalne 9 tygodni drugiego rodzica przed granicą ${ageLimit}.`,
          recommendedKnowledgeIds: ["3F", "2E", "3E"],
        },
        {
          cardId: "4C",
          branchTag: "foster_year_max_cash",
          strategyId: "zasilki",
          strategyBadge: "💰 Zasiłki Maxxxing",
          badge: "Piecza · Praca na część etatu + zasiłek",
          title: "Łączenie urlopu rodzicielskiego w pieczy z 1/2 etatu",
          description:
            `Łączymy urlop rodzicielski z pracą (do 1/2 etatu) — pobieramy jednocześnie wynagrodzenie i proporcjonalny zasiłek, wydłużając czas opieki przed ukończeniem ${ageLimit}.`,
          recommendedKnowledgeIds: ["1E", "1D", "3F"],
        },
        {
          cardId: "4D",
          branchTag: "foster_year_reserve",
          strategyId: "aura",
          strategyBadge: "✨ Balans Farming",
          badge: "Piecza · Rezerwa na adaptację",
          title: "Część rodzicielskiego teraz, rezerwa na szkołę/przedszkole",
          description:
            `Wykorzystujemy główny blok rodzicielskiego po przyjęciu dziecka, a 1–2 części zachowujemy w rezerwie do wykorzystania w trudniejszym momencie przed ukończeniem ${ageLimit}.`,
          recommendedKnowledgeIds: ["2E", "3D", "2D"],
        },
      ],
    };
  }

  if (situationKey === "adoption") {
    return {
      question: "Jak chcecie ułożyć urlop rodzicielski po przyjęciu dziecka do adopcji?",
      subtitle: `Urlop rodzicielski (${rateHint}, do 5 części) możecie wykorzystać aż do ukończenia przez dziecko 14. roku życia.`,
      nodes: [
        {
          cardId: "4A",
          branchTag: "adoption_year_max_time",
          strategyId: "kortyzol",
          strategyBadge: "🧘 Kortyzol Minimizer",
          badge: "Adopcja · Maksimum czasu na więź",
          title: "Pełna sztafeta rodziców adopcyjnych (32 + 9 tygodni)",
          description:
            "Wykorzystujemy całą pulę rodzicielskiego ciągiem bezpośrednio po pierwszym urlopie: najpierw pierwszy rodzic, a następnie 9 nieprzenoszalnych tygodni drugiego rodzica.",
          recommendedKnowledgeIds: ["3F", "2E", "3D"],
        },
        {
          cardId: "4C",
          branchTag: "adoption_year_max_cash",
          strategyId: "zasilki",
          strategyBadge: "💰 Zasiłki Maxxxing",
          badge: "Adopcja · Pensja + zasiłek",
          title: "Łączenie rodzicielskiego z pracą na część etatu",
          description:
            "Łączymy urlop rodzicielski z pracą (np. na 1/2 etatu). Zyskujemy wyższy comiesięczny budżet i proporcjonalnie wydłużamy okres urlopu (przed 14. urodzinami dziecka).",
          recommendedKnowledgeIds: ["1E", "1D", "3F"],
        },
        {
          cardId: "4D",
          branchTag: "adoption_year_reserve",
          strategyId: "aura",
          strategyBadge: "✨ Balans Farming",
          badge: "Adopcja · Zapas na edukację",
          title: "Główny blok teraz, rezerwa na adaptację szkolną",
          description:
            "Zostawiamy 1–2 części urlopu rodzicielskiego w rezerwie na moment zmiany przedszkola lub szkoły (do wykorzystania przed ukończeniem przez dziecko 14 lat).",
          recommendedKnowledgeIds: ["2E", "3D"],
        },
      ],
    };
  }

  return {
    question: "Jak chcecie rozegrać pierwszy rok życia dziecka i urlop rodzicielski?",
    subtitle: `Urlop rodzicielski (${rateHint}) obejmuje 41 tygodni, w tym 9 tygodni zarezerwowanych wyłącznie dla drugiego rodzica.`,
    nodes: [
      {
        cardId: "4A",
        branchTag: "year_max_time",
        strategyId: "kortyzol",
        strategyBadge: "🧘 Kortyzol Minimizer",
        badge: "Strategia · Maksimum czasu z dzieckiem",
        title: "Pełna sztafeta: 32 tygodnie mamy + 9 tygodni taty",
        description:
          "Wykorzystujemy całe 41 tygodni rodzicielskiego ciągiem w pierwszym roku: najpierw mama, a po niej tata bierze swoje nieprzenoszalne 9 tygodni wyłącznej opieki.",
        recommendedKnowledgeIds: ["3F", "2E", "3E"],
      },
      {
        cardId: "4C",
        branchTag: "year_max_cash",
        strategyId: "zasilki",
        strategyBadge: "💰 Zasiłki Maxxxing",
        badge: "Strategia · Maksimum domowego budżetu",
        title: "Łączenie rodzicielskiego z pracą na część etatu",
        description:
          "Łączymy urlop rodzicielski z pracą (np. na 1/2 etatu u swojego pracodawcy). Pobieramy jednocześnie pensję i proporcjonalny zasiłek, a urlop wydłuża się aż do 64 tygodni!",
        recommendedKnowledgeIds: ["1E", "1D", "3F"],
      },
      {
        cardId: "4D",
        branchTag: "year_balance_reserve",
        strategyId: "aura",
        strategyBadge: "✨ Balans Farming",
        badge: "Strategia · Elastyczny zapas na później",
        title: "Część rodzicielskiego teraz, rezerwa na żłobek",
        description:
          "Bierzemy główny blok rodzicielskiego w pierwszym roku, ale celowo zostawiamy 1–2 części w rezerwie do wykorzystania aż do końca roku, w którym dziecko kończy 6 lat.",
        recommendedKnowledgeIds: ["2E", "3D", "2D"],
      },
    ],
  };
}

// Round 5: Tailored by Round 1 & Round 2 situation + whether Round 4 exhausted the parental pool
function getRound5Branch(situationKey: string, r2Id: string, exhaustedParental: boolean): { question: string; subtitle: string; nodes: DecisionNodeSpec[] } {
  const ageBoundaryLabel =
    situationKey === "foster"
      ? r2Id === "2B"
        ? "przed ukończeniem 10. roku życia dziecka"
        : "przed ukończeniem 7. roku życia dziecka"
      : situationKey === "adoption"
        ? "przed ukończeniem 14. roku życia dziecka"
        : "do końca roku kalendarzowego, w którym dziecko kończy 6 lat";

  const placeLabel = situationKey === "birth" ? "w żłobku lub przedszkolu" : "w nowej placówce, przedszkolu lub szkole";

  if (!exhaustedParental) {
    return {
      question: `Jak wykorzystacie zachowaną rezerwę urlopu i zabezpieczycie adaptację ${placeLabel}?`,
      subtitle: `Zachowaną część urlopu rodzicielskiego możecie wykorzystać ${ageBoundaryLabel}.`,
      nodes: [
        {
          cardId: "5A",
          branchTag: "later_full_adaptation",
          strategyId: "kortyzol",
          strategyBadge: "🧘 Kortyzol Minimizer",
          badge: "Kolejne lata · Pełny miesiąc na adaptację",
          title: `Wolny miesiąc z rezerwy na spokojny start ${placeLabel}`,
          description:
            `Wykorzystujemy zachowaną część urlopu rodzicielskiego (${ageBoundaryLabel}) w jednym pełnym bloku, by bez stresu towarzyszyć dziecku w pierwszych tygodniach.`,
          recommendedKnowledgeIds: ["2E", "3D"],
        },
        {
          cardId: "5C",
          branchTag: "later_part_time_adaptation",
          strategyId: "zasilki",
          strategyBadge: "💰 Zasiłki Maxxxing",
          badge: "Kolejne lata · Pensja + krótsze dni pracy",
          title: "Adaptacja połączona z pracą na 1/2 etatu",
          description:
            `Ostatnią część urlopu rodzicielskiego łączymy z pracą na część etatu (${ageBoundaryLabel}) — zachowujemy wyższy dochód i codziennie odbieramy dziecko wcześniej.`,
          recommendedKnowledgeIds: ["1E", "2E"],
        },
        {
          cardId: "5F",
          branchTag: "later_shared_care",
          strategyId: "aura",
          strategyBadge: "✨ Balans Farming",
          badge: "Kolejne lata · Partnerski podział opieki",
          title: "Zasiłek opiekuńczy (60 dni 80%) na zmianę obojga rodziców",
          description:
            "W razie nagłych infekcji lub zamknięcia placówki oboje rodzice na zmianę korzystają ze wspólnej rocznej puli 60 dni płatnego zasiłku opiekuńczego (80%).",
          recommendedKnowledgeIds: ["1C", "3D"],
        },
      ],
    };
  }

  return {
    question: `Cała pula rodzicielskiego została wykorzystana — jak zabezpieczacie choroby i opiekę ${placeLabel}?`,
    subtitle: "Po powrocie do pracy przysługuje Wam wspólna pula 60 dni zasiłku opiekuńczego (80% podstawy) w roku oraz 2 dni / 16 godz. z art. 188 KP.",
    nodes: [
      {
        cardId: "5D",
        branchTag: "later_mother_care",
        strategyId: "kortyzol",
        strategyBadge: "🧘 Kortyzol Minimizer",
        badge: "Kolejne lata · Spokojna opieka na e-ZLA",
        title: "Zasiłek opiekuńczy pierwszego rodzica na czas infekcji (60 dni)",
        description:
          "Podczas chorób dziecka korzystamy z płatnego zasiłku opiekuńczego (80% podstawy, do 60 dni w roku na dzieci do lat 14) na zwolnieniu lekarskim e-ZLA.",
        recommendedKnowledgeIds: ["1C", "3D"],
      },
      {
        cardId: "5E",
        branchTag: "later_father_care",
        strategyId: "zasilki",
        strategyBadge: "💰 Zasiłki Maxxxing",
        badge: "Kolejne lata · Ochrona powrotu do pracy",
        title: "Drugi rodzic przejmuje zwolnienia opiekuńcze (60 dni 80%)",
        description:
          "Po długim urlopie pierwszy rodzic spokojnie buduje pozycję w pracy, a w razie nagłych infekcji dziecka dyżury na zasiłku opiekuńczym (80%) przejmuje drugi rodzic.",
        recommendedKnowledgeIds: ["1C", "1D"],
      },
      {
        cardId: "5F",
        branchTag: "later_shared_care",
        strategyId: "aura",
        strategyBadge: "✨ Balans Farming",
        badge: "Kolejne lata · Partnerska równowaga",
        title: "Rodzice na zmianę (opiekuńczy 60 dni + 2 dni z art. 188 KP)",
        description:
          "Dzielimy zwolnienia opiekuńcze (80%) oraz 2 dni / 16 godzin zwolnienia na zdrowe dziecko (100% płatne) po równo między oboje rodziców.",
        recommendedKnowledgeIds: ["1C", "3D"],
      },
    ],
  };
}

export function getDecisionTreeRound(
  roundIndex: number,
  playedIds: string[],
  stages: Round[],
  availableSet?: Set<string>,
): { question: string; subtitle: string; cards: Card[]; activeNodes: DecisionNodeSpec[] } {
  const stage = stages[roundIndex];
  const pool = stage?.cards ?? [];
  const r1Id = playedIds[0];
  const r2Id = playedIds[1] ?? "2A";
  const r3Id = playedIds[2] ?? "3B";
  const r4Id = playedIds[3];
  const situationKey = r1Id === "1B" ? "adoption" : r1Id === "1D" ? "foster" : "birth";

  let question = stage?.description ?? "Wybierz jedną z trzech wykluczających się opcji.";
  let subtitle = "Każda karta odpowiada innej sytuacji lub strategii rodziny w systemie ZUS.";
  let specs: DecisionNodeSpec[] = [];

  if (roundIndex === 0) {
    question = "Krok 1: Jak powiększa się Wasza rodzina?";
    subtitle = "Wybierzcie Waszą sytuację — drzewo decyzyjne dopasuje wszystkie kolejne pytania, limity wieku oraz przepisy ZUS.";
    specs = ROUND_1_NODES;
  } else if (roundIndex === 1) {
    const branch = ROUND_2_BY_SITUATION[situationKey];
    question = `Krok 2: ${branch.question}`;
    subtitle = branch.subtitle;
    specs = branch.nodes;
  } else if (roundIndex === 2) {
    const branch = getRound3Branch(situationKey, r2Id);
    question = `Krok 3: ${branch.question}`;
    subtitle = branch.subtitle;
    specs = branch.nodes;
  } else if (roundIndex === 3) {
    const branch = getRound4Branch(situationKey, r2Id, r3Id);
    question = `Krok 4: ${branch.question}`;
    subtitle = branch.subtitle;
    specs = branch.nodes;
  } else {
    const exhaustedParental = r4Id === "4A" || (availableSet && !availableSet.has("5A"));
    const branch = getRound5Branch(situationKey, r2Id, Boolean(exhaustedParental));
    question = `Krok 5: ${branch.question}`;
    subtitle = branch.subtitle;
    specs = branch.nodes;
  }

  const cards: Card[] = specs.flatMap((spec): Card[] => {
    const base = pool.find((c) => c.id === spec.cardId);
    if (!base) return [];
    const nextDesign = base.design
      ? ({ ...base.design, title: spec.title, description: spec.description } as Card["design"])
      : undefined;
    return [
      {
        ...base,
        title: spec.title,
        description: spec.description,
        tags: [spec.badge, spec.strategyBadge, spec.branchTag, spec.strategyId],
        design: nextDesign,
      },
    ];
  });

  return { question, subtitle, cards, activeNodes: specs };
}

export function getDecisionNodeForCard(roundIndex: number, cardId: string, playedIds: string[]): DecisionNodeSpec | undefined {
  const r1Id = playedIds[0];
  const r2Id = playedIds[1] ?? "2A";
  const r3Id = playedIds[2] ?? "3B";
  const situationKey = r1Id === "1B" ? "adoption" : r1Id === "1D" ? "foster" : "birth";

  const allForRound =
    roundIndex === 0
      ? ROUND_1_NODES
      : roundIndex === 1
        ? ROUND_2_BY_SITUATION[situationKey].nodes
        : roundIndex === 2
          ? getRound3Branch(situationKey, r2Id).nodes
          : roundIndex === 3
            ? getRound4Branch(situationKey, r2Id, r3Id).nodes
            : [
                ...getRound5Branch(situationKey, r2Id, false).nodes,
                ...getRound5Branch(situationKey, r2Id, true).nodes,
              ];
  return allForRound.find((n) => n.cardId === cardId);
}

function shiftYear(isoDate: string, yearsDelta: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "2025-03-01";
  d.setUTCFullYear(d.getUTCFullYear() + yearsDelta);
  return d.toISOString().slice(0, 10);
}

/**
 * Builds an enriched Plan-Input from the simulation plan and the 5 chosen decision-tree cards,
 * so clicking "Pokaż ten scenariusz w kalkulatorze" transfers the exact situation (birth / adoption / foster),
 * child stage/age, rate variant (81,5% vs 100%/70%), and blocks to /calculator.
 */
export function buildCalculatorHandoffPlan(
  basePlan: S["Plan-Output"],
  playedIds: string[],
): S["Plan-Input"] {
  const r1Id = playedIds[0];
  const r2Id = playedIds[1];
  const r3Id = playedIds[2];
  const eventDate = basePlan.family.birth_date || basePlan.family.due_date || "2027-03-01";

  const family: S["Family-Input"] = {
    ...basePlan.family,
    mother: { ...basePlan.family.mother },
    father: basePlan.family.father ? { ...basePlan.family.father } : null,
  };

  if (r1Id === "1B") {
    // Adoption path
    const childBirth = r2Id === "2B" ? shiftYear(eventDate, -8) : shiftYear(eventDate, -2);
    family.birth_date = childBirth;
    family.adoption = {
      kind: "adoption",
      accepted_on: eventDate,
      court_applied_on: eventDate,
      school_deferred: false,
      applicant: "mother",
    };
  } else if (r1Id === "1D") {
    // Foster care path
    const isSchoolDeferred = r2Id === "2B";
    const isZaZyciem = r2Id === "2C";
    const childBirth = isSchoolDeferred ? shiftYear(eventDate, -8) : shiftYear(eventDate, -2);
    family.birth_date = childBirth;
    family.adoption = {
      kind: "foster",
      accepted_on: eventDate,
      court_applied_on: null,
      school_deferred: isSchoolDeferred,
      applicant: "mother",
    };
    if (isZaZyciem) {
      family.za_zyciem = true;
    }
  } else {
    // Birth path
    family.adoption = null;
    if (r2Id === "2C") {
      family.birth_date = eventDate;
    } else {
      family.birth_date = null;
      family.due_date = eventDate;
    }
  }

  const rateVariant = r3Id === "3B" ? "averaged" : basePlan.rate_variant;
  const averagedRequestOn = rateVariant === "averaged" ? (basePlan.averaged_request_on ?? eventDate) : null;

  return {
    ...basePlan,
    family,
    // The game replays the sample birth family's cards; their periods (e.g. pre-birth maternity) do not apply
    // to adoption/foster care, so the calculator seeds legal first periods for that situation (/calc/start).
    blocks: family.adoption ? [] : basePlan.blocks,
    rate_variant: rateVariant,
    averaged_request_on: averagedRequestOn,
  };
}
