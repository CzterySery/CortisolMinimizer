# Talia 30 kart — projekt mechaniki

Po sześć kart na etap, trzy w ręce, jedna decyzja na rundę. Silnik strony głównej odtwarza jeden plan w trzech jawnych scenariuszach urodzenia; niewspierane lub niespełnione warunki blokują kartę. Starszy endpoint katalogu ma osobne 15 kart. Dane projektu: [deck-design.json](shared/deck-design.json). Zasady wspólne i tryby: [projekt działania](docs/card-grounding.md).

Pieniądze i czas są wyliczane z planu, nigdy dodawane jako stały bonus. Wiedza rośnie wyłącznie po zagraniu kart edukacyjnych; karty planujące urlopy nie zwiększają paska. Zerowy wpływ decyzji formalnej na pieniądze lub czas jest poprawny. Wartości ustawowe są odczytywane przez referencje do parametrów, a nie utrzymywane w treści kart.

## 1. Ciąża / przygotowanie do przyjęcia

<a id="1a"></a>
### 1A · Macierzyński od narodzin

Zachowaj całą dostępną pulę macierzyńskiego na czas po porodzie.

**Kiedy:** Ścieżka urodzenia; brak rozpoczętego macierzyńskiego. Praca do porodu tylko przy braku stwierdzonej niezdolności; karta nie kasuje e-ZLA.

**Pieniądze:** Przed porodem pozostaje dochód z faktycznej sytuacji; po porodzie zasiłek według podstawy i wariantu.

**Czas:** Brak dodatkowych dni przed porodem; cała pula pozostaje po narodzinach.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "set_flag",
    "name": "maternity_start",
    "value": "birth"
  }
]
```

**Podstawy:** [maternity-pool](Documents/legal/rules.md#maternity-pool), [insured-parent](Documents/legal/rules.md#insured-parent), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `maternity.weeks_by_children`.

**Combo:** Zmiana warty; partnerzy: [3C](#3c); warunek `touching`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="1b"></a>
### 1B · Chwila przed porodem

Rozpocznij macierzyński wcześniej i przygotuj się na narodziny.

**Kiedy:** Pracownica, zaświadczenie o przewidywanym terminie, wybrany początek w dopuszczalnym oknie. Nie nakładaj macierzyńskiego na chorobowe tej samej osoby.

**Pieniądze:** Zasiłek zastępuje wynagrodzenie za wybrane dni; nie zakładamy z góry wzrostu dochodu.

**Czas:** Wcześniejsze wolne zużywa tę samą pulę; mniej macierzyńskiego zostaje po porodzie.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "mother",
    "kind": "maternity",
    "start": "choice.prebirth_start",
    "days": "until:birth",
    "merge_into": "baseline.maternity"
  }
]
```

