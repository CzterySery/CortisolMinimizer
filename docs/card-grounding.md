# Gra i grounding 30 kart

Projekt obejmuje talię i jej uzasadnienia prawne. [30 kart](../cards-30.md) oraz [dane talii](../shared/deck-design.json) są już podpięte do strony głównej: można tasować, wybrać po jednej z trzech kart na etap i przeglądać sześć kart każdego etapu. Jest to podgląd projektu, nie działający kalkulator. Backendowy [katalog](../shared/cards.json) pozostaje na 15 kartach do czasu rozdzielenia puli i ręki w kontrakcie oraz wdrożenia efektów. Adnotacje UI są osobnym rozszerzeniem typu karty, bez zmiany kontraktu API.

## Rozdanie i wspólny stan

Pięć rund, sześć kart w puli każdej rundy, trzy w ręce, jedna na stole. Pierwsze dwie rundy mają alternatywne opisy przy adopcji i pieczy: przygotowanie oraz przyjęcie dziecka. Historia nie udaje ciąży rodziców adopcyjnych.

Plan składa się z faktów rodziny i bloków. Choroba, hospitalizacja, zaświadczenie, likwidacja pracodawcy i decyzja o rehabilitacyjnym są faktami. Karta wybiera reakcję, nie tworzy tych okoliczności. `mark_docs` może oznaczyć tylko dokument faktycznie dostępny w scenariuszu.

**Plan bazowy musi istnieć niezależnie od kart.** Po urodzeniu dodajemy podstawowy macierzyński uprawnionej matki od właściwego dnia, z uwzględnieniem okresu przed porodem. Przy przyjęciu bazowy blok zależy od odrębnych przesłanek i wniosku. Karty 1A, 1B i 2F konfigurują lub scalają ten plan; nie dodają drugiej kopii urlopu. Podobnie zweryfikowane dodatkowe uprawnienia wynikają z faktów, a nie z wylosowania konkretnej karty.

Karta z samą rezerwacją nie zużywa puli, nie zajmuje części i nie daje bieżącej wypłaty. Rezerwacje muszą jednak blokować wielokrotne obiecanie tych samych dni. Po zamianie na blok konsumujemy rezerwację, a pulę zmniejszamy raz. W podglądzie oddzielamy przyszły plan warunkowy od potwierdzonych wypłat.

Efekty w JSON są deklaratywną specyfikacją: `add_block`, `set_rate_variant`, `set_flag`, `reserve`, `mark_docs`, `transfer_maternity`, `add_care`. `choice.*` to wybór gracza zatwierdzony przez serwer, `facts.*` to potwierdzone fakty, `needs.*` to datowane potrzeby opieki, `derived.*` to wynik reguł, `params.*` to aktywna konfiguracja. `only_if`, `merge_into` i `consume_reservation` wymagają implementacji. Brak takiej implementacji blokuje włączenie talii do runtime.

## Pieniądze, czas i szczęście

| Statystyka | Znaczenie | Zmiana po karcie |
| --- | --- | --- |
| Pieniądze | Najniższy miesięczny dochód rodziny w z góry ustalonym horyzoncie scenariusza | Ponowne obliczenie wynagrodzeń, świadczeń i podwyższeń; delta do tego samego planu i horyzontu |
| Czas | Liczba dni, w których zapewniono wymaganą opiekę | Unia pokrytych potrzeb, bez podwójnego liczenia wspólnych dni; przy pracy częściowej wymagane pokrycie godzinowe |
| Szczęście | Autorskie punkty za wykonalne decyzje i osiągnięcie celu | Bazowo 10 punktów za każdą zrealizowaną decyzję; combo i premia wybranego trybu |

Każda karta ma opis wpływu na wszystkie trzy statystyki. Nie wymuszamy niezerowej zmiany: samo uporządkowanie dokumentów nie podnosi należnego świadczenia ani nie daje urlopu. Punkty przyznajemy za organizację planu, nie za chorobę czy diagnozę. Zdarzenia związane ze śmiercią dziecka lub matki i porzuceniem nie są punktowanymi kartami tej talii.

Kwoty: `Decimal`, grosze, dzienna stawka zgodna z odpowiednimi przepisami, indywidualna podstawa, jawny model wynagrodzenia i podatków. Opis karty nie może obiecywać pensji netto. Wariant uśredniony nie jest automatycznie korzystniejszy w sumie. Zaokrąglenia i kolejność etapów obliczenia muszą być udokumentowane przez kalkulator.

Brak bloku nie może zawsze oznaczać wynagrodzenia: po zakończeniu umowy i bez zatrudnienia nie ma pensji z tej pracy. Niezdolność do pracy nie oznacza automatycznie zdolności do osobistej opieki. Ojciec na ojcowskim przy mamie na macierzyńskim nie tworzy dwóch dni pokrycia jednej potrzeby.

## Trzy tryby na tych samych regułach

Tryb nie zmienia prawa, stawek, dostępności kart ani kwot. Dostępny jest ten sam komplet wyjaśnień i ten sam podgląd trzech celów. Poniższe wagi są propozycją balansu, bez podstawy prawnej.

