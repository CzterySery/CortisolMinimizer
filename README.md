# Cortisol Minimizer

Kliknięcie powierzchni karty, Enter/spacja lub przeciągnięcie zagrywa ją na stół; przyciski informacji otwierają źródła. Rozdania animują przejście kart ze stosu do ręki, a kliknięcie stosu rozpoczyna nowe rozdanie. Cele planowania znajdują się pod planszą. [Audyt wpływu 30 kart](docs/card-impact-audit.md) określa porównanie, okres, skutek teraz i później oraz podstawy prawne. Nieznany dochód pozostaje nieznany; szczęście jest bilansem pieniędzy i czasu, nie osobną premią.

Strona główna pokazuje [30 kart, po 6 na etap](cards-30.md), rozdaje trzy i przelicza jeden wspólny plan za pomocą backendowego kalkulatora. W pierwszej turze rozdanie losuje tylko karty dostępne w wybranej historii; opowieść standardowa ma cztery takie ścieżki: A, B, D i E. Karta 1D sprawdza, kto wypłaca świadczenie. Karty warunkowe 1C i 1F pozostają w bibliotece i trafiają do ręki tylko przy spełnionych przesłankach. Zużyte dni pozostają zużyte w kolejnych turach. Do wyboru są trzy jawne przykładowe historie rodziny. Przycisk „Przejrzyj 30 kart” otwiera całą talię, a opisy i warunki — cytaty oraz oryginalne PDF-y. [Zakres silnika i uproszczenia](docs/game-engine.md), [grounding](docs/card-grounding.md), [źródła prawne](Documents/legal/README.md). Starszy endpoint katalogu zachowuje wcześniejsze 15 kart. Kontrola projektu: `python scripts/build_deck_design.py --check`.

Gra edukacyjna na hackathon ZUS (HackNation 2026): **Python + FastAPI** oraz **React + Next.js (App Router) + TypeScript**. Pięć miejsc na decyzje jest na górze, niżej wachlarz ręki i obok niego paski równowagi. Każda decyzja ma kolorową ilustrację, zachowaną po przejściu na stół. Na telefonie karty układają się pionowo, a paski pod ręką.

Strona główna to interaktywny podgląd pięciu rund. Karty wysuwają się po najechaniu myszką; przeciągnij jedną na podświetlone miejsce na stole lub użyj przycisku „Połóż na stole” (również na telefonie i klawiaturą). Po położeniu karty pojawia się ręka kolejnej rundy. Po pięciu decyzjach stół jest kompletny. „Rozdaj od nowa” czyści układ.

Plansza wymaga backendu i `API_URL` dla przeliczania stanu; nie zapisuje jeszcze sesji, więc odświeżenie strony rozpoczyna plan od nowa. Kalkulator korzysta z tego samego kodu. Gra nie tworzy wniosków: lista dokumentów (`/applications`) powstaje z własnego planu z kalkulatora. Sprawdzanie spraw i pozostałe niewdrożone endpointy zwracają `501` z numerem kroku planu. Ścieżki adopcji, rehabilitacji i ustania ubezpieczenia w grze są jawnie zablokowane do czasu uzupełnienia historii i modelu danych.

**AI:** aplikacja nie korzysta z AI. Kwoty i uprawnienia liczy deterministyczny kod, a stawki i limity są w `backend/app/data/params.json` (edytowalne w panelu administracyjnym).

Pełny plan projektu, konwencje i kolejność prac: [AGENTS.md](AGENTS.md).

## Struktura