**Podstawy:** [prebirth](Documents/legal/rules.md#prebirth), [maternity-pool](Documents/legal/rules.md#maternity-pool), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `maternity.prebirth_max_weeks`, `rates.maternity`.

**Combo:** Wspólny start; partnerzy: [2A](#2a); warunek `overlap`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="1c"></a>
### 1C · Poznaj zasady chorobowego

Dowiedz się, kiedy ciąża, ubezpieczenie i e-ZLA mają znaczenie dla zasiłku chorobowego.

**Kiedy:** Karta edukacyjna dostępna w każdej historii; nie stwierdza choroby ani nie składa wniosku.

**Pieniądze:** To karta wiedzy: nie zmienia dochodu ani prawa do świadczenia.

**Czas:** Nie dodaje zwolnienia, dni wolnych ani czasu opieki.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[]
```

**Podstawy:** [sick-right](Documents/legal/rules.md#sick-right), [sick-money](Documents/legal/rules.md#sick-money).

**Parametry:** wymagają uzupełnienia przed wdrożeniem.

<a id="1d"></a>
### 1D · Kto wypłaca świadczenie?

Sprawdź, kto będzie płatnikiem zasiłku i jakie dane trzeba przygotować.

**Kiedy:** Dostępna od początku w każdej historii. Płatnik zależy od tytułu ubezpieczenia i liczby ubezpieczonych; samo sprawdzenie nie oznacza przyznania świadczenia.

**Pieniądze:** Samo ustalenie płatnika nie zwiększa kwoty ani nie tworzy uprawnienia.

**Czas:** Bez zmiany urlopu i dostępnych dni; to informacja organizacyjna.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "set_flag",
    "name": "payer_checked",
    "value": true
  }
]
```

**Podstawy:** [payer](Documents/legal/rules.md#payer), [insured-parent](Documents/legal/rules.md#insured-parent).

**Parametry:** `payer_threshold_insured`.

**Combo:** Kompletna teczka; partnerzy: [3D](#3d); warunek `docs_complete`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="1e"></a>
### 1E · Sprawdź podstawę zasiłku

Sprawdź wynagrodzenia i podstawę, od której będzie liczony zasiłek.

**Kiedy:** Dostępna historia wynagrodzeń lub potwierdzona podstawa. Okres przyjmowany do obliczenia zależy od zatrudnienia i daty powstania prawa do świadczenia.

**Pieniądze:** Weryfikacja pomaga zrozumieć wyliczenie; sama nie podnosi podstawy ani nie tworzy wypłaty.

**Czas:** Sprawdzenie podstawy nie zwalnia z pracy i nie zużywa puli urlopów.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "set_flag",
    "name": "benefit_base_checked",
    "value": true
  }
]
```

**Podstawy:** [base](Documents/legal/rules.md#base).

**Parametry:** `contribution_deduction`.

<a id="1f"></a>
### 1F · Poznaj płatnika zasiłku

Sprawdź, kiedy zasiłek wypłaca pracodawca, a kiedy ZUS.

**Kiedy:** Karta edukacyjna dostępna w każdej historii; próg zależy od ustawowego stanu zatrudnienia.

**Pieniądze:** To karta wiedzy: sama informacja nie zmienia kwoty świadczenia.

**Czas:** Nie zmienia planu urlopów ani dostępnych dni.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[]
```

**Podstawy:** [payer](Documents/legal/rules.md#payer), [insured-parent](Documents/legal/rules.md#insured-parent).

**Parametry:** `payer_threshold_insured`.

## 2. Poród / przyjęcie

<a id="2a"></a>
### 2A · Razem na starcie

Zaplanuj cały dostępny ojcowski we wspólnym bloku po narodzinach.

**Kiedy:** Uprawniony ojciec, dostępna pełna pula, osiągalny termin wniosku i wykorzystania. Początek nie musi być dniem porodu.

**Pieniądze:** Za blok zastąp wynagrodzenie świadczeniem od podstawy ojca; stawka ojcowskiego jest niezależna od wariantu matki.

**Czas:** Zużyj pulę ojcowskiego; wspólne dni licz raz do pokrycia opieki, osobno do wspólnego czasu.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "father",
    "kind": "paternity",
    "start": "choice.early_paternity_start",
    "days": "params.paternity.days"
  }
]
```

**Podstawy:** [paternity](Documents/legal/rules.md#paternity), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base), [payer](Documents/legal/rules.md#payer).

**Parametry:** `paternity.days`, `paternity.notice_days`, `paternity.use_by_child_months`, `rates.paternity`.

**Combo:** Wspólny start; partnerzy: [1B](#1b), [4B](#4b); warunek `overlap`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="2b"></a>
### 2B · Tydzień teraz, reszta później

Wykorzystaj pierwszą część ojcowskiego i zachowaj drugą na konkretną potrzebę.

**Kiedy:** Pełna pula i dwie dostępne części; oba terminy mieszczą się w ograniczeniach i mają osiągalne terminy wniosków.

**Pieniądze:** Teraz rozlicz tylko pierwszą część; za rezerwację brak wypłaty do czasu zaplanowania rzeczywistego bloku.

**Czas:** W tym wczesnym okresie tata korzysta tylko z pierwszej części. Pozostałe dni ojcowskiego nie przepadają — można je zaplanować później w terminie.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "father",
    "kind": "paternity",
    "start": "choice.first_paternity_start",
    "days": "params.paternity.min_part_days"
  },
  {
    "op": "reserve",
    "who": "father",
    "pool": "paternity",
    "start": "need:paternity_later",
    "days": "derived.paternity_remaining"
  }
]
```

**Podstawy:** [paternity](Documents/legal/rules.md#paternity), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `paternity.min_part_days`, `paternity.max_parts`, `paternity.notice_days`, `rates.paternity`.

**Combo:** Wykorzystana rezerwa; partnerzy: [4E](#4e); warunek `covers_need`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="2c"></a>
### 2C · Ojcowski na później

Zarezerwuj ojcowski na czas, gdy najbardziej przyda się dodatkowa opieka.

**Kiedy:** Bieżąca opieka zapewniona, ojciec uprawniony i nadal możliwy legalny późniejszy termin. Nie pozwól zarezerwować puli poza limitem wieku.

**Pieniądze:** Do rozpoczęcia bloku dochód z pracy bez dodatkowego zasiłku; pokaż datowaną prognozę rezerwy osobno.

**Czas:** Bez bieżącego zużycia puli i bez dodatkowych pokrytych dni; późniejszy blok musi zostać zrealizowany.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "reserve",
    "who": "father",
    "pool": "paternity",
    "start": "need:paternity_later",
    "days": "params.paternity.days"
  }
]
```

**Podstawy:** [paternity](Documents/legal/rules.md#paternity), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `paternity.days`, `paternity.use_by_child_months`, `paternity.notice_days`.

**Combo:** Wykorzystana rezerwa; partnerzy: [4E](#4e); warunek `covers_need`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="2d"></a>
### 2D · Poznaj dodatkowy urlop po hospitalizacji

Dowiedz się, kiedy pobyt dziecka w szpitalu może wydłużyć urlop macierzyński.

**Kiedy:** Karta wiedzy dostępna niezależnie od historii; uprawnienie wymaga spełnienia ustawowych warunków.

**Pieniądze:** To karta wiedzy: nie zakłada hospitalizacji ani nie dopisuje urlopu.

**Czas:** Nie tworzy dni wolnych; wymiar zależy od udokumentowanych okoliczności.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[]
```

**Podstawy:** [supplementary](Documents/legal/rules.md#supplementary).

**Parametry:** wymagają uzupełnienia przed wdrożeniem.

<a id="2e"></a>
### 2E · Poznaj terminy wniosków urlopowych

Sprawdź, kiedy zgłosić ojcowski i uzupełniający urlop macierzyński.

**Kiedy:** Karta edukacyjna dostępna w każdej historii; terminy zależą od wybranego uprawnienia.

**Pieniądze:** To karta wiedzy: nie składa wniosku ani nie przyznaje świadczenia.

**Czas:** Nie zmienia puli ani kalendarza urlopów.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[]
```

**Podstawy:** [paternity](Documents/legal/rules.md#paternity), [supplementary](Documents/legal/rules.md#supplementary).

**Parametry:** wymagają uzupełnienia przed wdrożeniem.

<a id="2f"></a>
### 2F · Poznaj dokumenty do zasiłku

Zobacz, jakie dokumenty zwykle są potrzebne po narodzinach dziecka.

**Kiedy:** Karta edukacyjna dostępna w każdej historii; ostateczna lista zależy od płatnika i sytuacji rodziny.

**Pieniądze:** To karta wiedzy: nie składa wniosku i nie oznacza dokumentu jako złożonego.

**Czas:** Nie zmienia planu urlopów, dochodu ani dostępnych dni.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[]
```

**Podstawy:** [birth-docs](Documents/legal/rules.md#birth-docs), [payer](Documents/legal/rules.md#payer).

**Parametry:** wymagają uzupełnienia przed wdrożeniem.

## 3. Pierwszy miesiąc

<a id="3a"></a>
### 3A · Więcej na początku

Wybierz podstawowy wariant wypłat za macierzyński i rodzicielski.

**Kiedy:** Prawo potwierdzone, brak wcześniejszego wiążącego wyboru wariantu uśrednionego. To wybór porównywanych planów, nie dowolna zmiana już wypłaconych świadczeń.

**Pieniądze:** Przelicz wszystkie planowane okresy według ich stawek; pokaż zmianę między etapami i sumę świadczeń w tym samym horyzoncie.

**Czas:** Wariant stawek sam nie dodaje dni i nie zmienia puli urlopów.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "set_rate_variant",
    "value": "standard"
  }
]
```

**Podstawy:** [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base), [floor](Documents/legal/rules.md#floor).

**Parametry:** `rates.maternity`, `rates.parental`, `parental_benefit_floor`.

**Combo:** Budżet dopięty; partnerzy: [4C](#4c); warunek `budget_ok`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="3b"></a>
### 3B · Równiej przez miesiące

Złóż w terminie wniosek o uśredniony wariant wypłat.

**Kiedy:** Dostępny wariant i osiągalny termin od porodu albo odpowiedniego zdarzenia przyjęcia; uwzględnij wyłączny blok drugiego rodzica.

**Pieniądze:** Przelicz plan; wyłączny blok drugiego rodzica rozlicz osobno. Stabilność i suma zależą od podstaw oraz terminów wykorzystania.

**Czas:** Bez dodatkowych tygodni; pilnuj wykorzystania rodzicielskiego w pierwszym roku i ewentualnego wyrównania.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "set_rate_variant",
    "value": "averaged"
  },
  {
    "op": "mark_docs",
    "bundle": "averaged_request",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [averaged](Documents/legal/rules.md#averaged), [exclusive-rate](Documents/legal/rules.md#exclusive-rate), [top-up](Documents/legal/rules.md#top-up), [base](Documents/legal/rules.md#base), [floor](Documents/legal/rules.md#floor).

**Parametry:** `rates.averaged`, `rates.parental`, `deadlines.averaged_request_days_after_birth`.

**Combo:** Obie pule w grze; partnerzy: [4F](#4f); warunek `covers_need`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="3c"></a>
### 3C · Zmiana warty

Zaplanuj powrót mamy do pracy i przejęcie pozostałego macierzyńskiego przez tatę.

**Kiedy:** Scenariusz urodzenia, obowiązkowy okres po porodzie wykorzystany przez mamę, dodatnia reszta, uprawniony ojciec i osiągalne terminy wniosków. Przyszły blok nie oznacza powrotu już dziś.

**Pieniądze:** Od daty przejęcia uwzględnij pracę mamy i świadczenie od podstawy ojca; nie dopisuj dwóch świadczeń za ten sam przekazany okres.

**Czas:** Przenieś dni, nie twórz nowej puli. Okres przedporodowy nie zastępuje wymaganego okresu po porodzie.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "transfer_maternity",
    "from_who": "mother",
    "to_who": "father",
    "start": "after:mother_personal_postbirth_period",
    "days": "derived.transferable_maternity_remaining"
  }
]
```

**Podstawy:** [transfer](Documents/legal/rules.md#transfer), [maternity-pool](Documents/legal/rules.md#maternity-pool), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `maternity.mother_personal_weeks`.

**Combo:** Zmiana warty; partnerzy: [1A](#1a); warunek `touching`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="3d"></a>
### 3D · Poznaj listę dokumentów

Sprawdź, jakie formularze i informacje mogą być potrzebne do zasiłku.

**Kiedy:** Karta edukacyjna dostępna w każdej historii; zestaw dokumentów zależy od płatnika i tytułu ubezpieczenia.

**Pieniądze:** To karta wiedzy: nie składa wniosków ani nie potwierdza dokumentów.

**Czas:** Nie zmienia wypłaty, uprawnień ani puli urlopów.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[]
```

**Podstawy:** [birth-docs](Documents/legal/rules.md#birth-docs), [payer](Documents/legal/rules.md#payer), [base](Documents/legal/rules.md#base), [insured-parent](Documents/legal/rules.md#insured-parent), [debt](Documents/legal/rules.md#debt).

**Parametry:** `payer_threshold_insured`, `debt_threshold_pct_min_wage`, `contribution_deduction`.

**Combo:** Kompletna teczka; partnerzy: [1C](#1c), [1D](#1d), [2F](#2f); warunek `docs_complete`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="3e"></a>
### 3E · Poznaj dodatkowe uprawnienia

Dowiedz się, jak zaświadczenie „Za życiem” wpływa na wymiar urlopu rodzicielskiego.

**Kiedy:** Karta edukacyjna dostępna w każdej historii; nie potwierdza stanu zdrowia ani nie składa wniosku.

**Pieniądze:** To karta wiedzy: nie zmienia uprawnień ani wypłaty w planie.

**Czas:** Nie dodaje urlopu; wymiar wymaga potwierdzenia właściwego zaświadczenia.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[]
```

**Podstawy:** [za-zyciem](Documents/legal/rules.md#za-zyciem), [parental-pool](Documents/legal/rules.md#parental-pool).

**Parametry:** `parental.weeks_za_zyciem_single`, `parental.weeks_za_zyciem_multiple`.

<a id="3f"></a>
### 3F · Poznaj wybór wariantu wypłaty

Porównaj standardowy i uśredniony wariant zasiłku macierzyńskiego.

**Kiedy:** Karta edukacyjna dostępna w każdej historii; wynik porównania zależy od podstawy i wykorzystanych urlopów.

**Pieniądze:** To karta wiedzy: nie zmienia wybranego wariantu ani wysokości wypłaty.

**Czas:** Nie dodaje urlopu i nie zmienia terminów wykorzystania puli.

**Wiedza:** +20 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[]
```

**Podstawy:** [standard-rates](Documents/legal/rules.md#standard-rates), [averaged](Documents/legal/rules.md#averaged), [exclusive-rate](Documents/legal/rules.md#exclusive-rate).

**Parametry:** `rates.maternity`, `rates.parental`, `rates.averaged`.

## 4. Pierwszy rok

<a id="4a"></a>
### 4A · Opieka na zmianę

Ułóż rodzicielski w następujących po sobie blokach mamy i taty.

**Kiedy:** Oboje uprawnieni, dostępne pule i części, terminy wniosków osiągalne. Nie przenoś wyłącznej części między rodzicami.

**Pieniądze:** W każdym okresie przelicz pensję pracującego rodzica i zasiłek opiekuna od jego podstawy.

**Czas:** Kolejne bloki wydłużają pokryty kalendarz; zużywają odpowiednie pule i części obojga.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "mother",
    "kind": "parental",
    "start": "need:first_year",
    "days": "choice.mother_parental_days"
  },
  {
    "op": "add_block",
    "who": "father",
    "kind": "parental",
    "start": "after:planned_parental:mother",
    "days": "choice.father_parental_days"
  }
]
```

**Podstawy:** [parental-pool](Documents/legal/rules.md#parental-pool), [parental-parts](Documents/legal/rules.md#parental-parts), [parental-docs](Documents/legal/rules.md#parental-docs), [averaged](Documents/legal/rules.md#averaged), [exclusive-rate](Documents/legal/rules.md#exclusive-rate), [base](Documents/legal/rules.md#base).

**Parametry:** `parental.exclusive_weeks`, `parental.max_parts`, `rates.parental`.

**Combo:** Bez luki; partnerzy: [2D](#2d), [2E](#2e), [3C](#3c); warunek `touching`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="4b"></a>
### 4B · Rodzicielski we dwoje

Zaplanuj wspólny blok rodzicielskiego na okres, gdy potrzebujecie być razem.

**Kiedy:** Dwa uprawnienia, wystarczające pule każdego rodzica i całej rodziny, dostępne części oraz osiągalne terminy.

**Pieniądze:** Za wspólne dni dwa świadczenia od różnych podstaw, bez pensji za czas nieprzepracowany; porównaj z budżetem rodziny.

**Czas:** Każdy rodzic zużywa własne dni; pokrycie tej samej potrzeby dziecka licz raz. Wspólny czas przechowuj osobno.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "mother",
    "kind": "parental",
    "start": "need:shared",
    "days": "choice.shared_parental_days"
  },
  {
    "op": "add_block",
    "who": "father",
    "kind": "parental",
    "start": "need:shared",
    "days": "choice.shared_parental_days"
  }
]
```

**Podstawy:** [simultaneous](Documents/legal/rules.md#simultaneous), [parental-pool](Documents/legal/rules.md#parental-pool), [parental-parts](Documents/legal/rules.md#parental-parts), [parental-docs](Documents/legal/rules.md#parental-docs), [standard-rates](Documents/legal/rules.md#standard-rates), [averaged](Documents/legal/rules.md#averaged), [exclusive-rate](Documents/legal/rules.md#exclusive-rate), [base](Documents/legal/rules.md#base).

**Parametry:** `parental.max_parts`, `rates.parental`, `rates.averaged`.

**Combo:** Wspólny start; partnerzy: [2A](#2a); warunek `overlap`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="4c"></a>
### 4C · Praca i rodzicielski

Połącz rodzicielski z uzgodnioną pracą w części etatu.

**Kiedy:** Pracownik u pracodawcy udzielającego urlopu, osiągalny wniosek i potwierdzona możliwość organizacji pracy. Sprawdź opiekę w godzinach pracy.

**Pieniądze:** Pensja za pracę plus proporcjonalnie obniżony zasiłek; wylicz także część wydłużoną i wybrany sposób jej wykorzystania.

**Czas:** Wydłuż właściwy blok zgodnie z zasadami; nie uznawaj całego dnia pracy za zapewnioną osobistą opiekę.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "choice.parent",
    "kind": "parental",
    "start": "need:first_year",
    "days": "choice.parental_pool_days",
    "work_fraction": "choice.work_fraction",
    "duration_semantics": "pool_before_extension"
  }
]
```

**Podstawy:** [part-time](Documents/legal/rules.md#part-time), [parental-pool](Documents/legal/rules.md#parental-pool), [parental-parts](Documents/legal/rules.md#parental-parts), [parental-docs](Documents/legal/rules.md#parental-docs), [base](Documents/legal/rules.md#base).

**Parametry:** `parental.part_time_max_fraction`, `parental.part_time_cap_weeks_single`, `parental.part_time_cap_weeks_multiple`, `deadlines.part_time_notice_days`.

**Combo:** Długi pomost; partnerzy: [5C](#5c); warunek `budget_ok`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="4d"></a>
### 4D · Rezerwa na adaptację

Zabezpiecz bieżącą opiekę i zachowaj konkretny blok rodzicielskiego na później.

**Kiedy:** Istnieje wykonalny plan pierwszego roku i przyszła potrzeba; pozostają właściwa pula, części i czas. Samo zachowanie urlopu nie zapewnia dzisiejszej opieki.

**Pieniądze:** Przelicz bieżące bloki i przyszłą prognozę osobno; przy uśrednieniu sprawdź ewentualną zmianę rozliczenia pierwszego roku.

**Czas:** Rezerwa nie zużywa części ani dni i nie zwiększa pokrytej opieki, dopóki nie stanie się blokiem.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "choice.parent",
    "kind": "parental",
    "start": "need:first_year",
    "days": "choice.first_year_parental_days"
  },
  {
    "op": "reserve",
    "who": "choice.parent",
    "pool": "parental",
    "start": "need:adaptation",
    "days": "choice.adaptation_reserve_days"
  }
]
```

**Podstawy:** [parental-pool](Documents/legal/rules.md#parental-pool), [parental-parts](Documents/legal/rules.md#parental-parts), [top-up](Documents/legal/rules.md#top-up), [parental-docs](Documents/legal/rules.md#parental-docs), [base](Documents/legal/rules.md#base).

**Parametry:** `parental.max_parts`, `parental.last_child_age_years`.

**Combo:** Rezerwa na później; partnerzy: [5A](#5a), [5B](#5b); warunek `covers_need`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="4e"></a>
### 4E · Wykorzystaj ojcowski

Zamień zachowaną pulę ojcowskiego w konkretną opiekę przed upływem terminu.

**Kiedy:** Po 2B albo 2C została pula; wybrany blok i wniosek mieszczą się w terminie. Przy adopcji użyj odrębnego zegara.

**Pieniądze:** Rozlicz wykorzystany blok tylko raz; sama wcześniejsza rezerwacja nie była wypłatą.

**Czas:** Odejmij wykorzystane dni i część; przyznaj pokrycie wyłącznie za rzeczywiście zamkniętą potrzebę.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "father",
    "kind": "paternity",
    "start": "need:paternity_later",
    "days": "derived.paternity_remaining",
    "consume_reservation": "paternity"
  }
]
```

**Podstawy:** [paternity](Documents/legal/rules.md#paternity), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `paternity.min_part_days`, `paternity.max_parts`, `paternity.notice_days`, `rates.paternity`.

**Combo:** Wykorzystana rezerwa; partnerzy: [2B](#2b), [2C](#2c); warunek `covers_need`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="4f"></a>
### 4F · Własny blok taty

Zaplanuj niewykorzystaną wyłączną część rodzicielskiego taty.

**Kiedy:** Ojciec uprawniony, jego wyłączna część nadal dostępna, pozostałe limity i terminy zachowane; dotyczy również właściwego scenariusza przyjęcia.

**Pieniądze:** Zasiłek za wyłączny blok według właściwej stawki od podstawy ojca, także gdy drugi rodzic ma wariant uśredniony.

**Czas:** Odejmij dni z części ojca i całej puli; nie dodawaj ich ponownie ponad pulę rodziny.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "father",
    "kind": "parental",
    "start": "need:father_solo",
    "days": "derived.father_exclusive_remaining"
  }
]
```

**Podstawy:** [parental-pool](Documents/legal/rules.md#parental-pool), [exclusive-rate](Documents/legal/rules.md#exclusive-rate), [parental-parts](Documents/legal/rules.md#parental-parts), [parental-docs](Documents/legal/rules.md#parental-docs), [base](Documents/legal/rules.md#base).

**Parametry:** `parental.exclusive_weeks`, `rates.parental`.

**Combo:** Obie pule w grze; partnerzy: [3B](#3b); warunek `covers_need`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

## 5. Kolejne lata

<a id="5a"></a>
### 5A · Spokojna adaptacja

Przeznacz pozostały rodzicielski na jeden blok adaptacji.

**Kiedy:** Finał planowany, właściwy rodzic ma dni i część; osiągalny wniosek, właściwy limit wieku oraz rzeczywista potrzeba.

**Pieniądze:** Zastąp dochód z pracy świadczeniem za blok i przelicz wariant; nie dodawaj wypłaty drugi raz za rezerwację.

**Czas:** Pokryj konkretne dni, zużyj pulę odpowiedniego rodzica i jedną część.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "choice.parent",
    "kind": "parental",
    "start": "need:adaptation",
    "days": "needs.adaptation.days",
    "consume_reservation": "parental"
  }
]
```

**Podstawy:** [parental-pool](Documents/legal/rules.md#parental-pool), [parental-parts](Documents/legal/rules.md#parental-parts), [parental-docs](Documents/legal/rules.md#parental-docs), [standard-rates](Documents/legal/rules.md#standard-rates), [averaged](Documents/legal/rules.md#averaged), [base](Documents/legal/rules.md#base).

**Parametry:** `parental.max_parts`, `parental.last_child_age_years`, `rates.parental`.

**Combo:** Rezerwa na później; partnerzy: [4D](#4d); warunek `covers_need`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="5b"></a>
### 5B · Dwie przerwy na opiekę

Rozdziel pozostały rodzicielski między dwa okresy potrzebne rodzinie.

**Kiedy:** Finał planowany, dwie rzeczywiste potrzeby, wystarczające dni i co najmniej dwie wolne części w limicie rodziny; oba wnioski na czas.

**Pieniądze:** Rozłóż świadczenie na miesiące obu bloków; oceń najniższy dochód w stałym horyzoncie.

**Czas:** Dwa bloki pokrywają dwie potrzeby i zużywają dwie części; sprawdź sumę wniosków obojga rodziców.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "choice.parent",
    "kind": "parental",
    "start": "need:adaptation",
    "days": "needs.adaptation.days",
    "consume_reservation": "parental"
  },
  {
    "op": "add_block",
    "who": "choice.parent",
    "kind": "parental",
    "start": "need:later_break",
    "days": "needs.later_break.days",
    "consume_reservation": "parental"
  }
]
```

**Podstawy:** [parental-pool](Documents/legal/rules.md#parental-pool), [parental-parts](Documents/legal/rules.md#parental-parts), [parental-docs](Documents/legal/rules.md#parental-docs), [standard-rates](Documents/legal/rules.md#standard-rates), [averaged](Documents/legal/rules.md#averaged), [base](Documents/legal/rules.md#base).

**Parametry:** `parental.max_parts`, `parental.last_child_age_years`.

**Combo:** Rezerwa na później; partnerzy: [4D](#4d); warunek `covers_need`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="5c"></a>
### 5C · Łagodny powrót do pracy

Wykorzystaj rodzicielski podczas adaptacji, łącząc go z częścią etatu.

**Kiedy:** Finał planowany; pracownik, dostępna pula i część, potwierdzona organizacja pracy, osiągalny termin. Cały wydłużony okres mieści się w granicach.

**Pieniądze:** Przelicz część wynagrodzenia i obniżony zasiłek przez właściwy okres; nie obiecuj automatycznie wyższego łącznego dochodu.

**Czas:** Oblicz wydłużenie i opiekę godzinową; pozostałe godziny wymagają innego opiekuna.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "choice.parent",
    "kind": "parental",
    "start": "need:adaptation",
    "days": "choice.adaptation_pool_days",
    "work_fraction": "choice.work_fraction",
    "duration_semantics": "pool_before_extension",
    "consume_reservation": "parental"
  }
]
```

**Podstawy:** [part-time](Documents/legal/rules.md#part-time), [parental-pool](Documents/legal/rules.md#parental-pool), [parental-parts](Documents/legal/rules.md#parental-parts), [parental-docs](Documents/legal/rules.md#parental-docs), [base](Documents/legal/rules.md#base).

**Parametry:** `parental.part_time_max_fraction`, `deadlines.part_time_notice_days`, `parental.part_time_cap_weeks_single`, `parental.part_time_cap_weeks_multiple`.

**Combo:** Długi pomost; partnerzy: [4C](#4c); warunek `budget_ok`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="5d"></a>
### 5D · Mama przejmuje nagłą opiekę

W kwalifikującej nagłej sytuacji zaplanuj opiekuńczy mamy.

**Kiedy:** Finał nagły; zdarzenie, wiek dziecka, ubezpieczenie, osobista opieka, dostępność domowników i wspólny roczny limit sprawdzone. Nie dotyczy dowolnej zaplanowanej przerwy placówki.

**Pieniądze:** Przelicz świadczenie od podstawy mamy i utracone wynagrodzenie; porównaj z wariantem taty.

**Czas:** Pokryj rzeczywiste dni nagłej opieki; odejmij je ze wspólnego limitu rocznego rodziny.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_care",
    "who": "mother",
    "start": "need:emergency",
    "days": "needs.emergency.days"
  },
  {
    "op": "mark_docs",
    "bundle": "care",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [care-right](Documents/legal/rules.md#care-right), [care-money](Documents/legal/rules.md#care-money), [care-docs](Documents/legal/rules.md#care-docs), [base](Documents/legal/rules.md#base), [debt](Documents/legal/rules.md#debt).

**Parametry:** `rates.care`, `care.days_per_year_child_under_14`.

**Combo:** Opieka we dwoje; partnerzy: [4F](#4f); warunek `covers_need`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="5e"></a>
### 5E · Tata przejmuje nagłą opiekę

W tej samej nagłej sytuacji zaplanuj opiekuńczy taty.

**Kiedy:** Jak w wariancie mamy, ale warunki spełnia ojciec. Ta sama potrzeba i te same daty umożliwiają uczciwe porównanie kwot.

**Pieniądze:** Przelicz świadczenie od podstawy taty i utracone wynagrodzenie; suma dla rodziny może być inna mimo tej samej liczby dni.

**Czas:** Ta sama opieka i ten sam wspólny limit; drugi rodzic nie dostaje świadczenia za te same dni.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_care",
    "who": "father",
    "start": "need:emergency",
    "days": "needs.emergency.days"
  },
  {
    "op": "mark_docs",
    "bundle": "care",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [care-right](Documents/legal/rules.md#care-right), [care-money](Documents/legal/rules.md#care-money), [care-docs](Documents/legal/rules.md#care-docs), [base](Documents/legal/rules.md#base), [debt](Documents/legal/rules.md#debt).

**Parametry:** `rates.care`, `care.days_per_year_child_under_14`.

**Combo:** Zmiana warty; partnerzy: [4A](#4a); warunek `covers_need`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="5f"></a>
### 5F · Nagła opieka na zmianę

Podziel kwalifikującą nagłą opiekę na kolejne dni mamy i taty.

**Kiedy:** Finał nagły, oboje spełniają warunki w swoich dniach; potrzeba pozwala na podział, dni są rozłączne, wspólny limit wystarcza.

**Pieniądze:** Każdy odcinek licz od podstawy jego opiekuna; bez dwóch świadczeń za ten sam dzień i bez sztucznego bonusu pieniężnego.

**Czas:** Dwa rozłączne odcinki pokrywają jedną potrzebę; łączny limit rodziny maleje o rzeczywistą liczbę dni.

**Wiedza:** +0 pkt; karty urlopowe nie zwiększają tego paska.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika.

**Zmiana stanu:**

```json
[
  {
    "op": "add_care",
    "who": "mother",
    "start": "need:emergency",
    "days": "choice.emergency_mother_days"
  },
  {
    "op": "add_care",
    "who": "father",
    "start": "after:emergency:mother",
    "days": "derived.emergency_remaining_days"
  },
  {
    "op": "mark_docs",
    "bundle": "care_both",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [care-right](Documents/legal/rules.md#care-right), [care-money](Documents/legal/rules.md#care-money), [care-docs](Documents/legal/rules.md#care-docs), [base](Documents/legal/rules.md#base), [debt](Documents/legal/rules.md#debt).

**Parametry:** `rates.care`, `care.days_per_year_child_under_14`.

**Combo:** Drużyna w gotowości; partnerzy: [4A](#4a); warunek `covers_need`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.
