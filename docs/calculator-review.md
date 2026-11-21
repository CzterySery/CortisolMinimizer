# OtwarteKarty — przegląd kalkulatora i źródeł ZUS

Data przeglądu: 2026-11-21. Zakres: formularz krokowy, standardowe stawki i pule, podstawa, termin 81,5%, opisy wyniku oraz ograniczenia istniejącego silnika. Porównano kod z dostarczonymi transkrypcjami i oficjalnymi objaśnieniami. Nie jest to potwierdzenie pełnej obsługi wszystkich wyjątków ustawy.

Aktualizacja uproszczenia dochodów: `gross_monthly_estimate` przy umowie o pracę jest wyraźnie oznaczonym szacunkiem z jednej pensji brutto. Wykorzystuje wspólne odliczenia składek i próg minimalnej podstawy; nie tworzy fikcyjnych miesięcy historii i nie zmienia zadeklarowanej podstawy. Reguła `base.estimate` i komunikat nad tabelą oznaczają przybliżenie. Jedna wypłata nie zastępuje średniej z 12 pełnych miesięcy albo krótszego właściwego okresu — [objaśnienia ZUS](https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/podstawa-wymiaru/dla-pracownikow). Dla JDG/zlecenia nadal potrzebna jest podstawa zasiłku lub historia podstaw składek. Wykres pieniędzy usunięto z widoku wyników; backend nadal liczy dane miesięczne na potrzeby wspólnego silnika gry.

## Sprawdzone reguły

