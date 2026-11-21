# Talia 30 kart — projekt mechaniki

Po sześć kart na etap, trzy w ręce, jedna decyzja na rundę. Silnik strony głównej odtwarza jeden plan w trzech jawnych scenariuszach urodzenia; niewspierane lub niespełnione warunki blokują kartę. Starszy endpoint katalogu ma osobne 15 kart. Dane projektu: [deck-design.json](shared/deck-design.json). Zasady wspólne i tryby: [projekt działania](docs/card-grounding.md).

Pieniądze i czas są wyliczane z planu, nigdy dodawane jako stały bonus. Szczęście jest umownym bilansem pieniędzy i czasu. Punkty combo to osobny projekt. Zerowy wpływ decyzji formalnej na pieniądze lub czas jest poprawny. Wartości ustawowe są odczytywane przez referencje do parametrów, a nie utrzymywane w treści kart.

## 1. Ciąża / przygotowanie do przyjęcia

<a id="1a"></a>
### 1A · Macierzyński od narodzin

Zachowaj całą dostępną pulę macierzyńskiego na czas po porodzie.

**Kiedy:** Ścieżka urodzenia; brak rozpoczętego macierzyńskiego. Praca do porodu tylko przy braku stwierdzonej niezdolności; karta nie kasuje e-ZLA.

**Pieniądze:** Przed porodem pozostaje dochód z faktycznej sytuacji; po porodzie zasiłek według podstawy i wariantu.

**Czas:** Brak dodatkowych dni przed porodem; cała pula pozostaje po narodzinach.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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
### 1C · Zdrowie na pierwszym miejscu

Uporządkuj chorobowe w ciąży na podstawie wystawionego zwolnienia.

**Kiedy:** Niezdolność jest faktem z e-ZLA; ubezpieczenie, wyczekiwanie albo wyjątek i pozostały okres muszą być potwierdzone. Karta nie pozwala wybrać choroby.

**Pieniądze:** Przelicz wynagrodzenie chorobowe i zasiłek właściwe dla tytułu; uwzględnij podstawę i wykorzystane dni.

