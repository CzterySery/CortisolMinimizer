import type { Card, Round } from "@/types/game";

export interface DecisionNodeSpec {
  cardId: string;
  branchTag: string;
  badge: string;
  title: string;
  description: string;
  recommendedKnowledgeIds: string[];
}

export interface DecisionRoundContext {
  roundId: number;
  question: string;
  subtitle: string;
  nodes: DecisionNodeSpec[];
}

// Round 1: Mutually exclusive family situation
const ROUND_1_NODES: DecisionNodeSpec[] = [
  {
    cardId: "1A",
    branchTag: "birth",
    badge: "Sytuacja · Narodziny",
    title: "Urodzenie dziecka",
    description:
      "Spodziewamy się narodzin dziecka lub właśnie zostaliśmy rodzicami. Planujemy urlop macierzyński (20 tyg.), ojcowski (14 dni) oraz rodzicielski (41 tyg.).",
    recommendedKnowledgeIds: ["1C", "1E", "2F"],
  },
  {
    cardId: "1B",
    branchTag: "adoption",
    badge: "Sytuacja · Adopcja",
    title: "Adopcja (przysposobienie)",
    description:
      "Przyjmujemy dziecko na wychowanie i występujemy do sądu opiekuńczego. Korzystamy z urlopu na warunkach macierzyńskiego i rodzicielskiego (do 14. roku życia).",
    recommendedKnowledgeIds: ["1D", "2E", "3D"],
  },
  {
    cardId: "1D",
    branchTag: "foster",
    badge: "Sytuacja · Piecza zastępcza",
    title: "Rodzina zastępcza",
    description:
      "Tworzymy niezawodową rodzinę zastępczą. Przysługuje nam zasiłek i urlop na warunkach macierzyńskiego oraz rodzicielski do 7. roku życia (lub 10. przy odroczeniu).",
    recommendedKnowledgeIds: ["1D", "1F", "3D"],
  },
];

// Round 2: Mutually exclusive stage / timing based on Round 1 choice
const ROUND_2_BY_SITUATION: Record<string, { question: string; subtitle: string; nodes: DecisionNodeSpec[] }> = {
  birth: {
    question: "Na jakim etapie oczekiwania na dziecko jesteście?",
    subtitle: "Wybierzcie sytuację, która najlepiej opisuje Wasz obecny moment — od tego zależy start urlopu i formalności.",
    nodes: [
      {
        cardId: "2C",
        branchTag: "already_born",
        badge: "Etap · Dziecko już na świecie",
        title: "Dziecko już się urodziło",
        description:
          "Macierzyński trwa od dnia porodu (całe 20 tygodni po narodzinach). Tata rezerwuje 14 dni urlopu ojcowskiego na dogodny moment przed 1. urodzinami.",
        recommendedKnowledgeIds: ["2F", "2E", "3F"],
      },
      {
        cardId: "2A",
        branchTag: "about_to_birth",
        badge: "Etap · Poród lada dzień",
        title: "Tuż przed porodem — wspólny start w domu",
        description:
          "Szykujemy się na poród: tata bierze pełne 14 dni urlopu ojcowskiego (100%) od razu po narodzinach, by przez pierwsze dwa tygodnie być razem z mamą i dzieckiem.",
        recommendedKnowledgeIds: ["2D", "2E", "2F"],
      },
      {
        cardId: "2B",
        branchTag: "planning_pregnancy",
        badge: "Etap · Planowanie lub początek ciąży",
        title: "Planujemy ciążę lub jesteśmy na początku",
        description:
          "Planujemy z wyprzedzeniem: sprawdzamy chorobowe 100% w ciąży i podstawę zasiłku, a ojcowski dzielimy elastycznie (tydzień na start i tydzień później).",
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
        badge: "Adopcja · Dziecko do 7 lat",
        title: "Przyjęliśmy młodsze dziecko (do 7. roku życia)",
        description:
          "Przysługuje pełny wymiar 20 tygodni urlopu na warunkach macierzyńskiego, 41 tygodni rodzicielskiego oraz 14 dni ojcowskiego od uprawomocnienia sądu.",
        recommendedKnowledgeIds: ["2E", "3D", "3F"],
      },
      {
        cardId: "2B",
        branchTag: "adoption_under_14",
        badge: "Adopcja · Dziecko 7–14 lat",
        title: "Przyjęliśmy starsze dziecko (do 14. roku życia)",
        description:
          "Korzystamy z urlopu przed ukończeniem przez dziecko 14 lat (w tym gwarantowanego minimalnego wymiaru 9 tygodni urlopu na warunkach macierzyńskiego).",
        recommendedKnowledgeIds: ["2E", "3D", "1D"],
      },
      {
        cardId: "2C",
        branchTag: "adoption_pending",
        badge: "Adopcja · Przed wnioskiem sądowym",
        title: "Przygotowujemy się do przyjęcia dziecka",
        description:
          "Kompletujemy dokumenty i wniosek do sądu opiekuńczego. Urlop ojcowski (14 dni) rezerwujemy na okres po uprawomocnieniu postanowienia o przysposobieniu.",
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
        badge: "Piecza · Dziecko do 7 lat",
        title: "Przyjęcie dziecka do 7. roku życia",
        description:
          "Pełna pula 20 tygodni urlopu na warunkach macierzyńskiego oraz do 41 tygodni urlopu rodzicielskiego od dnia przyjęcia dziecka na wychowanie.",
        recommendedKnowledgeIds: ["2E", "3D", "3F"],
      },
      {
        cardId: "2B",
        branchTag: "foster_school_deferral",
        badge: "Piecza · Odroczenie szkolne (do 10 lat)",
        title: "Dziecko z odroczeniem obowiązku szkolnego",
        description:
          "Dzięki decyzji o odroczeniu obowiązku szkolnego prawo do urlopu i zasiłku wydłuża się aż do ukończenia przez dziecko 10. roku życia.",
        recommendedKnowledgeIds: ["2E", "3D", "1D"],
      },
      {
        cardId: "2C",
        branchTag: "foster_za_zyciem",
        badge: "Piecza · Dodatkowe wsparcie",
        title: "Dziecko z zaświadczeniem „Za życiem”",
        description:
          "Korzystamy z wydłużonego wymiaru urlopu rodzicielskiego (do 62–65 tygodni) przysługującego przy zaświadczeniu lekarskim z ustawy „Za życiem”.",
        recommendedKnowledgeIds: ["3E", "2D", "3D"],
      },
    ],
  },
};