| Obszar | Podstawa | Wynik przeglądu |
| --- | --- | --- |
| Macierzyński: 20/31/33/35/37 tygodni; do 6 przed porodem z tej samej puli | [KP art. 180](../Documents/legal/labour-code.md#article-180) | Wersjonowane parametry i wspólna pula; pierwszy okres powstaje na backendzie, bez kopiowania prawa do formularza. |
| Rodzicielski: 41/43 tygodnie; 65/67 przy Za życiem; wyłączne 9 tygodni | [KP art. 182¹a](../Documents/legal/labour-code.md#article-1821a) | Wspólne zużycie rodziców; wyłączna część i limit 5 części są kontrolowane. |
| Stawki 100%, 70%, 81,5%; wyłączne 9 tygodni drugiego rodzica przy 70% | [Ustawa art. 31](../Documents/legal/benefits-act.md#article-31), [ZUS — wysokość](https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc) | Sprawdzone; wariant 81,5% w formularzu nie obiecuje tej stawki dla ojcowskiego ani uzupełniającego. |
| Wniosek 81,5% w ciągu 21 dni od zdarzenia | [Ustawa art. 30a](../Documents/legal/benefits-act.md#article-30a) | Dodano `averaged_request_on`. Wniosek terminowy nie jest oznaczany jako spóźniony tylko dlatego, że data przeglądania jest późniejsza. |
| Podstawa z 12 miesięcy, składki społeczne, stawka dzienna 1/30 | [Ustawa art. 36–38](../Documents/legal/benefits-act.md#article-36) | Formularz odróżnia podaną podstawę od historii wynagrodzeń brutto; nie odejmuje składek drugi raz od podanej podstawy. Brak danych nie tworzy wykresu z zerowym dochodem. |
| Podwyższenie do świadczenia rodzicielskiego | [Ustawa art. 31](../Documents/legal/benefits-act.md#article-31), [objaśnienia ZUS](https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc) | Naprawiono błędne stosowanie minimum do ojcowskiego. Wyrównanie do 100% nie dolicza ponownie kwoty pokrytej podwyższeniem. PIT i proporcja przy pracy częściowej pozostają ograniczeniem, ujawnionym w ostrzeżeniu dla niskich podstaw. |
| Łączenie rodzicielskiego z pracą | [KP art. 182¹e–182¹f](../Documents/legal/labour-code.md#article-1821e) | Udostępniono wymiar pracy w edytorze. Okres jest kalendarzowy, a zużycie puli proporcjonalne. Po zmianie rodzaju na inny okres wymiar pracy jest zerowany. |
| Adopcja i piecza niezawodowa | [KP art. 183](../Documents/legal/labour-code.md#article-183) | Zachowane wcześniejsze testy wieku, przyjęcia i sądu, minimalnych 9 tygodni, 38/62 tygodni i rodzeństwa. Początek wynika z przyjęcia oraz przesłanek sądowych, a nie z daty urodzenia starszego dziecka. |
| Hospitalizacja | [KP art. 180²](../Documents/legal/labour-code.md#article-1802), [MRPiPS — uzupełniający](https://www.gov.pl/web/rodzina/uzupelniajacy-urlop-macierzynski) | Sprawdzono okna 15/8 tygodni i wymaganie kolejnych dni dla porodu o czasie. UI pyta o kwalifikujące dni z zaświadczenia; nie potwierdza automatycznie tych warunków z samych sum dni. |
| Dokumenty, odbiorca i termin | [Rozporządzenie o dokumentach](../Documents/legal/benefit-documents.md), [Rozporządzenie o wnioskach](../Documents/legal/leave-applications.md) | Nadal wyprowadzane z planu przez backend; raport i przejście do wniosków dostępne dopiero po zatwierdzeniu planu bez błędów. |

## Ograniczenia, których nie należy przedstawiać jako pełnej zgodności

- Budżet rodziny używa podstawy zasiłku jako przybliżenia wynagrodzenia i proporcji dni kalendarzowych. Nie jest listą płac ani kwotą netto do przelewu.
- Plan stosuje jedną podstawę rodzica i jedną wersję parametrów przez cały okres. Ponowne ustalenie podstawy po odpowiedniej przerwie, zmiany parametrów w trakcie planu i waloryzacja rehabilitacyjnego wymagają dalszej implementacji.
- Podwyższenie do świadczenia rodzicielskiego powinno uwzględniać zaliczkę PIT. Uproszczony silnik jej nie liczy; reguła ostrzega dla niskich podstaw. Niepełny etat nie ma kompletnej obsługi tego podwyższenia.
- Złożone premie i składniki niepodlegające uzupełnieniu, szczegółowe reguły JDG, historyczne dni choroby i przerwy między okresami nie są obsłużone w pełni.
- Samo dodanie opiekuńczego lub rehabilitacyjnego nie dowodzi przesłanek medycznych i rodzinnych. Ręczny kalkulator nie zastępuje potwierdzenia tych faktów.
- Pozostają odłożone szczególne sytuacje straty dziecka i przejęcia urlopu, wyjątki po ustaniu ubezpieczenia oraz pełna historia wykorzystania urlopów/części przy przejściu z pieczy do adopcji.
- Formularz nadal oczekuje kwalifikujących dni hospitalizacji. Nie wyznacza ich sam z poszczególnych dat pobytu.
- Przy niepodanej liczbie ubezpieczonych backend przyjmuje domyślnie 0 i wskazuje ZUS jako płatnika. Wynik jawnie pokazuje to założenie i prosi o potwierdzenie liczby u pracodawcy/zleceniodawcy; ustawienie większej liczby zmienia odbiorców zgodnie z progiem parametrów.

Ograniczenia są dostępne przy wyniku. Formularz nie pokazuje raportów finansowych dla planu z błędami i nie traktuje brakującej podstawy jako rzeczywistego zera.

## Weryfikacja

Testy regresji: [test_calculator_review.py](../backend/tests/test_calculator_review.py). Testy przeglądarkowe obejmują stopniowe ujawnianie pól, brak wywołania raportu przed końcem, cofanie, adopcję, pieczę, hospitalizację, brak dochodów i spóźniony wniosek: [calculator-family.spec.ts](../frontend/e2e/calculator-family.spec.ts). Pełna ścieżka z gry również przechodzi wszystkie kroki.