| Tryb | Cel końcowy 0–100 | Sposób liczenia |
| --- | --- | --- |
| Kortyzol Minimizer | Przewidywalny plan | 40% pokrycia potrzeb opieki, 30% udziału miesięcy z budżetem co najmniej na poziomie celu, 30% terminowo skompletowanych wymaganych dokumentów |
| Zasiłki Maxing | Wykorzystanie należnych świadczeń | Suma świadczeń po uwzględnieniu podstaw i podwyższeń, porównana z wykonalnym maksimum dla tego scenariusza, potrzeb i horyzontu; obok zawsze całkowity dochód rodziny |
| Aura Farming | Realizacja rodzinnego podziału opieki | 50% pokrycia uzgodnionych celów wspólnej opieki i 50% pokrycia celów samodzielnej opieki, według potrzeb scenariusza |

Dla samotnego rodzica cele aury dotyczą samodzielnej opieki i zorganizowanego wsparcia; nie wymagają nieistniejącego partnera. Nie wymagamy równego podziału za wszelką cenę. Brak celów danej kategorii wyłącza ją z mianownika i przeskalowuje pozostałe wagi. Wynik pieniędzy porównujemy dla tej samej sytuacji i tych samych ograniczeń, nie między rodzinami. Maksimum nie może pochodzić z niewykonalnego układu. Jeśli brak dodatniego należnego świadczenia, cel ma status „nie dotyczy”, a nie karę za brak ubezpieczenia.

Proponowane szczęście: suma punktów kart z combo + do 50 punktów premii za wybrany cel, po normalizacji 0–100. To propozycja do playtestów. Choroby nie mają odrębnego bonusu. Cel i horyzont są zamrożone przed rozdaniem, żeby wybór krótkiego planu nie podnosił sztucznie wyniku.

Punkty po mnożniku zaokrąglamy do liczby całkowitej metodą ROUND_HALF_UP raz przy rozliczeniu zagrania; premię końcową analogicznie raz przy zakończeniu. Obliczenia balansu używają Decimal. Te reguły są autorską częścią punktacji, niezależną od zasad zaokrąglania świadczeń.

## Combo

Combo wymaga zarówno kart, jak i prawdziwego wyniku planu. `touching`: kolejne bloki opieki stykają się bez luki; `overlap`: konkretne bloki pokrywają się w potrzebnym okresie; `budget_ok`: wszystkie porównywane miesiące spełniają cel; `docs_complete`: dokumenty właściwe dla obu spraw są dostępne i terminowe; `covers_need`: bloki wskazanych kart rzeczywiście pokrywają datowaną potrzebę.

Oznaczenie w obu kartach nie tworzy dwóch bonusów. Klucz combo: nazwa + posortowane identyfikatory pary + identyfikator potrzeby. Lista `with` oznacza alternatywnych partnerów, nie obowiązek zebrania wszystkich. Mnożnik stosujemy tylko do bazowych punktów karty domykającej parę; nie mnożymy ponownie całego dotychczasowego wyniku. Symetryczne wpisy wymagają tego samego bonusu; sprzeczność jest błędem walidacji. Wartości wymagają balansu w playtestach.

## Grounding na poziomie informacji

Łańcuch: `card.claims[].rule_ids` → [rejestr reguł JSON](../shared/legal-rules.json) → dokładne oznaczenie przepisu, krótki cytat, kotwica Markdown, numer strony PDF i SHA-256 oryginału.

- `legal_parameter`: pojedyncza wartość pobierana z `parameter_ref`; po najechaniu własna reguła i właściwy parametr wersji.
- `legal_interpretation`: opis lub warunek z listą jednostek niezbędnych do jego potwierdzenia. To parafraza; nie przedstawiamy jej jako cytatu ustawy.
- `derived`: pieniądze, data lub pula — fakty wejściowe, wynik i kroki kalkulatora, każdy z własnym `rule_id`. Lista reguł projektu jest punktem startowym; runtime musi zawęzić ją do faktycznie użytych kroków.
- `game_design`: szczęście, combo i cele — objaśnienie mechaniki, bez udawanej podstawy prawnej.

Tekst renderujemy segmentami o stabilnych `claim_id`, nie przez wyszukiwanie liczb w opisie. Jedna zmiana liczby lub tłumaczenia nie może zerwać cytowania. Nazwa karty i tekst czysto narracyjny nie wymagają sztucznej podstawy prawnej. Dane rodziny wskazują swoje pochodzenie: formularz użytkownika, scenariusz albo symulacja ZUS.

Opis karty, warunki i każda statystyka mają przyciski z podpowiedzią przy najechaniu i jawnym oznaczeniem przepisu. Kliknięcie lub dotyk otwiera natywny dialog z cytatem, interpretacją i źródłem; Escape zamyka dialog i przywraca fokus. Powiązane parametry mają własne odnośniki do reguł. Strony `/sources/[id]` prezentują pełną transkrypcję z kotwicami, a publiczne pliki `/legal/` otwierają oryginały na stronie cytatu. Podpowiedź hover jest uzupełnieniem; pełna informacja jest dostępna z klawiatury i dotykiem.