**Czas:** Dni niezdolności nie są automatycznie dniami zdolności do opieki; przed porodem nie zwiększają pokrycia potrzeb dziecka.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "mother",
    "kind": "sick",
    "start": "facts.ezla.start",
    "days": "facts.ezla.days"
  },
  {
    "op": "mark_docs",
    "bundle": "sick",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [sick-right](Documents/legal/rules.md#sick-right), [sick-money](Documents/legal/rules.md#sick-money), [sick-docs](Documents/legal/rules.md#sick-docs), [base](Documents/legal/rules.md#base), [debt](Documents/legal/rules.md#debt).

**Parametry:** `rates.sick_pregnancy`, `sick.period_days_pregnancy`, `sick.waiting_days_mandatory`, `sick.waiting_days_voluntary`, `sick.employer_days`, `sick.employer_days_50plus`.

**Combo:** Kompletna teczka; partnerzy: [3D](#3d); warunek `docs_complete`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="1d"></a>
### 1D · Kto wypłaca świadczenie?

Sprawdź, kto będzie płatnikiem zasiłku i jakie dane trzeba przygotować.

**Kiedy:** Dostępna od początku w każdej historii. Płatnik zależy od tytułu ubezpieczenia i liczby ubezpieczonych; samo sprawdzenie nie oznacza przyznania świadczenia.

**Pieniądze:** Samo ustalenie płatnika nie zwiększa kwoty ani nie tworzy uprawnienia.

**Czas:** Bez zmiany urlopu i dostępnych dni; to informacja organizacyjna.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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
### 1F · Przygotuj rodzinny start

Przygotuj plan i dokumenty na przyjęcie dziecka w adopcji albo pieczy niezawodowej.

**Kiedy:** Wyłącznie scenariusz przyjęcia. Rozdziel adopcję i pieczę; przyszłe zdarzenie nie tworzy dzisiejszego uprawnienia.

**Pieniądze:** Tylko prognoza przyszłego świadczenia po spełnieniu przesłanek; bieżący pewny dochód bez zmiany.

**Czas:** Rezerwacja nie jest wykorzystaniem urlopu ani dniem zapewnionej opieki; pokazuje przyszły plan.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

**Zmiana stanu:**

```json
[
  {
    "op": "set_flag",
    "name": "acceptance_plan",
    "value": "prepared"
  },
  {
    "op": "reserve",
    "pool": "on_maternity_terms",
    "who": "choice.parent",
    "start": "event:acceptance",
    "days": "derived.acceptance_entitlement",
    "provisional": true
  }
]
```

**Podstawy:** [adoption](Documents/legal/rules.md#adoption), [insured-parent](Documents/legal/rules.md#insured-parent), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `maternity.weeks_by_children`, `maternity.adoption_min_weeks`.

**Combo:** Gotowi na przyjęcie; partnerzy: [2F](#2f); warunek `docs_complete`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

## 2. Poród / przyjęcie

<a id="2a"></a>
### 2A · Razem na starcie

Zaplanuj cały dostępny ojcowski we wspólnym bloku po narodzinach.

**Kiedy:** Uprawniony ojciec, dostępna pełna pula, osiągalny termin wniosku i wykorzystania. Początek nie musi być dniem porodu.

**Pieniądze:** Za blok zastąp wynagrodzenie świadczeniem od podstawy ojca; stawka ojcowskiego jest niezależna od wariantu matki.

**Czas:** Zużyj pulę ojcowskiego; wspólne dni licz raz do pokrycia opieki, osobno do wspólnego czasu.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Czas:** Wpisz pierwszą część; pozostałe dni pozostają dostępne i nie są jeszcze pokrytą opieką.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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
### 2D · Uzupełniający dla mamy

Po hospitalizacji dziecka zaplanuj należny uzupełniający dla mamy.

**Kiedy:** Kwalifikująca hospitalizacja jest faktem. Prawo i wymiar obliczone; osiągalny termin, zaświadczenie, drugi rodzic nie korzysta z tego samego uprawnienia.

**Pieniądze:** Przelicz należny blok od podstawy mamy według stawki uzupełniającego; nie stosuj do niego automatycznie stawki uśrednionej.

**Czas:** Dodaj obliczony blok po macierzyńskim; nie odejmuj go z puli rodzicielskiego.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "mother",
    "kind": "supplementary",
    "start": "after:maternity",
    "days": "derived.supplementary_days"
  },
  {
    "op": "mark_docs",
    "bundle": "supplementary",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [supplementary](Documents/legal/rules.md#supplementary), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `rates.supplementary`, `supplementary.extreme.cap_weeks`, `supplementary.preterm.cap_weeks`, `supplementary.term.cap_weeks`, `deadlines.supplementary_notice_days_before_maternity_end`.

**Combo:** Bez luki; partnerzy: [4A](#4a); warunek `touching`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="2e"></a>
### 2E · Uzupełniający dla taty

Po hospitalizacji dziecka zaplanuj należny uzupełniający dla taty.

**Kiedy:** Jak dla uzupełniającego mamy, ale uprawniony jest ojciec; wybór rodzica nie powiększa wymiaru. Sprawdź dokumenty po drugim rodzicu.

**Pieniądze:** Zastąp dochód ojca odpowiednim świadczeniem; dochód mamy wynika z jej odrębnego statusu i faktycznego powrotu do pracy.

**Czas:** Jedna wspólna pula uzupełniającego; ten sam okres nie może zostać przyznany obojgu.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "father",
    "kind": "supplementary",
    "start": "after:maternity",
    "days": "derived.supplementary_days"
  },
  {
    "op": "mark_docs",
    "bundle": "supplementary_other_parent",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [supplementary](Documents/legal/rules.md#supplementary), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base), [insured-parent](Documents/legal/rules.md#insured-parent).

**Parametry:** `rates.supplementary`, `deadlines.supplementary_notice_days_before_maternity_end`.

**Combo:** Bez luki; partnerzy: [4A](#4a); warunek `touching`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="2f"></a>
### 2F · Witaj w rodzinie

Uruchom plan świadczeń po przyjęciu dziecka na wychowanie.

**Kiedy:** Potwierdzone przyjęcie; dla adopcji także wystąpienie do sądu, dla pieczy jej niezawodowy charakter. Wiek, liczba dzieci i dokumenty sprawdzone.

**Pieniądze:** Przelicz zasiłek od podstawy wybranego rodzica i właściwego wariantu; nie wypłacaj ponownie za rezerwację z 1F.

**Czas:** Wpisz rzeczywisty blok i właściwy wymiar dla wieku oraz ścieżki; nie używaj daty urodzenia jako daty przyjęcia.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

**Zmiana stanu:**

```json
[
  {
    "op": "add_block",
    "who": "choice.parent",
    "kind": "maternity",
    "start": "choice.acceptance_leave_start",
    "days": "derived.acceptance_entitlement",
    "context": "on_maternity_terms",
    "merge_into": "baseline.acceptance"
  },
  {
    "op": "mark_docs",
    "bundle": "acceptance",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [adoption](Documents/legal/rules.md#adoption), [insured-parent](Documents/legal/rules.md#insured-parent), [standard-rates](Documents/legal/rules.md#standard-rates), [base](Documents/legal/rules.md#base).

**Parametry:** `maternity.weeks_by_children`, `maternity.adoption_min_weeks`.

**Combo:** Gotowi na przyjęcie; partnerzy: [1F](#1f); warunek `docs_complete`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

## 3. Pierwszy miesiąc

<a id="3a"></a>
### 3A · Więcej na początku

Wybierz podstawowy wariant wypłat za macierzyński i rodzicielski.

**Kiedy:** Prawo potwierdzone, brak wcześniejszego wiążącego wyboru wariantu uśrednionego. To wybór porównywanych planów, nie dowolna zmiana już wypłaconych świadczeń.

**Pieniądze:** Przelicz wszystkie planowane okresy według ich stawek; pokaż zmianę między etapami i sumę świadczeń w tym samym horyzoncie.

**Czas:** Wariant stawek sam nie dodaje dni i nie zmienia puli urlopów.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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
### 3D · Teczka bez braków

Uzupełnij dokumenty, potwierdź podstawę i sprawdź, kto wypłaci świadczenie.

**Kiedy:** Otwarta sprawa, dostępne wymagane dokumenty i fakty potwierdzające prawo; brak dokumentu nie może być samą kartą zmieniony w dokument dostępny.

**Pieniądze:** Nie zwiększa należnego świadczenia. Potwierdzone dane mogą zmienić wcześniejszą prognozę; kompletność nie gwarantuje konkretnego dnia przelewu.

**Czas:** Bez dodatkowych dni urlopu; mniej otwartych formalności w planie.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

**Zmiana stanu:**

```json
[
  {
    "op": "mark_docs",
    "bundle": "current_entitlement",
    "only_if": "facts.documents_available"
  },
  {
    "op": "set_flag",
    "name": "payer_and_base_checked",
    "value": true
  }
]
```

**Podstawy:** [birth-docs](Documents/legal/rules.md#birth-docs), [payer](Documents/legal/rules.md#payer), [base](Documents/legal/rules.md#base), [insured-parent](Documents/legal/rules.md#insured-parent), [debt](Documents/legal/rules.md#debt), [floor](Documents/legal/rules.md#floor).

**Parametry:** `payer_threshold_insured`, `debt_threshold_pct_min_wage`, `contribution_deduction`.

**Combo:** Kompletna teczka; partnerzy: [1C](#1c), [1D](#1d), [2F](#2f); warunek `docs_complete`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

<a id="3e"></a>
### 3E · Uwzględnij dodatkowy wymiar

Zaktualizuj pulę rodzicielskiego na podstawie zaświadczenia „Za życiem”.

**Kiedy:** Wymagane zaświadczenie istnieje w scenariuszu i nie zostało już uwzględnione. Karta nie przyznaje diagnozy ani nie nagradza choroby.

**Pieniądze:** Samo potwierdzenie nie wypłaca pieniędzy. Prognoza zmienia się po przypisaniu dostępnych okresów konkretnym rodzicom.

**Czas:** Zaktualizuj uprawnioną pulę, osobno zachowaj części wyłączne; przy przyjęciu użyj właściwego wariantu.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

**Zmiana stanu:**

```json
[
  {
    "op": "set_flag",
    "name": "za_zyciem_verified",
    "value": true
  },
  {
    "op": "mark_docs",
    "bundle": "za_zyciem",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [za-zyciem](Documents/legal/rules.md#za-zyciem), [parental-pool](Documents/legal/rules.md#parental-pool), [parental-docs](Documents/legal/rules.md#parental-docs).

**Parametry:** `parental.weeks_za_zyciem_single`, `parental.weeks_za_zyciem_multiple`, `parental.exclusive_weeks`.

**Combo:** Plan na potrzeby; partnerzy: [4D](#4d); warunek `covers_need`; bonus mnożnika `0.25` po sprawdzeniu rzeczywistego planu.

<a id="3f"></a>
### 3F · Świadczenie po końcu umowy

Potwierdź odrębne prawo do macierzyńskiego po ustaniu ubezpieczenia.

**Kiedy:** Ustawowa przesłanka po ustaniu ubezpieczenia jest udokumentowana; nie zakładaj prawa po dowolnym zakończeniu pracy. Przypadki sporne i orzeczenia są faktami, nie wyborem gracza.

**Pieniądze:** Po potwierdzeniu przelicz podstawowy blok po porodzie; świadczenie sprzed porodu i po porodzie są odrębnymi okresami.

**Czas:** Pokazuje okres pobierania świadczenia bez fikcyjnego urlopu u byłego pracodawcy.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

**Zmiana stanu:**

```json
[
  {
    "op": "set_flag",
    "name": "post_insurance_entitlement_verified",
    "value": true
  },
  {
    "op": "mark_docs",
    "bundle": "post_insurance_maternity",
    "only_if": "facts.documents_available"
  }
]
```

**Podstawy:** [job-loss-after](Documents/legal/rules.md#job-loss-after), [insured-parent](Documents/legal/rules.md#insured-parent), [base](Documents/legal/rules.md#base), [payer](Documents/legal/rules.md#payer).

**Parametry:** `maternity.weeks_by_children`, `rates.maternity`.

**Combo:** Ciągłość wypłat; partnerzy: [1E](#1e); warunek `touching`; bonus mnożnika `0.50` po sprawdzeniu rzeczywistego planu.

## 4. Pierwszy rok

<a id="4a"></a>
### 4A · Opieka na zmianę

Ułóż rodzicielski w następujących po sobie blokach mamy i taty.

**Kiedy:** Oboje uprawnieni, dostępne pule i części, terminy wniosków osiągalne. Nie przenoś wyłącznej części między rodzicami.

**Pieniądze:** W każdym okresie przelicz pensję pracującego rodzica i zasiłek opiekuna od jego podstawy.

**Czas:** Kolejne bloki wydłużają pokryty kalendarz; zużywają odpowiednie pule i części obojga.

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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

**Szczęście:** pochodny bilans pieniędzy i czasu z [audytu wpływu](docs/card-impact-audit.md). Niepewne dane nie dają pewnego wyniku.

**Punkty combo (projekt):** 10 bazowych punktów; osobna autorska mechanika, niezależna od wskaźnika szczęścia.

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
