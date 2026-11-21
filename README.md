# Zasiłkowy Poker

Szkielet gry edukacyjnej na hackathon ZUS: **Python + FastAPI** oraz **React + Next.js (App Router) + TypeScript**. Jasna plansza nawiązuje do szkicu: statystyki po lewej, pięć miejsc na decyzje na górze, talia w lewym dolnym rogu i trzy karty w ręce. Na telefonie karty układają się pionowo.

To wyłącznie podgląd pierwszej rundy. Nie ma losowania, wyboru kart, przechodzenia rund, przeliczania statystyk, sesji ani zapisu gry. Wartości statystyk są puste. Dekoracyjne paski nie przedstawiają wyliczonego stanu. Nazwa gry jest robocza.

## Struktura

```text
backend/
  app/
    main.py             # aplikacja i CORS
    api.py              # wyłącznie endpointy GET
    schemas.py          # modele kart, rund, statystyk i źródeł
    repositories.py     # odczyt JSON; punkt integracji z przyszłą bazą
  pyproject.toml
frontend/
  src/
    app/                # strona, layout, CSS, loading i obsługa błędów
    components/game/    # plansza, statystyki, etapy, karta
    lib/game.ts         # adapter danych: lokalny podgląd lub API
    types/game.ts       # typy kontraktu API
shared/cards.json       # wspólne dane dla obu aplikacji
scripts/sync_cards.py    # eksport 15 kart z cards.md
```

## Uruchomienie

Wymagane Python 3.11+ i Node.js 20.9+ z npm. Frontend może działać bez backendu.

Backend — z katalogu głównego repozytorium:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -e './backend[dev]'
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Dokumentacja API: http://127.0.0.1:8000/docs

Frontend — w drugim terminalu:

```sh
cd frontend
npm install
npm run dev
```

Plansza: http://localhost:3000. Bez konfiguracji odczytuje [lokalny katalog](shared/cards.json). Aby pobierać podgląd z FastAPI, utwórz `frontend/.env.local`:

```dotenv
API_URL=http://127.0.0.1:8000
```

Uruchom ponownie serwer Next.js. Żądanie do API wykonuje serwer Next.js; adres nie jest udostępniany przeglądarce. Błąd skonfigurowanego API wyświetla ekran ponowienia, bez ukrywania awarii lokalnymi danymi.

## API

| Metoda | Ścieżka | Dane |
| --- | --- | --- |
| GET | `/api/v1/health` | status serwera |
| GET | `/api/v1/cards` | wszystkie 15 kart |
| GET | `/api/v1/rounds` | katalog pięciu rund |
| GET | `/api/v1/rounds/{id}` | trzy karty wskazanej rundy lub 404 |
| GET | `/api/v1/game/preview` | statyczny widok rundy 1 z pustymi statystykami |

## Karty i późniejsza baza

Treść pochodzi z [cards.md](cards.md). [cards_inspo.md](cards_inspo.md) pozostaje materiałem do rozwoju, nie jest zestawem kart podglądu. Po zmianach tekstu wykonaj z katalogu głównego:

```sh
python3 scripts/sync_cards.py
```

Eksport nadpisuje katalog i zeruje listy źródeł; używaj go na etapie prototypu, zanim źródła będą uzupełniane. Każda karta ma stabilny identyfikator (`1A`–`5C`), `round_id`, tytuł, opis i `sources`. Docelowe źródło ma `id`, `title`, `url` i opcjonalny `locator` (np. artykuł lub strona). Źródła są obecnie puste; nie przypisujemy automatycznie podstaw prawnych. Frontend ma miejsce na ich wyświetlenie.

Przyszła baza może zawierać tabele `rounds`, `cards`, `sources` i tabelę łączącą `card_sources`. Zastąp odczyt w [repositories.py](backend/app/repositories.py), zachowując kontrakt API. Nie dodano jeszcze ORM ani migracji. Backend domyślnie wymaga katalogu `shared` obok `backend`; przy przenoszeniu samego backendu ustaw `CARDS_DATA_PATH` na pełną ścieżkę pliku JSON. Opcjonalne zmienne backendu opisuje [przykład konfiguracji](backend/.env.example); trzeba je wyeksportować w terminalu.

## Sprawdzanie

```sh
cd frontend
npm run typecheck
npm run lint
npm run build
```

Konfiguracja stosuje wymagania [Next.js](https://nextjs.org/docs/app/getting-started/installation) oraz standardowy układ aplikacji [FastAPI](https://fastapi.tiangolo.com/tutorial/first-steps/).
