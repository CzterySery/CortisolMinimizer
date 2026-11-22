# OtwarteKarty

Gra karciana i kalkulator zasiłków dla przyszłych rodziców (HackNation 2026, zadanie ZUS). Backend: **Python + FastAPI + PostgreSQL**. Frontend: **Next.js (App Router) + TypeScript**.

Plan projektu, konwencje i stan prac: [AGENTS.md](AGENTS.md).

## Architektura

```text
przeglądarka ──/api/v1/*──▶ Next.js (frontend/, port 3000) ──API_URL──▶ FastAPI (backend/, port 8000) ──▶ PostgreSQL
                                                                              └──▶ model AI (odczyt skanów spraw, redakcja odpowiedzi asystenta)
```

- **Przeglądarka nie woła FastAPI bezpośrednio.** Strony wołają `/api/v1/...` na serwerze Next.js, a [proxy](frontend/src/app/api/v1/[...path]/route.ts) przekazuje żądanie pod `API_URL` (zmienna tylko serwerowa, czytana w czasie działania). Bez `API_URL` te żądania zwracają `503`.
- **Kontrakt API** to modele Pydantic w [schemas.py](backend/app/schemas.py). Frontend generuje z nich typy (`npm run gen:api` → `frontend/src/lib/schema.d.ts`).
- **Jeden deterministyczny kalkulator** (`backend/app/calc/`, czyste funkcje) liczy grę, kalkulator i ocenę spraw: plan rodziny = fakty + okresy (bloki), z których wynikają kwoty, kalendarz opieki, pule, dokumenty i ryzyka.
- **Parametry prawne** (stawki, limity, terminy) są tylko w [params.json](backend/app/data/params.json) i [params-history.json](backend/app/data/params-history.json), wersjonowane w PostgreSQL i edytowalne w panelu administracyjnym.
- **Trwałe dane** są tylko w [repositories.py](backend/app/repositories.py). Tabele `config`, `games`, `submissions` i `uploads` backend tworzy sam przy starcie; nie ma migracji.
- **AI:** odczyt wgranych skanów spraw ([vision.py](backend/app/vision.py)) i redakcja odpowiedzi asystenta prawnego z wyszukanych fragmentów przepisów ([rag.py](backend/app/rag.py); bez klucza Gemini odpowiada lokalne wyszukiwanie, a odpowiedź modelu jest w interfejsie oznaczona). Model przepisuje fakty do formularza, który użytkownik sprawdza; prawo do zasiłku i kwoty liczy kalkulator. Dostawca jest wymienny ([llm.py](backend/app/llm.py), `LLM_PROVIDER`): Google Gemini albo dowolne API zgodne z OpenAI, także model lokalny lub open-weight (Ollama, vLLM, LM Studio) i europejski (Mistral). Nowy dostawca to jedna klasa. Bez skonfigurowanego dostawcy sprawę wpisuje się ręcznie.

```text
backend/
  app/
    main.py           # aplikacja, CORS, routery pod /api/v1
    schemas.py        # kontrakt API
    repositories.py   # katalog kart (JSON) + PostgreSQL
    params.py         # model parametrów prawnych
    vision.py         # odczyt skanów spraw: polecenie, schemat, walidacja
    llm.py            # wymienny dostawca modelu: Gemini albo API zgodne z OpenAI
    api/              # catalog, calc, game, cases, gov_mock, info, admin
    calc/             # base, plan, rules, paperwork, family: kalkulator
    game/             # engine: odtwarzanie zagranych kart w jeden plan
    data/             # parametry, scenariusze gry, persony, sprawy przykładowe, fundacje
  tests/
frontend/
  src/
    app/              # strony: gra, kalkulator, sprawy, wnioski, pomoc, mObywatel, admin, źródła; proxy /api/v1
    components/       # game/, plan/, forms/, landing/, nagłówek i stopka
    hooks/            # use-plan
    lib/              # klient API (typy z OpenAPI), formatowanie, etykiety, sesja, logika rozdania
    types/            # aliasy typów gry
shared/               # talia kart (deck-design.json, cards.json) i reguły prawne dla obu aplikacji
scripts/              # budowa talii i reguł, ekstrakcja źródeł prawnych, formularze ZUS
Documents/legal/      # transkrypcje dostarczonych źródeł prawnych
docs/                 # zakres silnika gry, grounding kart, przegląd kalkulatora, formularze
```