Skrypt `prepare-legal-assets.mjs` uruchamia się przed `dev` i `build`, sprawdza SHA-256 i kopiuje wyłącznie sześć publicznych dokumentów z manifestu oraz ich transkrypcje. Katalog wynikowy jest ignorowany przez Git i pakowany do obrazu frontendu. Materiały przykładowych spraw pozostają wykluczone z kontekstu Dockera. Wybór jednego z trzech celów zmienia wskazówkę planowania; podgląd nie nalicza wyniku ani nie sprawdza prawnej wykonalności decyzji.

## Rozdawanie i szczególne ścieżki

Filtr faktów → symulacja efektów → walidacja prawna → kontrola następnych rund → rozdanie trzech różnych skutków z zapisanym ziarnem losowania. Nie losujemy hospitalizacji ani prawa do świadczenia jako „nagrody”.

W finale 5A–5C rozwiązują potrzeby planowane, a 5D–5F tę samą potrzebę nagłą. Nie mieszamy w jednym rozdaniu różnych zdarzeń bez wyjaśnienia. 5F wymaga dwóch uprawnionych rodziców i podzielnego okresu; nie jest uniwersalnym trzecim wyjściem.

**30 kart nie gwarantuje trzech legalnych opcji w każdej historii.** Przy adopcji, samotnym rodzicu lub szczególnym stanie mogą zostać mniej niż trzy opcje. W takim wypadku pokazujemy prawidłową kartę i wyłączone alternatywy z przyczyną; jeśli nie ma żadnej legalnej decyzji, scenariusz nie trafia do gry pięciorundowej. Potrzebne są testy pokrycia scenariuszy przed uruchomieniem silnika. Nie fabrykujemy uprawnień, aby zapełnić rękę.

W pierwszym wdrożeniu historia powinna być spójnym zestawem wykonalnych decyzji. Rezerwacja po rundzie 2 wymaga osiągalnego domknięcia w rundzie 4; przyszłe bloki i wnioski przygotowujemy wcześniej. Terminy wniosków nie są liczone dopiero od rundy, w której zdarzenie ma wystąpić.

## Parametry i kontrakt wymagające rozszerzenia

[Obecne parametry](../backend/app/data/params.json) nie obejmują całej talii. Zachowujemy je bez zmiany wartości; przed włączeniem projektu potrzebne są:

- Rehabilitacyjne: oddzielna stawka w ciąży, limit okresu i kwartalne wskaźniki waloryzacji podstawy. Nie wykorzystujemy stawki innego świadczenia tylko dlatego, że ma tę samą wartość.
- Rodzicielski przy „Za życiem”: limity wydłużenia 130/134 tygodni, art. 182¹f § 1¹. Obecne 82/86 nie wystarczają.
- Przyjęcie: odrębne granice wieku adopcji i pieczy, odroczenie obowiązku szkolnego, daty wystąpienia do sądu i prawomocnego przysposobienia, szczególne pule 38/62 tygodni oraz terminy wniosku o urlop. Nie stosujemy do wszystkich przyjęć granicy szóstego roku z urodzenia.
- Terminy zwykłego rodzicielskiego i przekazania macierzyńskiego: właściwe terminy wniosków każdego rodzica z art. 182¹d i art. 180 § 8–9. Nie zastępujemy ich terminem dla łączenia pracy.
- Hospitalizacja: przedziały konkretnych pobytów i dni kwalifikujących, nie tylko suma `hospital_days`; dzień/tydzień ciąży z odpowiednią precyzją i reguły brzegowe. Nie zaokrąglamy wieku ciążowego do całych tygodni przed kwalifikacją.
- Opiekuńczy: przyczyna, wiek dziecka, dostępność domowników, wspólny roczny licznik wykorzystania obojga rodziców, właściwe limity i podstawa art. 32–35. Przy pracy częściowej harmonogram godzinowy.
- Zatrudnienie: data i przyczyna ustania, okresy ubezpieczenia i wyjątki wyczekiwania, faktyczny dochód oraz zdolność do sprawowania opieki. `Family` obecnie nie niesie wszystkich tych danych.
- Parametry i reguły potrzebują zakresów obowiązywania; pojedyncze `effective_from` całego JSON-a nie wystarcza do planu wieloletniego. Parametr `voluntary_base_cap` wymaga jawnego określenia, czy jest limitem przed, czy po odliczeniu składek, żeby nie potrącić ich drugi raz.
- Produkcyjny kontrakt musi rozdzielić pulę kart od trzykartowej ręki i rozszerzyć `Source`/`Explain` o stabilne identyfikatory reguł oraz pochodzenie wyliczenia; potem regenerujemy typy z OpenAPI.

## Zakres wymagań konkursowych

Talia pokrywa ciąże, macierzyński i rodzicielski obojga rodziców, pracę częściową, przyjęcie dziecka, indywidualne podstawy, dokumenty i ryzyka. Nie zastępuje wymaganych symulacji integracji, obsługi przykładowych PDF-ów, panelu parametrów czy informacji o organizacjach pomocowych. Te elementy pozostają w planie projektu i są poza zakresem tej zmiany.
