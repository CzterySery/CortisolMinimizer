# Zasiłkowy Poker

Gra edukacyjna na hackathon ZUS (HackNation 2026): **Python + FastAPI** oraz **React + Next.js (App Router) + TypeScript**. Jasna plansza nawiązuje do szkicu: statystyki po lewej, pięć miejsc na decyzje na górze, talia w lewym dolnym rogu i trzy karty w ręce. Na telefonie karty układają się pionowo.

Strona główna to interaktywny podgląd pięciu rund. Karty wysuwają się po najechaniu myszką; przeciągnij jedną na podświetlone miejsce na stole lub użyj przycisku „Połóż na stole” (również na telefonie i klawiaturą). Po położeniu karty pojawia się ręka kolejnej rundy. Po pięciu decyzjach stół jest kompletny. „Rozdaj od nowa” czyści układ.

Podgląd działa lokalnie, bez backendu: nie przelicza statystyk i nie zapisuje gry. Pełna gra (`/game/{id}`), kalkulator, sprawdzanie spraw, wnioski i panel administracyjny korzystają z API. Ich szkielet jest gotowy, a endpointy, których jeszcze nie zbudowano, zwracają `501` z numerem kroku planu. Nazwa gry jest robocza.

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

Plansza: http://localhost:3000. Bez konfiguracji działa tylko podgląd z [lokalnego katalogu](shared/cards.json). Żeby pozostałe strony rozmawiały z FastAPI, utwórz `frontend/.env.local`:

```dotenv
API_URL=http://127.0.0.1:8000
```

Przeglądarka woła zawsze `/api/v1/...` na serwerze Next.js, który przekazuje żądanie pod `API_URL`. Adres backendu nie trafia do przeglądarki, a zmienna jest czytana w czasie działania. Bez `API_URL` te żądania zwracają `503`.

Oba serwisy w kontenerach, z katalogu głównego:

```sh
docker compose up --build
```

## API

Wszystkie endpointy są pod `/api/v1`, a pełna lista jest w `/docs`. Działają już:

| Metoda | Ścieżka | Dane |
| --- | --- | --- |
| GET | `/api/v1/health` | status serwera |
| GET | `/api/v1/cards`, `/api/v1/rounds`, `/api/v1/rounds/{id}` | katalog kart i rund |
| GET | `/api/v1/game/preview` | statyczny podgląd planszy z pustymi statystykami |
| GET | `/api/v1/info/links` | oficjalne źródła (ZUS, MRPiPS, PIP) |
| GET/PUT | `/api/v1/admin/params` (+ `/versions`) | parametry prawne, każda zmiana to nowa wersja (nagłówek `Authorization: Bearer $ADMIN_TOKEN`) |

Pozostałe (kalkulator, gra z sesją, sprawy, symulacje mObywatel/PUE/wniosków, talia w panelu) mają gotowy kontrakt i zwracają `501` do czasu implementacji.

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
```

Po zmianie modeli w `backend/app/schemas.py` (przy działającym backendzie) wygeneruj typy frontendu: `cd frontend && npm run gen:api`.

Przykładowe sprawy ZUS są wyłącznie do użytku HackNation i **nie mogą trafić do repozytorium** (`.gitignore` obejmuje `Documents/Przykładowe sprawy/`).