// Round 3: Mutually exclusive financial/time want (ZUS payment & early transfer options)
const ROUND_3_NODES: DecisionNodeSpec[] = [
  {
    cardId: "3B",
    branchTag: "want_balance",
    badge: "Cel · Równowaga i przewidywalność",
    title: "Stałe 81,5% zasiłku przez cały rok (Balans)",
    description:
      "Składamy jeden „długi wniosek” w ciągu 21 dni: przez cały macierzyński i rodzicielski otrzymujemy równą stawkę 81,5% podstawy, bez spadku dochodu po 20 tygodniach.",
    recommendedKnowledgeIds: ["3F", "2E", "3D"],
  },
  {
    cardId: "3A",
    branchTag: "want_cash",
    badge: "Cel · Maksimum gotówki na starcie",
    title: "100% zasiłku na początku, 70% później (Pieniądze)",
    description:
      "Przez pierwsze 20 tygodni pobieramy pełne 100% podstawy zasiłku, a za rodzicielski 70%. Daje to najwyższe wpływy w pierwszych miesiącach i elastyczność decyzji.",
    recommendedKnowledgeIds: ["3F", "1E", "1D"],
  },
  {
    cardId: "3C",
    branchTag: "want_shared",
    badge: "Cel · Szybki powrót mamy i podział",
    title: "Zmiana warty po 14 tygodniach (Kariera + Czas taty)",
    description:
      "Mama wykorzystuje obowiązkowe 14 tygodni po porodzie i wraca do pracy, a tata przejmuje pozostałe 6 tygodni macierzyńskiego z pełnym zasiłkiem 100%.",
    recommendedKnowledgeIds: ["3D", "2E", "1F"],
  },
];