```text
backend/
  app/
    main.py             # aplikacja, CORS, routery pod /api/v1
    schemas.py          # kontrakt API (karty, rundy, statystyki, plan, gra, sprawy, mocki)
    repositories.py     # katalog kart (JSON) + PostgreSQL: wersjonowane parametry, gry, wnioski
    params.py           # model parametrów prawnych
    api/                # catalog, calc, game, cases, gov_mock, info, admin
    data/               # params.json, links.json
  tests/
frontend/
  src/
    app/                # strony: gra, kalkulator, sprawy, wnioski, pomoc, mObywatel, admin; proxy /api/v1
    components/         # game/ (plansza), plan/ (wyniki), forms/, nagłówek i stopka
    hooks/              # use-game, use-plan
    lib/                # klient API (typy generowane z OpenAPI), formatowanie, etykiety, sesja
    types/game.ts       # aliasy typów gry z wygenerowanego kontraktu
shared/cards.json       # wspólny katalog kart dla obu aplikacji
scripts/sync_cards.py   # eksport 15 kart z cards.md
```

## Uruchomienie

Wymagane Python 3.11+, Node.js 20.9+ z npm oraz Docker (baza PostgreSQL).

Baza, z katalogu głównego (port 5432, użytkownik i hasło `zp`):

```sh
docker compose up -d db
```