Pełny opis API: http://127.0.0.1:8000/docs (wszystkie endpointy pod `/api/v1`).

## Instalacja i uruchomienie

Wymagane: Python 3.11+, Node.js 20.9+ z npm (22.6+ dla `npm run test:cards`), Docker.

### Wszystko w kontenerach

Z katalogu głównego:

```sh
cp -n backend/.env.example backend/.env    # opcjonalnie dostawca modelu AI (LLM_PROVIDER, GEMINI_API_KEY, LLM_BASE_URL...)
docker compose up --build
```

Aplikacja: http://localhost:3000. Compose wczytuje `backend/.env` i `frontend/.env`, ale adres bazy, `ADMIN_TOKEN`, `SESSION_SECRET` i `API_URL` ustawia sam. Po zmianie pliku `.env` odtwórz kontener: `docker compose up -d backend`.

### Lokalnie

Baza (port 5432, użytkownik, hasło i baza `otwartekarty`):

```sh
docker compose up -d db
```

Backend, z katalogu `backend/` (z [uv](https://docs.astral.sh/uv/)):

```sh
uv sync --extra dev
cp -n .env.example .env
ADMIN_TOKEN=dev uv run uvicorn app.main:app --reload --port 8000 --env-file .env
```

Bez uv: `python3 -m venv .venv && source .venv/bin/activate && pip install -e './backend[dev]'`, potem to samo polecenie `uvicorn` z katalogu `backend/`.

Frontend, w drugim terminalu:

```sh
cd frontend
cp -n .env.example .env    # odkomentuj API_URL=http://127.0.0.1:8000
npm install
npm run dev
```

### Konfiguracja

Zmienne opisują [backend/.env.example](backend/.env.example) i [frontend/.env.example](frontend/.env.example). Pliki `.env` są w `.gitignore` i nie trafiają do obrazów Dockera.

### Produkcja

Publiczny jest tylko frontend (port 3000). TLS zapewnia reverse proxy albo load balancer hosta.

```sh
POSTGRES_PASSWORD=... ADMIN_TOKEN=... SESSION_SECRET=... \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Bez tych trzech zmiennych polecenie się nie uruchomi.

Konto i dokumenty są razem pod `/me`; dawny `/applications` przekierowuje do sekcji dokumentów. Konto pobiera historię z PostgreSQL także bez planu zapisanego w przeglądarce. Zalogowane wysyłki wracają z konta, a anonimowe potwierdzenia pozostają w `sessionStorage` danej domeny i karty przeglądarki — nie przenoszą się z localhosta na publiczne demo.

Przy wdrożeniu (także na Railway) backend potrzebuje trwałego `DATABASE_URL` oraz stałego `SESSION_SECRET`, wspólnego dla wszystkich procesów i replik. Bez klucza sesji backend losuje go przy starcie, więc restart albo inny proces odrzuca wcześniejsze logowanie (`401`); UI prosi wtedy o ponowne zalogowanie. Frontend potrzebuje `API_URL` wskazującego ten backend. Błędy odczytu konta są widoczne i można ponowić pobieranie; brak odczytu nie powoduje cichej wysyłki anonimowej. Plik z samymi `GEMINI_API_KEY`/`GEMINI_MODEL` konfiguruje AI, nie sesje ani bazę.

## Sprawdzanie

```sh
cd backend && uv run pytest && uv run ruff check app tests   # testy jednostkowe, bez bazy
TEST_DATABASE_URL=postgresql://otwartekarty:otwartekarty@localhost:5432/otwartekarty uv run pytest -m integration
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npx playwright install chromium && npm run e2e   # na działającym stosie
python scripts/build_deck_design.py --check                     # talia, reguły i cytaty prawne
```

Po zmianie modeli w `backend/app/schemas.py` (przy działającym backendzie): `cd frontend && npm run gen:api`.