// Round 4: Mutually exclusive 1st-year strategy (time vs cash vs flexibility)
const ROUND_4_NODES: DecisionNodeSpec[] = [
  {
    cardId: "4A",
    branchTag: "year_max_time",
    badge: "Strategia · Maksimum czasu z dzieckiem",
    title: "Pełna sztafeta: 32 tygodnie mamy + 9 tygodni taty",
    description:
      "Wykorzystujemy całe 41 tygodni rodzicielskiego ciągiem w pierwszym roku: najpierw mama, a po niej tata bierze swoje nieprzenoszalne 9 tygodni wyłącznej opieki.",
    recommendedKnowledgeIds: ["3F", "2E", "3E"],
  },
  {
    cardId: "4C",
    branchTag: "year_max_cash",
    badge: "Strategia · Maksimum domowego budżetu",
    title: "Łączenie rodzicielskiego z pracą na część etatu",
    description:
      "Łączymy urlop rodzicielski z pracą (np. na 1/2 etatu u swojego pracodawcy). Pobieramy jednocześnie pensję i proporcjonalny zasiłek, a urlop wydłuża się aż do 64 tygodni!",
    recommendedKnowledgeIds: ["1E", "1D", "3F"],
  },
  {
    cardId: "4D",
    branchTag: "year_balance_reserve",
    badge: "Strategia · Elastyczny zapas na później",
    title: "Część rodzicielskiego teraz, rezerwa na żłobek",
    description:
      "Bierzemy główny blok rodzicielskiego w pierwszym roku, ale celowo zostawiamy 1–2 części w rezerwie do wykorzystania aż do 6. roku życia dziecka.",
    recommendedKnowledgeIds: ["2E", "3D", "2D"],
  },
];

// Round 5: Mutually exclusive later-years strategy (branches depending on whether parental leave pool was exhausted in Round 4)
const ROUND_5_WITH_RESERVE: DecisionNodeSpec[] = [
  {
    cardId: "5A",
    branchTag: "later_full_adaptation",
    badge: "Kolejne lata · Maksimum czasu na adaptację",
    title: "Wolny miesiąc z rezerwy na adaptację w żłobku",
    description:
      "Wykorzystujemy zachowaną część urlopu rodzicielskiego w jednym pełnym bloku, by spokojnie towarzyszyć dziecku w pierwszych tygodniach żłobka lub przedszkola.",
    recommendedKnowledgeIds: ["2E", "3D"],
  },
  {
    cardId: "5C",
    branchTag: "later_part_time_adaptation",
    badge: "Kolejne lata · Pieniądze i krótsze dni pracy",
    title: "Adaptacja połączona z pracą na 1/2 etatu",
    description:
      "Ostatnią część urlopu rodzicielskiego łączymy z pracą na część etatu — zachowujemy wyższy dochód i codziennie odbieramy dziecko wcześniej z placówki.",
    recommendedKnowledgeIds: ["1E", "2E"],
  },
  {
    cardId: "5F",
    branchTag: "later_shared_care",
    badge: "Kolejne lata · Równowaga w razie chorób",
    title: "Zasiłek opiekuńczy (60 dni 80%) na zmianę",
    description:
      "W razie nagłych infekcji lub zamknięcia żłobka mama i tata na zmianę korzystają ze wspólnej rocznej puli 60 dni płatnego zasiłku opiekuńczego (80%).",
    recommendedKnowledgeIds: ["1C", "3D"],
  },
];

const ROUND_5_CARE_ONLY: DecisionNodeSpec[] = [
  {
    cardId: "5D",
    branchTag: "later_mother_care",
    badge: "Kolejne lata · Opieka mamy na e-ZLA",
    title: "Zasiłek opiekuńczy mamy na czas infekcji (do 60 dni)",
    description:
      "Cały rodzicielski wykorzystaliśmy w 1. roku, więc podczas chorób dziecka w żłobku mama korzysta z płatnego zasiłku opiekuńczego (80% podstawy do 60 dni w roku).",
    recommendedKnowledgeIds: ["1C", "3D"],
  },
  {
    cardId: "5E",
    branchTag: "later_father_care",
    badge: "Kolejne lata · Ochrona kariery mamy",
    title: "Tata przejmuje zwolnienia opiekuńcze (60 dni 80%)",
    description:
      "Po długim urlopie mama spokojnie wraca do pracy, a w razie nagłych infekcji dziecka dyżury na płatnym zasiłku opiekuńczym (80%) przejmuje tata.",
    recommendedKnowledgeIds: ["1C", "1D"],
  },
  {
    cardId: "5F",
    branchTag: "later_shared_care",
    badge: "Kolejne lata · Partnerski balans",
    title: "Mama i tata na zmianę (opiekuńczy 60 dni + art. 188 KP)",
    description:
      "Dzielimy zwolnienia opiekuńcze (80%) oraz 2 dni / 16 godzin zwolnienia na dziecko zdrowe (100% płatne) po równo między oboje rodziców.",
    recommendedKnowledgeIds: ["1C", "3D"],
  },
];

