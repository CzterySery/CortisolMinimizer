# OtwarteKarty

**LIVE DEMO:** [Otwarte Karty](https://charming-delight-production-38ec5aa2.up.railway.app/)

## Opis projektu

**OtwarteKarty – Przewodnik Przyszłego Rodzica** to aplikacja przygotowana na HackNation 2026 w odpowiedzi na wyzwanie ZUS. 

Pomaga ona rodzicom zrozumieć przysługujące świadczenia, podzielić opiekę nad dzieckiem i przejść od poznania możliwości do przygotowania wniosków. 

Łączy edukacyjną grę karcianą z kalkulatorem, który pokazuje kwoty świadczeń, kalendarz urlopów oraz potrzebne dokumenty, terminy i miejsca ich złożenia. Uwzględnia również adopcję i niezawodową pieczę zastępczą. Działa na komputerze i telefonie.

## Jak można skorzystać z aplikacji?

### Ścieżka od danych do wniosków

- **Od konta do nowych wniosków:** w „Moje dane” wybierasz logowanie przez mObywatela i jeden z trzech fikcyjnych profili. Aplikacja symuluje pobranie z ZUS informacji o ubezpieczeniu, składkach, zadłużeniu, zwolnieniach lekarskich i wcześniej złożonych wnioskach. Następnie w kalkulatorze przygotowujesz nowy plan rodziny i przechodzisz do dokumentów wynikających z tego planu.
- **Od razu do kalkulatora:** wpisujesz sytuację rodziny, dochody i planowane okresy opieki. Sprawdzasz podział urlopów między rodziców, wysokość świadczeń oraz skutki łączenia pracy z urlopem rodzicielskim. Gotowy plan prowadzi do listy dokumentów w „Moje dane”, gdzie możesz podejrzeć formularze, uzupełnić dostępne pola i zasymulować wysłanie wniosku do właściwego odbiorcy.
- **Od gry do własnego planu:** w pięciu rundach wybierasz karty przedstawiające sytuacje i decyzje rodziców. Poznajesz ich wpływ na budżet i czas opieki, korzystając ze strategii „Kortyzol Minimizer”, „Zasiłki Maxxing” lub „Balans Farming”. Wynik przenosisz do kalkulatora, dopasowujesz do swojej rodziny, a następnie przechodzisz do wniosków.

### Sprawdzenie sprawy ZUS

W **Sprawdź sprawę** możesz wybrać przykładową sprawę ZUS, wgrać PDF lub wpisać dane ręcznie, aby sprawdzić uprawnienia i przysługujące zasiłki. Aplikacja przy pomocy AI odczytuje wgrany PDF i wypełnia formularz, który możesz poprawić.

### Asystent AI

Asystent AI pomaga odnaleźć informacje w przepisach, a przydatne materiały kierują do oficjalnych źródeł i organizacji wspierających rodziców.

## Zakres symulacji i AI

**Zakres symulacji i AI:** logowanie mObywatel, pobieranie danych urzędowych i wysyłanie wniosków są symulowane. AI wspiera odczyt nieznanych skanów oraz, po skonfigurowaniu, formułowanie odpowiedzi asystenta na podstawie źródeł prawnych. Odczytane dane można poprawić; uprawnienia i kwoty wylicza kalkulator według zapisanych reguł.

## Architektura

Aplikacja składa się z trzech głównych części:

- **Frontend — Next.js + TypeScript:** interfejs gry, kalkulatora, konta i dokumentów, dostosowany do komputerów i telefonów.
- **Backend — Python + FastAPI:** wspólny kalkulator dla gry i oceny spraw, reguły świadczeń oraz obsługa wniosków i symulacji usług urzędowych.
- **Baza danych — PostgreSQL:** zapis planów, złożonych wniosków i wersji parametrów prawnych. Stawki, limity i terminy można zmieniać w panelu administracyjnym.


Główne katalogi: [frontend/](frontend/) — interfejs, [backend/](backend/) — obliczenia i API, [shared/](shared/) — karty i reguły, [Documents/legal/](Documents/legal/) — źródła prawne, [docs/](docs/) — dokumentacja.

Dokumentacja API po uruchomieniu: http://localhost:8000/docs.

## Instalacja i uruchomienie

Wymagane: Python 3.11+, Node.js 20.9+ z npm (22.6+ dla `npm run test:cards`), Docker.

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
cp -n .env.example .env    # odkomentuj API_URL=http://localhost:8000
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

#### Uwagi do wdrożenia

- Backend potrzebuje trwałego `DATABASE_URL` oraz stałego `SESSION_SECRET`, wspólnego dla wszystkich procesów i replik. Bez klucza sesji backend losuje go przy starcie, więc restart albo inny proces odrzuca wcześniejsze logowanie (`401`); interfejs prosi wtedy o ponowne zalogowanie.
- Frontend potrzebuje `API_URL` wskazującego ten backend.
- Konto i dokumenty są razem pod `/me` (dawny `/applications` przekierowuje do sekcji dokumentów). Konto pobiera historię z PostgreSQL także bez planu zapisanego w przeglądarce, a błędy odczytu można ponowić; brak odczytu nie powoduje cichej wysyłki anonimowej.
- Anonimowe potwierdzenia wysyłki zostają w `sessionStorage` danej domeny i karty, więc nie przenoszą się z localhosta na publiczne demo.
- Plik `.env` z samymi `GEMINI_API_KEY`/`GEMINI_MODEL` konfiguruje AI, nie sesje ani bazę.
- Automatyczne wypełnienie formularzy wymaga aktualnego backendu: `/api/v1/zus/me` musi zwracać `personal_data`, `insurance[].payer_data` i, dla znanego drugiego rodzica, `related_parents`. Jeśli po logowaniu formularze mają tylko imię i nazwisko, sprawdź te pola w odpowiedzi API oraz `API_URL`; wdróż aktualny backend i frontend, następnie zaloguj się ponownie. Sama aktualizacja interfejsu nie doda brakujących danych konta. Biblioteka oficjalnych wzorów na stronie głównej pokazuje puste druki; dane konta widać w dokumentach konkretnego planu w „Moje dane”.

## Sprawdzanie

```sh
cd backend && uv run pytest && uv run ruff check app tests   # testy jednostkowe, bez bazy
TEST_DATABASE_URL=postgresql://otwartekarty:otwartekarty@localhost:5432/otwartekarty uv run pytest -m integration
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npx playwright install chromium && npm run e2e   # na działającym stosie
python scripts/build_deck_design.py --check                     # talia, reguły i cytaty prawne
```

Po zmianie modeli w `backend/app/schemas.py` (przy działającym backendzie): `cd frontend && npm run gen:api`.