Backend, z katalogu `backend/` (wariant z [uv](https://docs.astral.sh/uv/)):

```sh
uv sync --extra dev
ADMIN_TOKEN=dev uv run uvicorn app.main:app --reload --port 8000
```

Bez uv, z katalogu głównego:

```sh
python3 -m venv .venv && source .venv/bin/activate
pip install -e './backend[dev]'
cd backend && ADMIN_TOKEN=dev uvicorn app.main:app --reload --port 8000
```

Dokumentacja API: http://127.0.0.1:8000/docs

Frontend, w drugim terminalu:

```sh
cd frontend
npm install
npm run dev
```

Plansza: http://localhost:3000. Ilustracje i opisy korzystają z [talii 30 kart](shared/deck-design.json), a wyliczenia z API. `npm run dev` i `npm run build` przygotowują publiczne dokumenty źródłowe. Żeby plansza i pozostałe strony rozmawiały z FastAPI, utwórz `frontend/.env.local`:

```dotenv
API_URL=http://127.0.0.1:8000
```

Przeglądarka woła zawsze `/api/v1/...` na serwerze Next.js, który przekazuje żądanie pod `API_URL`. Adres backendu nie trafia do przeglądarki, a zmienna jest czytana w czasie działania. Bez `API_URL` te żądania zwracają `503`.

Oba serwisy w kontenerach, z katalogu głównego:

```sh
docker compose up --build
```

Produkcyjnie (publiczny jest tylko frontend na porcie 3000; TLS zapewnia reverse proxy albo load balancer hosta):

```sh
POSTGRES_PASSWORD=... ADMIN_TOKEN=... SESSION_SECRET=... \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Bez tych trzech zmiennych polecenie się nie uruchomi. Baza i backend nie mają publicznych portów.

## API

Wszystkie endpointy są pod `/api/v1`, a pełna lista jest w `/docs`. Działają już:

| Metoda | Ścieżka | Dane |
| --- | --- | --- |
| GET | `/api/v1/health` | status serwera |
| GET | `/api/v1/cards`, `/api/v1/rounds`, `/api/v1/rounds/{id}` | katalog kart i rund |
| GET | `/api/v1/game/preview` | statyczny podgląd planszy z pustymi statystykami |
| POST | `/api/v1/game/simulate` | odtworzenie wybranych kart, plan, wspólne pule i wykonalność kolejnych kart |
| POST | `/api/v1/calc/base`, `/api/v1/calc/plan` | podstawa zasiłku i kalkulator planu z walidacją prawną |
| GET | `/api/v1/info/links`, `/api/v1/info/charities` | oficjalne źródła (ZUS, MRPiPS, PIP) i sprawdzone fundacje (z numerem KRS) |
| GET/POST | `/api/v1/auth/personas`, `/api/v1/auth/mobywatel`, `/api/v1/zus/me` | symulowane logowanie mObywatel i konto eZUS: ubezpieczenia, e-ZLA, zaświadczenie o niezaleganiu, złożone dokumenty |
| POST | `/api/v1/applications`, `/api/v1/usc/birth-certificate`, `/api/v1/pue/messages` | symulowane wysłanie wniosku, wniosek o odpis aktu urodzenia, pytanie do ZUS (gotowe odpowiedzi) |
| GET/PUT | `/api/v1/admin/params` (+ `/versions`) | parametry prawne, każda zmiana to nowa wersja (nagłówek `Authorization: Bearer $ADMIN_TOKEN`) |
| GET | `/api/v1/admin/submissions` | wszystko, co wysłano przez symulowane kanały |
| GET/POST | `/api/v1/cases/samples`, `/api/v1/cases/parse`, `/api/v1/cases/evaluate` | przykładowe sprawy ZUS (same liczby), rozpoznanie wgranego PDF po skrócie SHA-256, ocena sprawy kalkulatorem |

Przykładowe sprawy ZUS to skany bez warstwy tekstowej. Aplikacja ich nie odczytuje (nie używa OCR ani AI): rozpoznaje wgrany plik przykładowej sprawy po skrócie, a inną sprawę wpisuje się ręcznie. Same dokumenty spraw są tylko lokalnie (`Documents/Sprawy `, poza repozytorium).

## Karty i późniejsza baza

Treść pochodzi z [cards.md](cards.md). [cards_inspo.md](cards_inspo.md) pozostaje materiałem do rozwoju, nie jest zestawem kart podglądu. Po zmianach tekstu wykonaj z katalogu głównego:

```sh
python3 scripts/sync_cards.py
```

Eksport nadpisuje katalog i zeruje listy źródeł; używaj go na etapie prototypu, zanim źródła i mechanika kart będą uzupełniane. Każda karta ma stabilny identyfikator (`1A`–`5C`), `round_id`, tytuł, opis i `sources`. Docelowe źródło ma `id`, `title`, `url` i opcjonalny `locator` (np. artykuł lub strona). Mechanika gry (`tags`, `requires`, `effects`, `chips`, `combos`) ma domyślnie puste wartości.

Trwałe dane są w [repositories.py](backend/app/repositories.py): katalog kart z JSON oraz PostgreSQL (`DATABASE_URL`, domyślnie baza z `docker compose up -d db`). Tabele i parametry startowe backend zakłada sam przy starcie. Backend domyślnie wymaga katalogu `shared` obok `backend`; przy przenoszeniu samego backendu ustaw `CARDS_DATA_PATH` na pełną ścieżkę pliku JSON. Opcjonalne zmienne opisuje [przykład konfiguracji](backend/.env.example).

## Sprawdzanie

```sh
cd backend && uv run pytest && uv run ruff check app tests   # testy jednostkowe, bez bazy
TEST_DATABASE_URL=postgresql://zp:zp@localhost:5432/zp uv run pytest -m integration   # SQL na prawdziwym PostgreSQL (schemat zp_test)
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npx playwright install chromium && npm run e2e   # ścieżka jurora na działającym stosie (docker compose up --build)
```

`npm run e2e` przechodzi grę, kalkulator, wnioski, logowanie mObywatel, sprawdzanie sprawy, pomoc i panel admina w widoku komputera (1280 px) i telefonu (375 px). Sprawdza, że żadna strona nie wychodzi poza szerokość ekranu, i zapisuje zrzuty do [docs/screenshots](docs/screenshots/).

Po zmianie modeli w `backend/app/schemas.py` (przy działającym backendzie) wygeneruj typy frontendu: `cd frontend && npm run gen:api`.

Przykładowe sprawy ZUS są wyłącznie do użytku HackNation i **nie mogą trafić do repozytorium** (`.gitignore` obejmuje `Documents/*[Ss]prawy*/`, a `.dockerignore` cały katalog `Documents/` poza źródłami prawnymi).