export function getDecisionTreeRound(
  roundIndex: number,
  playedIds: string[],
  stages: Round[],
  availableSet?: Set<string>,
): { question: string; subtitle: string; cards: Card[]; activeNodes: DecisionNodeSpec[] } {
  const stage = stages[roundIndex];
  const pool = stage?.cards ?? [];
  const r1Id = playedIds[0];
  const r4Id = playedIds[3];

  let question = stage?.description ?? "Wybierz jedną z trzech wykluczających się opcji.";
  let subtitle = "Każda karta odpowiada innej sytuacji lub priorytetowi rodziny w systemie ZUS.";
  let specs: DecisionNodeSpec[] = [];

  if (roundIndex === 0) {
    question = "Krok 1: Jak powiększa się Wasza rodzina?";
    subtitle = "Wybierzcie Waszą sytuację — drzewo decyzyjne dopasuje kolejne pytania oraz przepisy ZUS.";
    specs = ROUND_1_NODES;
  } else if (roundIndex === 1) {
    const situationKey = r1Id === "1B" ? "adoption" : r1Id === "1D" ? "foster" : "birth";
    const branch = ROUND_2_BY_SITUATION[situationKey];
    question = `Krok 2: ${branch.question}`;
    subtitle = branch.subtitle;
    specs = branch.nodes;
  } else if (roundIndex === 2) {
    question = "Krok 3: Czego najbardziej potrzebujecie — gotówki, czasu czy równowagi?";
    subtitle = "Wybierzcie wariant wypłaty zasiłku ZUS oraz sposób podziału pierwszych miesięcy.";
    specs = ROUND_3_NODES;
  } else if (roundIndex === 3) {
    question = "Krok 4: Jak chcecie rozegrać pierwszy rok i urlop rodzicielski?";
    subtitle = "Zdecydujcie, czy stawiacie na maksymalnie długą obecność w domu, wyższy budżet dzięki części etatu, czy rezerwę na później.";
    specs = ROUND_4_NODES;
  } else {
    const exhaustedParental = r4Id === "4A" || (availableSet && !availableSet.has("5A"));
    question = "Krok 5: Kolejne lata — jak zabezpieczacie powrót do pracy i żłobek?";
    subtitle = exhaustedParental
      ? "Wykorzystaliście już całą pulę rodzicielskiego w pierwszym roku — wybierzcie, jak dzielicie płatny zasiłek opiekuńczy (60 dni w roku) w razie chorób."
      : "Macie zachowaną pulę urlopu rodzicielskiego — wybierzcie, jak wykorzystacie ją na adaptację przedszkolną i sytuacje awaryjne.";
    specs = exhaustedParental ? ROUND_5_CARE_ONLY : ROUND_5_WITH_RESERVE;
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
        tags: [spec.badge, spec.branchTag],
        design: nextDesign,
      },
    ];
  });

  return { question, subtitle, cards, activeNodes: specs };
}

export function getDecisionNodeForCard(roundIndex: number, cardId: string, playedIds: string[]): DecisionNodeSpec | undefined {
  const r1Id = playedIds[0];
  const situationKey = r1Id === "1B" ? "adoption" : r1Id === "1D" ? "foster" : "birth";
  const allForRound =
    roundIndex === 0
      ? ROUND_1_NODES
      : roundIndex === 1
        ? ROUND_2_BY_SITUATION[situationKey].nodes
        : roundIndex === 2
          ? ROUND_3_NODES
          : roundIndex === 3
            ? ROUND_4_NODES
            : [...ROUND_5_WITH_RESERVE, ...ROUND_5_CARE_ONLY];
  return allForRound.find((n) => n.cardId === cardId);
}
