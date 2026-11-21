# Silnik planszy

Strona główna wysyła wszystkie wybrane identyfikatory kart do `POST /api/v1/game/simulate`. Backend odtwarza plan od początku, a następnie zwraca wynik oraz sprawdzone warianty sześciu kart kolejnej tury. Przeglądarka nie liczy kwot, nie zwiększa puli i nie może zatwierdzić niedozwolonego planu. Rozdanie jest lokalne i zapewnia przynajmniej jedną dostępną kartę; endpoint symulacji nie zapisuje sesji ani nie gwarantuje uczciwości rozgrywki konkursowej. Starsze endpointy sesji pozostają osobnym, niewdrożonym interfejsem.

## Jedno źródło obliczeń

[engine.py](../backend/app/game/engine.py) interpretuje deklaratywne efekty [talii](../shared/deck-design.json) i rozwiązuje ich symbole przy użyciu [przykładowych historii](../backend/app/data/scenarios.json). Każdy wynik przechodzi przez [kalkulator planu](../backend/app/calc/plan.py) i [walidację prawną](../backend/app/calc/rules.py). Limity i stawki pochodzą z [wersjonowanych parametrów](../backend/app/data/params.json), aktywnych w dniu narodzin. Scenariusz zawiera wyłącznie przykładowe dane i wybory, nie duplikaty limitów prawnych.

- Macierzyński jest w planie niezależnie od losowania. Karta 1B przesuwa początek tego samego bloku, nie dodaje drugiego. Liczba dni po porodzie maleje o dni przed porodem — KP art. 180 § 1–3.
- Potwierdzone e-ZLA w historii szpitalnej jest w planie od początku. 1C porządkuje istniejący fakt bez dodania drugiego bloku; inna karta nie przywraca pensji za dni niezdolności, a nachodzący macierzyński jest blokowany.
- Ojcowski jest wspólną pulą kart 2A–2C i 4E; późniejsza karta dostaje rzeczywistą resztę. Części i termin sprawdza walidator — KP art. 182³.
- Rodzicielski jest jedną pulą obojga rodziców. Równoczesne korzystanie zużywa dzień każdej osoby; rezerwa nie zwiększa puli. Pełne wykorzystanie w 4A blokuje 5A–5C — KP art. 182¹a, 182¹c–182¹d.
- Część etatu wydłuża kalendarz bloku; zużycie to dni kalendarzowe × (1 − wymiar pracy), z kontrolą ustawowego maksimum. Niepełny dzień przedłużenia jest pomijany — KP art. 182¹e–182¹f.
- Opiekuńczy ma odrębny wspólny limit w roku kalendarzowym; 5F rozdziela potrzebę na rozłączne odcinki — art. 32–35 ustawy zasiłkowej.
- Karty formalności, w tym nowa 1E „Sprawdź podstawę zasiłku”, nie tworzą ani kwoty, ani dni wolnych. Podstawa jest w scenariuszu potwierdzoną daną, nie kwotą zwiększaną przez zagranie karty.

Każda karta zachowuje wyjaśnienia i dokładne [odnośniki do źródeł](../Documents/legal/rules.md). Dodatkowo sprawdzono oficjalne omówienia: [rodzicielski — MRPiPS](https://www.gov.pl/web/rodzina/urlop-rodzicielski), [łączenie z pracą — PIP](https://www.pip.gov.pl/dla-pracodawcow/pytania-i-odpowiedzi/czy-pracownik-moze-laczyc-urlop-rodzicielski-z-wykonywaniem-pracy), [stawki — ZUS](https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc).

## Paski i porównania

Wszystkie alternatywy mają ten sam okres, określony w scenariuszu; nie skracamy go po wybraniu krótszego urlopu.

- Pieniądze: najniższy miesięczny dochód w tym okresie względem sumy podstaw rodziców (wskaźnik ograniczony do pełnego paska).
- Czas: pokrycie stałych potrzeb opieki. Jednego dnia rodziny nie liczymy dwukrotnie; przy części etatu liczy się dostępna część dnia. Zdolność do opieki nie wynika z e-ZLA ani rehabilitacji.
- Szczęście: średnia z proporcji dochodu i pokrycia opieki. Jest autorską konwencją gry, bez bonusów combo i bez twierdzeń o zdrowiu.

Hover pokazuje wynik alternatywy całego planu. Po zagraniu obliczenia stają się bieżącym stanem. Opisy w modalach nadal przedstawiają prawdziwe, warunkowe porównania z audytu; nie są sumowane jak punkty.

## Zakres i ograniczenia

Dostępne są trzy jawne historie: standardowa rodzina na UoP, potwierdzone e-ZLA i kwalifikująca hospitalizacja wcześniaka oraz potwierdzone Za życiem. Potwierdzone nagłe zachorowanie starszego dziecka i brak dostępnego domownika są założeniami scenariusza dla 5D–5F. Dodatkowa pula Za życiem istnieje od początku; karta 3E jej nie tworzy.

1D (rehabilitacja), 1F/2F (adopcja/piecza) oraz 3F (koniec ubezpieczenia) pozostają wyłączone z podaniem konkretnej przyczyny: obecne historie lub model danych nie wystarczają do rzetelnej aktywacji. Nie wymyślamy orzeczenia, przyjęcia dziecka ani ustania zatrudnienia. Pełne formularze dokumentów i ich potwierdzenia nie są jeszcze wdrożone; efekty formalne nie są równoznaczne ze złożeniem wniosku.

Kalkulator ma opisane w kodzie uproszczenia: pensja na podstawie zasiłkowej, bez PIT, proporcja kalendarzowa za część miesiąca, jedna wersja parametrów i jedna podstawa na wieloletni plan. Kwoty są szacunkiem dla jawnej przykładowej rodziny, nie indywidualną decyzją ZUS. Gra wymaga backendu; przy braku połączenia blokuje zagranie zamiast wracać do fikcyjnych wyników. Odświeżenie strony rozpoczyna plan od początku.
