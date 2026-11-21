# Cortisol Minimizer: project plan & agent guide

> Keep this file current: any change to code, structure, tooling or the plan, and any non-obvious discovery, gets recorded here in the same piece of work.

## Context
This is a HackNation 2026 entry for the ZUS challenge "Zasiłkowy Przewodnik Przyszłego Rodzica". The brief is in `Documents/ZUS - Pełna treść zadania konkursowego.pdf` and the legal sources are in `Documents/Materiały dla uczestników/`.

The product is a responsive web app. Future parents play a card game with Balatro-like mechanics: 5 rounds (Ciąża → Poród → Pierwszy miesiąc → Pierwszy rok → Kolejne lata), 3 cards in hand per round, play 1 onto the table. The 5 played cards become the family's leave and benefit plan.

- **Active deck:** `cards.md` → `shared/cards.json` (15 cards, 3 per round).
- **Design reference:** `cards_inspo.md` (30 richer cards with conditions and combos), not the active deck.
- **Current designed deck:** `cards-30.md` / `shared/deck-design.json`: 30 cards, six per stage, three in a hand. This is a design specification, not the executable deck; the runtime engine is still unimplemented. `cards_inspo.md` is historical inspiration.
- **Grounding:** `Documents/legal/` holds page-preserving transcriptions of all six supplied public reference documents. `shared/legal-rules.json` / `Documents/legal/rules.md` map 31 rules to exact legal locators, checked quotes, Markdown anchors, PDF pages and source SHA-256. Each designed card has per-field claims and individually grounded parameter references. See `docs/card-grounding.md`.

**Jury weights:** challenge fit 25%, idea 20%, originality 15%, completeness/UX 25%, deployability 15%.

Jurors **will upload sample ZUS PDFs and check the computed amounts**. The brief also requires, simulated where noted:
- an integrated calculator (items b–f, j)
- documents, payer and deadlines (g); risks (h); charities (i)
- mObywatel login, ZUS data / e-ZLA / debt lookups, PUE contact (all simulated)
- form submission and a birth-certificate request (simulated)
- an admin panel for legal parameters
- a fully responsive UI

**Decisions:**
- **Backend:** Python 3.11+ + FastAPI + PostgreSQL 17 (Docker image `postgres:17-alpine`).
- **Frontend:** Next.js 16 (App Router, `src/`) with plain CSS.
- **No AI inside the app.** All rules are deterministic. Say so in the submission.
- **Naming:** use Cortisol Minimizer in code, UI metadata and new artifacts. The earlier gambling-related working name is retired.
- **Contract-first REST under `/api/v1`.** Pydantic models are described in OpenAPI, and the frontend generates its types from them.
- **The UI design comes from the team's board** (commit `0219fc3`/`1f0d26a`, pitygiusz). Every other screen follows its look.

**Core idea:** a single pure calculator powers both the game and the standalone calculator.
- A family plan = family facts + a list of **blocks** `{who, kind, start, days, work_fraction}`. Kinds: sick, rehab, job_loss_benefit, maternity, supplementary, paternity, parental, care, vacation. Days with no block count as work.
- Every stat is **derived** from facts + blocks + params: budget per month, care calendar, remaining pools/parts, documents and deadlines, risks.
- Cards only add blocks or set flags. Recomputing after each play updates the whole table, and nothing gets double-counted.

## Status (2026-11-21)
- **Current home engine:** `POST /api/v1/game/simulate` and `backend/app/game/engine.py` replay all selected authored cards into one `Plan`, using the shared `compute_plan` and `rules.check`. `scenarios.json` contains explicit sample UoP families (standard, qualifying preterm hospitalization/e-ZLA, Za życiem) and sample choices. Legal rates/pools remain in versioned params. Baseline maternity exists independently of drawing a card; prebirth shifts that same block, paternity/parental remain shared across rounds, reservations do not pay or consume leave until realized, full prior use disables later cards. Part-time extends the calendar and consumes the corresponding fraction. Inapplicable or unsupported cards remain inspectable but blocked with reasons. Home play requires the API and fails closed on disconnect; old `/game/{id}` session endpoints remain stubs, and refresh resets the home plan. See `docs/game-engine.md` for exact scope and calculator shortcuts. This supersedes earlier home-preview-only status bullets below.
- Home artwork now uses `card-artwork.tsx`: 30 stable SVG illustrations, six palettes and three decorative forms, reused in the table slots. Side cards tilt again; balance tracks sit beside the hand on desktop, below on mobile, without comments or displayed amounts. Hover uses the projected whole-plan result. Income and care coverage use a fixed horizon across all alternatives; happiness is the equal mean of their normalized ratios, with no combos. Details expose pools, calendar, assumptions and article-cited explanations.
- Card 1E is now “Sprawdź podstawę zasiłku”, grounded in the existing `base` rule, with zero money/time creation. Updated authoring source, generated deck/Markdown and impact audit together. Four paths (1D, 1F, 2F, 3F) are deliberately gated because supported scenarios/model facts do not establish rehabilitation, adoption/foster or employment-end rights. Do not enable them by guessing missing facts. Scenarios include confirmed care events/no other available caregiver for care cards; Za życiem entitlement exists before 3E is drawn.
- Medical facts are baseline state too: verified e-ZLA in the hospital story survives selecting 1A; 1C does not duplicate it; 1B cannot overlap it. Focused regression tests cover this plus fixed horizons, prebirth redistribution, exhausted pools, reservations, part-time, legal gating and derived happiness. Existing backend tests, frontend typecheck/lint/card tests, authoring/source checks and production Docker builds pass. Browser checks exercised a complete five-card game with five table illustrations, desktop hand/sidebar placement, distinct colors/tilts and mobile overflow (fixed by positioning hidden chart/calendar labels inside their scrolling containers). No new dependencies; existing root `.venv` reused. Source/session limitations are documented in `docs/game-engine.md`.
- Round 1 deals only options the current scenario can play; the standard story has 1A, 1B, 1D and 1E available (three drawn into the hand), while scenario-supported 1C may also appear in the hospital story. 1D is now a universally available payer-check information card (no money/time/pool effect), grounded in `payer` and `insured-parent`. Cards 1C/1F remain in the library and only appear in the hand when facts make them available. The balance panel is left of the hand on desktop and below it on narrow screens.
- Removed the stale engine gate that still treated revised 1D as rehabilitation; API now confirms A/B/D/E available in the standard first round. Focused game-engine unit tests (12) and ruff pass; frontend typecheck and lint pass; generated card/source checks pass. API health and homepage return 200 after backend refresh. Pinned backend Docker override was removed after the successful rebuild.
- Docker Hub rate-limited both `node:24-alpine` and `python:3.12-slim` tag metadata during the last refresh. Both images were successfully rebuilt with temporary local Dockerfile overrides pinned to the already cached base digests; overrides removed after refresh, original Dockerfiles unchanged, and the Postgres volume preserved.
- Remote refresh: `main` is synchronized with `origin/main` at `382f061`; fetch found no new commits. Application images were rebuilt and backend/frontend recreated without resetting PostgreSQL. Docker Hub returned 429 for base-tag resolution, so a temporary build override used locally cached Python/Node base digests; the override was removed and the project Dockerfiles remain unchanged. Homepage (200), proxied health and database-backed parameter versions all pass.
- Home board presentation: table and hand now precede the deck controls; preview balance bars render without commentary text; each authored card ID has its own visual symbol; the designed-card evidence dialog no longer shows combo proposals. These are presentation changes only. The current home game remains a qualitative preview, so cards still do not consume a calculated shared leave pool across rounds. Any runtime implementation must recompute one plan from all chosen blocks and shared statutory pools, and must ground each derived remainder in legal parameters; never imply the preview currently enforces this. Frontend typecheck, lint, production Docker build, container refresh and homepage HTTP 200 passed. The temporary digest-pinned Dockerfile used cached Node base layers after earlier Docker Hub throttling and was removed after refresh; the project Dockerfiles are unchanged.
**The home page now previews all 30 designed cards with evidence UI; executable mechanics remain unimplemented.**
- Card-impact review: `shared/card-impacts.json` / `docs/card-impact-audit.md` review all 30 cards against the supplied legal sources, with an explicit alternative, period, money/time direction, future effects and rule IDs. Deferral/part-time no longer incorrectly increase present free time; paperwork/reservations do not create income or leave. Income versus salary remains `depends` without family inputs. This is a conditional comparison audit, not certification of a working calculator.
- `card-signals.ts` now derives happiness solely from equally weighted money/time directions. Unknown inputs stay unknown; optional balance intervals position a hatched illustration, never a predicted quantity. `game_points` stores the legacy separate combo-point design; `stats.happiness` is a game balance, not chips. Backend session/calculator endpoints remain stubs; no family-specific legal eligibility or amounts are claimed.
- Card-body click and Enter/Space now play a card; buttons, links, selection and dialogs do not accidentally play it. A flight lock and short cooldown prevent duplicate plays. Restart/navigation cancels a pending flight without committing an old card. The mode choices moved below the board.
- A visible interactive `deck-stack` shuffles its layers and deals cards from its measured position into the hand using Web Animations. Playing animates a card onto the active slot. New-round/reset deal keys replay the sequence; reduced-motion bypasses flights and pile animations. No animation library added.
- Checks: `node scripts/check-card-impacts.mjs --write` regenerates the audit report; without the flag it validates coverage, source IDs and temporal invariants. `npm run test:cards` runs five focused tests for all-card coverage, deferral, paperwork, uncertainty and derived-balance properties. These authoring tests require Node 22.6+ for type stripping (Docker uses Node 24); app runtime minimum is unchanged.
- Home-page declutter: removed the simulation badge/explanatory sidebar paragraph, preview badge, introductory stage description, table heading/count and hand instruction/count. The chapter header stays on one line with responsive typography. The three money/time/happiness blocks now live inside the evidence dialog opened from a card's information sentence (or conditions), not on the card face; sidebar hover animation is unchanged. Legal data and citations are unchanged.
- Qualitative hover preview: `src/lib/card-signals.ts` contains authored visual-emphasis profiles for all 30 designed cards, separate from legal data and the calculator. Hover/focus smoothly animates the three sidebar tracks without amounts/days/scores. Pointer leave or blur restores the last played card, and reset clears the preview. Cards have a keyboard-focus path; touching an information button also focuses its card. Real API game cards never inherit these profiles by ID.
- Card effect buttons now show short contextual captions instead of “Zobacz wpływ” or a numeric point teaser. Click still opens the unchanged grounded explanation and source documents. Sidebar labels explicitly identify a qualitative simulation; bar lengths are visual emphasis, not better outcomes, legal predictions or real happiness. Legal parameter values/citations remain sourced independently.
- Hover UI verification: typecheck, lint and production Docker build pass; browser snapshots confirm card-dependent sidebar captions/track classes and zero remaining “Zobacz wpływ” captions. The simulation contains no displayed quantities. Legal explanations and source files were not altered by this change.
- Board layout: the shared header now displays “Nowy rozdział. Wasze zasady.” instead of the logo/product-name/tagline. Round context is compact and sits above the table; `RoundTrack` is immediately followed by the hand, keeping drag targets near the cards. The board retains a screen-reader h1 for the current stage.
- UI integration: `getGamePreview()` always maps `shared/deck-design.json` into UI-only card annotations, independent of `API_URL`. Backend API catalog remains at 15 cards and its contract is unchanged. Never attach new design metadata to old backend cards by ID: several IDs have different meanings.
- `PreviewGame` has three planning-goal choices, random three-of-six hands, reset and a complete 30-card library (`deck-library.tsx`). Goal selection changes guidance only, not computed scores. No legal eligibility filtering or fictitious money/time/score is applied in this preview.
- `card-grounding.tsx` exposes description, conditions, money/time effects, authored score and per-parameter references via native modal dialogs. Hover hints supplement click/touch/keyboard access. The library and evidence dialogs use native focus containment and Escape behavior.
- `/sources/[id]` prerenders six allowlisted transcriptions with legal-unit/page anchors. `scripts/prepare-legal-assets.mjs` runs before frontend dev/build, verifies source SHA-256 and exports only public manifest-listed originals and Markdown to ignored `frontend/public/legal/`. Docker now includes only legal transcriptions/public participant references from Documents; restricted sample cases remain excluded. No extra dependencies added.
- Designed 30 cards with conditions, declarative effects, derived money/time, authored happiness points and validated cross-round combos. No changes to the other product flows except replacing the retired brand in shared header/metadata/API title.
- Modes: Cortisol Minimizer, Zasiłki Maxing, Aura Farming use the same legal calculator; only objective scoring changes. Detailed proposed formulas and fairness rules are in `docs/card-grounding.md`.
- Authoring data lives in `scripts/build_deck_design.py`; run it to rebuild `cards-30.md`, `shared/deck-design.json`, `shared/legal-rules.json`, and `Documents/legal/rules.md`. `--check` verifies generated artifacts, 30 unique cards / six per stage, exact excerpts within their legal units, source hashes, parameter paths, unique anchors and reciprocal combo consistency.
- `scripts/extract_legal_sources.py` requires `scripts/requirements-legal.txt` (pypdf, authoring-only). It reads only the public reference-material directory, never restricted case files. DOCX is read via standard-library XML; its table layout is not reconstructed. Original filenames use decomposed Unicode: resolve actual paths, do not invent normalized filesystem paths.
- Source caveats: supplied act includes future-effective 2027 provisions; guide is dated 2026-04-01 and has older form names; act extract omits care articles 32–35. Care is grounded in the local guide and verified against the official Sejm consolidated text. See legal README for URLs and temporal caveats; `checked_against_supplied_file` is evidence validation, not legal certification.
- Discovered parameter/contract gaps are listed in `docs/card-grounding.md`: rehabilitation rate/cap/indexation, Za życiem part-time caps 130/134, adoption/foster ages and 38/62-week cases, transfer/parental application notices, precise hospital intervals, family-wide care counters, employment-end facts and hourly care. Existing `params.json` values were not silently changed. Missing legal configuration blocks runtime activation of the affected cards.
- Important state invariants: baseline maternity/acceptance plan exists independently of drawing a card; reservations are not benefits or covered care; consume them exactly once; no salary after an ended employment; sickness is not proof of ability to care. Zero money/time delta for paperwork is valid. Serious loss events remain outside scored gameplay.
- System `/usr/bin/git` fails through the Xcode selector, but `/Library/Developer/CommandLineTools/usr/bin/git` works directly; use that binary without changing global developer settings.
- Main was fast-forwarded to `d77862e` (PostgreSQL storage migration). All local card-design, legal-source and branding edits were preserved and reapplied without conflicts. A named safety stash (`Preserve card design and legal sources before main update`) remains as a backup; no push was performed. Docker has since been rebuilt with the 30-card UI and PostgreSQL; the previous SQLite volume was not deleted.
- Post-update checks: 7 unit tests passed; 3 PostgreSQL integration tests skipped because `TEST_DATABASE_URL` was not set. Frontend typecheck and full deck/source authoring validation passed. The local Python environment now includes the migration's already-declared `psycopg[binary]` dependency.
- Verification of this work: authoring validation passes for all 30 cards, 31 rules and 334 local links, including exact PDF quote pages and source hashes; new scripts pass ruff; backend 8/8 tests pass; frontend typecheck, lint and production build pass. Initial runs found missing local `python-multipart` and `openapi-fetch`; installing the already-declared dependencies resolved the checks. No application dependency contracts were expanded.

**Step 6 (admin) is done. Step 7 (jury cases) is next.**
- `GET /admin/submissions` lists everything sent through the simulated channels (`repositories.list_submissions()` without a persona). `/admin/submissions` shows kind, content, recipient, persona, status and date.
- `/admin` is now a typed parameters form: groups with Polish labels and units, fractions shown as percentages, version history, "Zapisz nową wersję" (still validated by `Params` on the backend). Labels live in `FIELDS` in `admin/page.tsx`; a new backend field shows under its key until it gets a label.
- **No runtime deck editor (decided):** the deck is authored in `scripts/build_deck_design.py`, whose `--check` verifies every legal quote against the source PDFs, and the board reads `deck-design.json` at build time. A browser JSON editor would bypass that validation and not reach the board. The brief only requires editable legal parameters. Removed `GET/PUT /admin/deck`, `/admin/deck` and the unused `JsonEditor`.
- The teammate's `540ff05` made 1D (rehab) playable; the coverage test's gated set is now 1F, 2F, 3F.
- Tests: 111 unit + 5 integration; frontend typecheck, lint and build pass; live-checked.

**Step 5 (simulated gov services) is done.**
- `backend/app/api/gov_mock.py`: `GET /auth/personas`, `POST /auth/mobywatel` (token = persona id + HMAC with `SESSION_SECRET`, random per process if unset), `GET /zus/me` → `ZusAccount{persona, insurance, ezla, debt, applications, plan}` (replaces the three `/zus/me/*` stubs), `POST /applications` and `POST /usc/birth-certificate` (stored in `submissions`, Bearer optional), `POST /pue/messages` (canned replies from `data/pue.json`, numbers filled from the params in force, question logged).
- Three fictional personas in `data/personas.json`, each a brief case: **anna** (UoP at a 12-person firm so ZUS pays, e-ZLA with code B, e-ZLA and Z-3 already filed), **magda** (JDG with a 150 zł debt that blocks benefits, base raised in pregnancy, partner on zlecenie without voluntary sickness), **ola** (fixed-term UoP ending before the birth, single mother, ZAM to ZUS after the contract). `test_gov.py` pins each persona's issue codes and checks that every filed form is among its plan's documents.
- Charities (`data/charities.json`): six foundations checked on their own websites on 2026-11-21, each with its KRS number: Wcześniak Rodzice-Rodzicom, Warszawskie Hospicjum dla Dzieci, Gajusz (perinatal hospice), Nagle Sami (helpline 800 108 108), Fundacja Ernesta (miscarriage/stillbirth), Zdążyć z Pomocą. Rodzić po Ludzku was left out: its site shows no loss support. Add an organisation only after checking its site and KRS.
- Paperwork fixes found with the personas: no documents for a zlecenie/JDG parent without voluntary sickness insurance; after `insured_until`, an employee files ZAM with ZUS and the former employer sends the Z-3; `Document` now has `start`/`end` for pre-filled forms.
- Frontend: `/me` shows the account (insurance, debt certificate, e-ZLA, filed documents) with "Przelicz mój plan w kalkulatorze" and "Moje wnioski"; `/applications` ticks documents ZUS already has (matched on form + parent) and offers a pre-filled form for the rest (USC form for the birth certificate); `/help` shows the charities and renders PUE answers with links.
- Tests: 110 unit (8 in `test_gov.py`, 2 new in `test_paperwork.py`) + 5 integration (submissions per persona); frontend typecheck, lint and build pass; live-checked against Postgres (test rows removed).

**Step 4 (game) is done.** The teammate's replay engine (`POST /game/simulate`, commit `bfc1fe7`) is the game engine; this step finished around it.
- Removed the never-implemented session game: `POST /game`, `GET /game/{id}`, preview/play/summary, `GET /game/scenarios`, their schemas (`GameState`, `NewGame`, `CardRequest`, `CardPreview`, `PlayResult`, `ScoreLine`) and the frontend `/game/[id]`, `/game/[id]/summary`, `use-game.ts`, `combo-toast.tsx`. The `Stage` alias is now `Omit<Round, "cards">` (openapi stopped emitting `Stage`).
- **Applications no longer depend on the game.** `/applications` reads the plan the user saved from `/calculator` ("Przygotuj wnioski dla tego planu", `myPlan` in sessionStorage) and lists its documents from `POST /calc/plan`. Marking documents already filed with ZUS comes with the step-5 login.
- The finished home game shows "Przelicz ten plan w kalkulatorze".
- Coverage test (`test_game_engine.py`): three least-played-first walks per scenario must always find a playable card, and together play every card except the four gated ones through a legal five-card plan. Backend 101 unit + 4 integration tests; frontend typecheck, lint and build pass; live-checked.

**Step 3 (paperwork) is done.**
- `backend/app/calc/paperwork.py`: `documents(plan, params)`, wired into `POST /calc/plan` (`PlanResult.documents`). Every `Document` now carries `rule` and `note` (how to file, what to attach, who issues it). Payer per art. 61 (`plan.payer()`) is also explained per parent in `explain`.
- Risks from the brief's part H are new `rules.py` issues: `insured-parent.not-yet-insured`, `insured-parent.started-in-pregnancy`, `insured-parent.ends-before-birth`, `base.raised-in-pregnancy`; plus the `transfer.notice` deadline. New facts/params: `Parent.insured_until`, `maternity.pregnancy_weeks`, `deadlines.maternity_takeover_notice_days` / `maternity_resign_notice_days`.
- Sources: the brief itself names the forms (Z-3, Z-3a, ZAS-12, ZAS-53, ZAM) and lists the risks (part H); the 2026 documents regulation (`Documents/legal/benefit-documents.md`, cited "rozp. dok.") names no forms, only annexes; leave applications are `Documents/legal/leave-applications.md` ("rozp. wn.").
- `/calculator` now starts with both parents (the second can be removed), and the documents checklist shows each note and rule.
- Tests: 87 unit (9 in `test_paperwork.py`, 5 new in `test_rules.py`) + 4 integration, ruff clean; frontend typecheck and lint pass; live-checked.

**Step 2 (calculator) is done: 2a benefit base, 2b plan ledger, 2c legal rules.** Step 2 was split so each part got reviewed on its own.
- `backend/app/calc/rules.py`: `check(plan, result, params) -> issues`, wired into `POST /calc/plan` after `compute_plan`. 45 issue codes grounded in KP art. 180–183 and ustawa art. 2a, 4, 8, 18, 29–34 (read from `Documents/legal/labour-code.md` and the act extract). Tests: 73 unit (43 in `test_rules.py`) + 4 integration, ruff clean; live-checked.
- `backend/app/calc/plan.py` + `POST /api/v1/calc/plan`: money per month (salary + benefit per parent), care calendar, remaining pools, article-cited `explain`, `top_up`. `issues` and `documents` stay empty until 2c / step 3. The `/calculator` page now gets real results.
- Tests: 30 unit (10 in `test_plan.py` with hand-computed amounts) + 4 integration, ruff clean; live-checked.
- `backend/app/calc/base.py` + `POST /api/v1/calc/base`: per-parent podstawa wymiaru with article-cited `steps`. Matches the grounded `base` rule in `shared/legal-rules.json` (art. 3 pkt 3–4, 36–42, 45, 47, 48–50).
- Tests: 19 unit (11 in `test_base.py`, no DB) + 4 Postgres integration, ruff clean. Live-checked against the dev DB.

**Step 1 (skeleton) is done and merged onto the team's UI.**
- **Backend:** catalog endpoints (`/cards`, `/rounds`, `/game/preview`), `/health`, `/info/links` and `/admin/params*` work. Every other endpoint returns **501 with its build step**. 7 unit tests (no database) and 3 Postgres integration tests pass; ruff is clean.
- **Frontend:**
  - `/` is the team's board in local preview mode (no backend needed).
  - Every other route, the plan views, forms, hooks and the typed API client exist. They render backend errors until their endpoints land.
  - Typecheck, lint and build all pass.
- **Docker:** `docker compose up --build` runs `db` (Postgres), `backend` and `frontend`. The frontend reaches the backend through the proxy, and the backend waits for a healthy database.
- The card library has been exercised in the integrated browser (30 unique cards across five stages, evidence modal and live PDF response). The local home loader is synchronous and has no network work. Hidden background browser tabs can retain Next's streamed loading fallback, so a full visual mobile/desktop pass should be repeated in an active tab; other product pages also still need their manual layout pass.
- UI integration checks: frontend typecheck and lint pass, production Docker build passes, source page and original PDF return 200, frontend → backend → PostgreSQL params query succeeds, all 10 backend unit/integration tests pass, and authoring validation still checks 30 cards / 31 rules / 334 local links. No runtime money or score calculations were added.

## Conventions
- **Backend:**
  - Start the database first: `docker compose up -d db` (from the repo root; port 5432, user/password/db `zp`).
  - Run from `backend/`: `uv sync --extra dev` then `ADMIN_TOKEN=dev uv run uvicorn app.main:app --reload`. pip also works: `pip install -e './backend[dev]'`.
  - Lint with `uv run ruff check app tests` (ruff sorts imports).
- **Tests:**
  - **Unit tests never touch a database.** `uv run pytest` runs them; the API `client` fixture stubs `repositories.init`. Calculator and game logic are pure functions, so their tests stay unit tests.
  - **Integration tests** (`@pytest.mark.integration`, `tests/test_repositories.py`) cover the SQL against real Postgres and are skipped unless `TEST_DATABASE_URL` is set: `TEST_DATABASE_URL=postgresql://zp:zp@localhost:5432/zp uv run pytest -m integration`. Each test recreates a `zp_test` schema, so pointing at the dev database leaves its tables alone (the schema stays behind until the next run).
  - Docs are at `/docs`. Health is at `/api/v1/health`; there is no root `/health`.
- **Frontend:** `cd frontend && npm install && npm run dev`. Check with `npm run typecheck && npm run lint && npm run build`.
- **API contract** lives in `backend/app/schemas.py`. Every model inherits `Model`, which sets `json_schema_serialization_defaults_required`, so defaulted fields are **required in responses and optional in requests**.
- **After any schema change**, with the backend running: `cd frontend && npm run gen:api` (writes `src/lib/schema.d.ts`; never edit it), then typecheck.
  - Models used both in requests and responses are split into `S["X-Input"]` / `S["X-Output"]` (e.g. `Plan-Input`, `Card-Output`, `Source-Output`). Others keep their plain name (`GameSimulation`, `Statistic`, `Round`, `Preview`, `PlanResult`).
  - Board components import friendly aliases from `src/types/game.ts`; everything else uses `S[...]` from `src/lib/api.ts`.
- **Persistence lives only in `backend/app/repositories.py`:** the card catalog (`shared/cards.json`, or `CARDS_DATA_PATH`) plus PostgreSQL via `psycopg` 3 (`DATABASE_URL`, default `postgresql://zp:zp@localhost:5432/zp` = the compose `db`). Tables `config` (versioned params, JSONB), `games` and `submissions` are created and seeded by `init()` at startup; there are no migrations yet (`CREATE TABLE IF NOT EXISTS`), so a column change needs a manual `ALTER` or a fresh volume. Callers use its functions, never SQL.
- **Legal numbers live only in `backend/app/data/params.json`.** They are admin-editable and versioned by `effective_from`. Never hardcode a rate, duration or limit in code, and that includes the frontend.
  - **Version 1 is the code's seed and is refreshed from `params.json` on every startup** (`repositories.init()` upserts it), so new legal fields reach existing databases without a reset. Admin edits are versions ≥ 2 and are never touched; a version ≥ 2 saved before a new `Params` field was added fails validation until it's re-saved through the admin panel.
- **Money is `Decimal`, rounded ROUND_HALF_UP to grosze.** The daily rate is monthly/30 (art. 36 ust. 3). Money crosses the API as decimal strings; the frontend only formats it (`src/lib/format.ts`). The sidebar stat `money` is a whole-złoty `int` for display.
- **The browser never calls FastAPI directly.**
  - Client code calls same-origin `/api/v1/*`. `src/app/api/v1/[...path]/route.ts` proxies to `API_URL`, which is server-only and read at runtime.
  - The proxy forwards only `accept`, `authorization` and `content-type`, and copies back only `content-type`, because fetch already decoded the body.
  - Without `API_URL`, the proxy returns 503 and only `/` works.
- **Frontend style:**
  - `src/` layout, `@/` = `src/`, **kebab-case file names**, named exports.
  - **Plain CSS only** in `src/app/globals.css`, using semantic classes in the existing compact style and palette (`--ink`, `--muted`, `--line`, `--green`, `--paper`; plus `--muted-strong`, `--warm`, `--alert`). No Tailwind, no CSS-in-JS.
  - Georgia serif for headings and card titles, small uppercase `.eyebrow` labels.
- **Next 16 differs from older versions.** Read `frontend/node_modules/next/dist/docs/` before using an unfamiliar API.
  - Route handler `params` is a Promise.
  - `useSearchParams` on a prerendered page needs `<Suspense>` (see `src/app/applications/page.tsx`).
  - `cacheComponents` is off, so `useParams` pages don't need Suspense.
- **Gotchas found during the merge:**
  - `frontend/next-env.d.ts` imports `.next/dev/types/*`, which only exists after `next dev`/`next build`, so `tsc` on a fresh clone can fail until one of them has run. Next rewrites this file, so expect diff churn.
  - `/` is prerendered at **build** time from the local 30-card design; once in the browser it plays through `POST /game/simulate` and fails closed without a backend.
  - `outputFileTracingRoot`/`turbopack.root` is the repo root (the UI imports `../shared/cards.json`), so standalone output nests under `.next/standalone/frontend/server.js`, and **both Docker images build from the repo root** (`docker-compose.yml`, root `.dockerignore`).
  - **Unicode file names:** `Documents/legal/manifest.json` stores the source PDF paths decomposed (NFD), while git and this checkout have them composed (NFC). macOS matches either, Linux in Docker compares bytes, so `scripts/prepare-legal-assets.mjs` resolves each path segment by its NFC form. Never build a path from the manifest by plain string join.
  - A `docker compose build` failing at `load metadata for ghcr.io/astral-sh/uv` with `failed to authorize ... EOF` is a registry/network hiccup, not the Dockerfile: retry or `docker pull ghcr.io/astral-sh/uv:0.11.19` first.
  - `scripts/sync_cards.py` **overwrites** `shared/cards.json` and resets `sources`. Once cards carry sources or game mechanics, it must merge instead of overwrite, or stop being used.
- **Language:** code and comments in English, UI in Polish. Every calculated amount carries an `Explain{text, rule}` citing the article.
- **Never commit ZUS sample-case documents.** They are for HackNation only (`.gitignore` covers `Documents/Przykładowe sprawy/`). Tests store only the numbers.
- Shortcuts with a known limit are marked in code as `# shortcut: <limit>, <when to upgrade>`.
- **Git:** commit directly on `main` (hackathon team, no feature branches). Small logical commits; never commit secrets or ZUS sample cases. Push only when asked.

## Repo layout
```
backend/
  app/
    main.py            # app, CORS, all routers under /api/v1, lifespan -> repositories.init()
    schemas.py         # API contract (catalog, family/plan, results, game, cases, gov mocks, admin)
    repositories.py    # catalog JSON + PostgreSQL (config versions, games, submissions)
    params.py          # Params model + active(on)
    api/               # catalog.py calc.py game.py cases.py gov_mock.py info.py admin.py  (todo(step) => 501)
    calc/              # base.py ✅  plan.py ✅  rules.py ✅  paperwork.py ✅
    game/              # engine.py (stateless replay of the designed deck) ✅
    data/              # params.json links.json scenarios.json personas.json charities.json pue.json (+ samples.json, step 7)
  tests/               # test_api.py, test_base.py, test_plan.py, test_rules.py, test_paperwork.py, test_game_engine.py, test_gov.py (unit, no DB), test_repositories.py (integration, Postgres)
  Dockerfile (context: repo root)   .env.example
frontend/
  src/app/             # page.tsx (/ preview board), game/[id], game/[id]/summary, calculator, cases, applications,
                       # help, login, me, admin/{,submissions}, api/v1/[...path]/route.ts (proxy), globals.css
  src/components/      # game/ (game-board, preview-game, round-track, decision-card, statistics, card-artwork, deck-library),
                       # plan/ (plan-timeline, budget-chart, care-calendar, pools-meter, docs-checklist),
                       # forms/ (family-form, blocks-editor), site-header, site-footer, page-header, api-result
  src/hooks/           # use-plan.ts
  src/lib/             # api.ts (openapi-fetch client), schema.d.ts (generated), game.ts (board preview loader),
                       # format.ts, labels.ts, session.ts
  src/types/game.ts    # aliases of generated game types
  Dockerfile (context: repo root)   .env.example
shared/cards.json      # card catalog for both apps      scripts/sync_cards.py   cards.md   cards_inspo.md
docker-compose.yml     .dockerignore                     Documents/
```

## Backend design

### 1. Params (`data/params.json`, Pydantic `Params`, versioned in the `config` table)
- `contribution_deduction 0.1371` (flat, non-employees and the art. 45 floor), `employee_contributions` 9.76% / 1.5% / 2.45% (employees: each withheld amount rounded on its own, art. 3 pkt 3), `min_wage 4806` (floor 4147.10), `voluntary_base_cap 20321.30` (**after** the deduction: 23 550 × 0.8629, applied to the final non-employee base), `parental_benefit_floor 1000` (art. 31 ust. 3a)
- **rates:** sick 0.80, sick_pregnancy 1.00, maternity / supplementary / paternity / job_loss 1.00, parental 0.70, averaged 0.815, care 0.80, rehab 0.90 for the first `rehab.first_period_days` (90) then 0.75, rehab_pregnancy 1.00 (art. 19 ust. 1); `rehab.max_months` 12 (art. 18 ust. 2)
- **sick:** employer pays 33 days (14 at age 50+). Benefit period 182 days, 270 in pregnancy, 91 after insurance ends. Waiting period 30 days (mandatory insurance) / 90 (voluntary). 60-day break rule.
- **maternity:** weeks by number of children `[20,31,33,35,37]`. Up to 6 weeks before the birth. The mother uses the first 14 weeks herself (8 with an incapacity ruling). Stillbirth 8 weeks; at least 7 days after a death. Adoption minimum 9 weeks. `pregnancy_weeks` 40 dates the pregnancy for the risk checks (due date − 40 weeks).
- **parental:** 41/43 weeks, Za życiem 65/67, 9 weeks exclusive to each parent, max 5 parts, until the end of the year the child turns 6. Part-time work ≤0.5, extension caps 82/86, Za życiem 130/134 (KP art. 182^1f § 1^1).
- **paternity:** 14 days, ≤2 parts of ≥7 days, used before the child is 12 months old, 7 days' notice
- **supplementary:** the extreme / preterm / term hospitalization table (caps 15 / 8 / 8 weeks)
- **deadlines:** 81.5% request ≤21 days after birth, parental notice ≥21 days (KP art. 182^1d § 1), part-time notice ≥21 days, supplementary request ≥21 days before maternity ends, maternity handover: father applies ≥14 days before (KP art. 180 § 9), mother resigns ≥7 days before returning (§ 8); paternity notice 7 days is under `paternity`
- **care:** 60 days/year for a child under 14. Payer threshold: >20 insured. JDG debt threshold: 1% of min wage (art. 2a)
- **game:** round anchor offsets relative to the birth date `[-70, 0, 14, 90, 730]`, budget target ratio

### 2. Calculator (`calc/`, pure functions)
- **base.py** ✅ `benefit_base(BaseRequest, Params) -> BaseResult{base, steps[]}`
  - Window: the 12 calendar months before the event month; provided months outside it are ignored and reported (art. 36 ust. 1). Fewer months in the window = shorter insurance, use the full months given (ust. 2). None: `contract_monthly` (art. 37 ust. 2 pkt 1 / art. 48a–49), otherwise 422.
  - Employee months: deduct the three contributions per month (art. 3 pkt 3). A month with `worked_days < required_days / 2` is excluded (art. 38 ust. 2 pkt 1) unless every month is, then all are topped up (ust. 3). A partial month ≥ half is topped up as `gross / worked × required` (ust. 2 pkt 2).
  - Bonuses: `quarterly_bonus` / `annual_bonus` in the window, net of contributions, ÷12 (art. 42 ust. 2–3).
  - Full-time employees get the floor `min_wage × (1 − 0.1371)` (art. 45 ust. 1, confirmed by the Poradnik). Non-employees: flat 13.71% (art. 3 pkt 4), no floor, capped at `voluntary_base_cap`.
  - Rounding: topped-up pay and each contribution to grosze; the average is rounded once at the end. `POST /calc/base` loads the params in force on `event_date`; `ValueError`/`LookupError` → 422.
- **plan.py** ✅ `compute_plan(Plan, Params) -> PlanResult`: prices every leave day per parent, then aggregates by calendar month.
  - Base per parent: `base_monthly`, else `benefit_base()` from `salary_history` at the parent's first block (`Parent.full_time` feeds the floor); `employment == "none"` → no salary, no benefits. A block for a missing father or a parent without base/history → 422.
  - Day amount = `money(base × rate / 30)` × (1 − `work_fraction`). Salary = base × (days without leave, vacation counts as working, part-time counts `work_fraction`) / days in month. Overlapping blocks of one parent: the later start wins (2c flags it).
  - Pools: maternity weeks by children, parental 41/43 or Za życiem 65/67 weeks, exclusive 9 weeks per parent, paternity 14 days; part-time days use (1 − f) of a day; parts = number of parental blocks; care = 60 minus the busiest calendar year. Negative values mean overuse (2c turns them into errors).
  - `below_target`: month total < `game.budget_target_ratio` × sum of bases.
  - Rate variants: `standard` (100/70) or `averaged` (81.5%, but the other parent's 9 exclusive weeks stay at 70%).
  - Under `averaged`, if no parental day is used in year 1: parental drops to 70% (3g) and a `top_up` wyrównanie is computed (ust. 4).
  - Floor at 1000 zł/month, pro rata.
  - Part-time parental: the benefit is reduced by `work_fraction` and the block is extended by `1/(1−f)`.
  - Sick leave in pregnancy: an employee is paid by the employer for the first 33 (or 14) days, then by ZUS at 100%. A non-employee gets ZUS from day 1. Track the 270-day counter.
  - Amounts are before income tax. Salary is after the 13.71% contributions (`shortcut:` no PIT).
- **rules.py** ✅ `check(Plan, PlanResult, Params) -> list[Issue{code, severity, text, rule}]`. Errors are what make a game card ineligible.
  - **Codes** are `<rule id>.<case>` where the rule id is from `shared/legal-rules.json` (e.g. `paternity.too-late`, `parental-pool.exclusive`), so the UI can link an issue to its evidence; `plan.overlap` has no legal rule id. Each code is reported once (first occurrence), so it is safe as a React key.
  - **Severity:** `error` = not allowed; `warning` = allowed but risky or late (notice periods: the employer may agree to less; rehab where the plan doesn't show the exhausted sick period); `info` = not checked (adoption).
  - **Checks:** overlapping blocks of one parent; who may take what (paternity = father, job-loss benefit = employed mother before birth, care/parental/paternity/supplementary after birth); insurance (no title, zlecenie/JDG without voluntary sickness, JDG debt > 1% of min wage, 30/90-day waiting period for sick pay); pools (maternity, parental incl. simultaneous use, paternity, care per year); maternity ≤6 weeks before birth, starting by the birth, continuous; handover to the father only after 14 weeks and with no gap; supplementary: needs hospitalization facts, one block right after maternity, length ≤ entitlement (`supplementary_weeks()`); paternity ≤2 parts of ≥7 days, before 12 months; parental ≤5 parts, by the end of the year the child turns 6, each parent ≤ total − the other's 9 weeks; part-time only on parental, only employees, ≤0.5, extended length ≤ 82/86 (130/134); care by one parent per day; sick periods 270 (pregnancy) / 182; rehab ≤12 months.
  - **Insurance risks (brief part H):** a benefit before `insured_since` (error); insurance that started during the pregnancy, i.e. after due date − `pregnancy_weeks` (warning: ZUS may check for a sham contract, H.1); a month of `salary_history` in the pregnancy above every earlier month (warning: ZUS may lower the base, H.2); the mother's `insured_until` before the birth with maternity-type periods (H.3): an error for zlecenie/JDG, a warning for employees because a fixed-term contract is extended to the birth (KP art. 177 § 3, art. 30 ust. 4), and nothing when a `job_loss_benefit` block shows the art. 30 ust. 1 case. Waiting period, missing voluntary insurance and JDG debt were already checked.
  - **Deadlines** (only when `plan.today` is set, only for periods not started yet): 81.5% application, paternity 7 / parental 21 / part-time 21 days' notice, supplementary 21 days before maternity ends, maternity handover 14 days (`transfer.notice`).
- **paperwork.py** ✅ `documents(Plan, Params) -> list[Document{form, who, recipient, due_by, done, rule, note}]`, sorted by due date (undated ones at their period's start). `who` is whose benefit it is, even when the employer issues the form (Z-3).
  - **Payer** (`plan.payer()`, art. 61): employee or zlecenie with `payer_insured_count` > `payer_threshold_insured` (20) → the employer / contracting party, otherwise ZUS; JDG → ZUS; a period after `insured_until`, or a `job_loss_benefit`, → ZUS (art. 61 ust. 1 pkt 2 lit. d). `payer_insured_count` defaults to 0, so a parent is ZUS-paid unless the form says otherwise.
  - **Employees file with the employer** (leave applications from `rozp. wn.` with KP notice periods as `due_by`: pre-birth maternity part, maternity, handover + the mother's resignation, supplementary, paternity, parental + part-time, Z-15A). When ZUS pays, the employer adds a **Z-3** (sick only once the employer-paid 33/14 days are exceeded in a year; then ZAS-12 for further periods).
  - **Non-employees** send **ZAM** to whoever pays (before the first day for paternity/parental, before maternity ends for supplementary); a small contracting party adds a **Z-3a**; JDG sick → **ZAS-53**. ZUR/ZAO/Z-3b were merged into ZAM / abolished on 2026-10-24.
  - Also: e-ZLA per sick period (code B in pregnancy), ZNp-7 for rehab, the art. 30 ust. 3 documents for the job-loss benefit, the 81.5% request (birth + 21 days), the Za życiem certificate in the parental note. Birth certificate: when an employer pays a maternity-type benefit, one "Odpis skrócony aktu urodzenia" (recipient `usc`); when ZUS pays, the note says ZUS reads the registry (rozp. dok. § 13 ust. 2–3).
  - No documents for a parent without sickness insurance (no title, or zlecenie/JDG without voluntary sickness) or for vacation. After `insured_until` an employee no longer files with the employer: ZAM to ZUS, and the former employer sends the Z-3. Each document carries the `start`/`end` of its period. Identical documents are merged (same form, parent, recipient, due date and note); per-period ones carry their dates in the note.
  - Stillbirth / child death is calculator-only, **never a game card**.

### 3. Game engine (`game/engine.py`) ✅
The teammate's stateless replay engine (see `docs/game-engine.md` for card-by-card scope). Sessions, combos and end bonuses from the original plan were dropped.
- **Deck:** `shared/deck-design.json` (30 cards, six per round, declarative `effects`), built by `scripts/build_deck_design.py`. The legacy 15-card catalog (`shared/cards.json`, `/cards`, `/rounds`, `/game/preview`) only supplies round titles to the board. The deck is not editable at runtime (see step 6).
- **`POST /game/simulate {scenario_id, selected[]}`** replays every selected card id from round 1 into one `Plan` and returns `GameSimulation{scenario, plan, result, statistics, candidates[], reservations, horizon}`. Each candidate of the next round is tried on top: `available` + issues + projected statistics + pools. Nothing is stored, so the server stays authoritative without sessions, and a refresh restarts the game.
- **Effects** resolve symbolic anchors (`after:maternity`, `need:adaptation`, `choice.*`, `params.*`, `derived.*`) against the scenario's sample choices; legal limits come only from `Params`, and every result goes through `compute_plan` (fixed horizon) + `rules.check`. A legal error makes a card unavailable with the reason; it stays visible in the hand.
- **Scenarios** (`backend/app/data/scenarios.json`): one sample UoP family in three stories (standard, preterm hospitalization + e-ZLA, Za życiem) plus sample choices. **Gated cards** (always unavailable, with a reason): 1F/2F adoption/foster, 3F end of insurance, because no story has those facts (1D rehab was enabled by the teammate in `540ff05`).
- **Deal** is client-side (`preview-game.tsx`): three of the round's six, swapping one in if none is playable. The coverage test plus a one-off exhaustive search (all ~4 350 paths, ~100 s) show every reachable state has a playable card, so the swap always succeeds.
- **Statistics:** `money` = lowest monthly income over the horizon vs. the parents' bases, `time` = covered care-need days (a day counts once, part-time counts its free fraction), `happiness` = the mean of both ratios × 100. No combos.
- **The game never produces applications.** `simulate` leaves `documents` empty; paperwork belongs to the user's own plan (`/calculator` → `/applications`), because a real parent has usually filed some of it with ZUS already. The finished game offers "Przelicz ten plan w kalkulatorze" (`planHandoff`), where the sample family can be replaced with the user's own data.

### 4. REST API (all under `/api/v1`, see `/docs`)
| Area | Endpoints | State |
|---|---|---|
| Catalog | `GET /health`, `/cards`, `/rounds`, `/rounds/{id}`, `/game/preview` | ✅ |
| Calculator | `POST /calc/base` ✅, `POST /calc/plan` ✅ (months, calendar, pools, issues, documents, explain) | ✅ |
| Game | `POST /game/simulate` (stateless replay) | ✅ |
| Cases | `GET /cases/samples`, `POST /cases/parse` (PDF → `ParseResult`), `POST /cases/evaluate` (`CaseInput` → `CaseVerdict`) | 501 (step 7) |
| Gov mocks | `GET /auth/personas`, `POST /auth/mobywatel`, `GET /zus/me` (Bearer), `POST /pue/messages`, `POST /applications`, `POST /usc/birth-certificate` (Bearer optional) | ✅ |
| Info | `GET /info/links`, `GET /info/charities` (verified, with KRS) | ✅ |
| Admin (Bearer `ADMIN_TOKEN`) | `GET/PUT /admin/params`, `GET /admin/params/versions`, `GET /admin/submissions` | ✅ |

### 5. Case PDFs
- **parse:** `pdfplumber` text → detect the form (Z-3 / Z-3a / ZAM / ZAS-53 / insurance confirmation) by header → regex the labelled fields into `CaseInput`. No text (a scan) → `needs_manual_entry`, and the UI falls back to `FamilyForm`. Add pdfplumber and write the regexes once the samples arrive.
- **Golden tests:** `tests/cases/*.json` = case numbers + the ZUS-granted amounts from the system screenshots. `samples.json` holds synthetic public demo cases.

## Frontend design

### Principles
- **The server is authoritative.** The client holds no game rules and no money math. It renders `GameSimulation` / `PlanResult`. The only local game logic is the deal in `preview-game.tsx`.
- **No extra libraries until a need is proven.** No state library, no chart library (CSS bars/lanes), no form library. `openapi-fetch` + generated types are the only additions.
- **Accessibility target: WCAG 2.1 AA** (Polish public-sector requirement):
  - the board already has a keyboard/touch path ("Połóż na stole"), an `aria-live` announcement and `prefers-reduced-motion`
  - **Known gap:** the board's grey text (`#7b8580` and lighter, 8–11px) is below AA contrast. Fix it in the polish step and don't copy those greys; new screens use `--muted-strong`.
- **Responsive:** the board CSS has breakpoints at 1100/800/560px (cards stack vertically on phones). The header nav becomes a horizontal scroll row under 800px. Tables and charts scroll inside their own container.
- **Identity:** the team's light green "family table" look. No casino imagery, no copying Balatro's look, no ZUS logo (the footer says it isn't a ZUS service).

### Routes
| Route | Purpose | Main pieces |
|---|---|---|
| `/` | The game: designed deck, sample stories, every play replayed by the server | `getGamePreview()` → `PreviewGame` (`POST /game/simulate`) → `GameBoard`; at the end "Przelicz ten plan w kalkulatorze" (`planHandoff`) |
| `/calculator` | Integrated calculator, recomputed live; starts with both parents | `FamilyForm`, rate variant, `BlocksEditor`, `usePlan` → `PlanTimeline`; "Przygotuj wnioski dla tego planu" (`myPlan`) |
| `/cases` | Jury flow: upload a PDF or pick a sample → verdict | `cases/parse`, `cases/evaluate`; later reuses `FamilyForm` to review parsed fields |
| `/applications` | The user's own documents (never the game's), already-filed ones ticked from eZUS, the rest filled in and "sent" | `myPlan` → `POST /calc/plan` → `DocsChecklist`; `GET /zus/me`; `POST /applications`, `POST /usc/birth-certificate` |
| `/login` → `/me` | Simulated mObywatel login → the eZUS account: insurance, debt certificate, e-ZLA, filed documents; buttons to the calculator (`planHandoff`) and applications (`myPlan`) | `userToken` in sessionStorage, `GET /zus/me` |
| `/help` | Verified charities, official links, simulated PUE question (answer + links) | `info/*`, `pue/messages` |
| `/admin`, `/admin/submissions` | Typed params form (groups, units, versions; new version per save), everything sent through the simulated channels | `admin/layout.tsx` holds the token + sub-nav |

### Board (team UI) and how the skeleton plugs in
- **Layout:**
  - `Statistics` sidebar (money/time/happiness, track fills when `max` is known, delta badges from `projected`)
  - `RoundTrack` (5 slots, drop target = current round)
  - story section (stage title + description)
  - hand of 3 `DecisionCard`s (hover/focus lifts a card; drag onto the slot or press "Połóż na stole"; sources in a `<details>`)
  - decorative deck
- **`GameBoard` is presentational.** Props: `mode`, `stages`, `currentRound` (null = complete), `statistics`, `projected`, `played`, `hand`, `onPlay`, `onFocusCard`, `onReset`, `unavailable`, `belowHand`. `PreviewGame` is the only caller and owns state (`mode="preview"`; the `"game"` branches are unused since the session game was removed).
- **Chrome:** `SiteHeader` (brand + nav) and `SiteFooter` are in the root layout; pages render their own `<main>` (`.page` + `PageHeader`).
- **Next for the board (step F4/F6):** disabled-card state with the rule that blocks it, combo links between slots, a count-up animation on happiness, and real stat tracks.

## Build order
Backend and frontend run in parallel once the contract exists. FE steps that depend on BE are marked.

| Step | Backend | Frontend |
|---|---|---|
| 1 ✅ | Skeleton + contract + params + store + admin params + catalog (merged with the team's API) | Skeleton merged onto the team's board: routes, proxy, typed client, hooks, plan views, forms, admin |
| 2a ✅ | `calc/base.py` + `POST /calc/base` + `test_base.py` | — |
| 2b ✅ | `calc/plan.py` (ledger, durations, rates, months, pools) + `POST /calc/plan` + tests | Calculator: salary history, hospitalization, adoption fields; presets; 422 → field errors *(unblocked)* |
| 2c ✅ | `calc/rules.py` (legal validation → `issues`) + tests | Show issues linked to their evidence (`/sources/...` via the rule id in `Issue.code`) |
| 3 ✅ | `paperwork.py` (payer, documents, deadlines) + brief-H risks in `rules.py` | Plan views: kind colours + legend, care gaps, issue styling |
| 4 ✅ | Replay engine (teammate) + scenarios, session API removed, coverage test | Board on `POST /game/simulate`, disabled cards with reasons, end-of-game → calculator; `/applications` from the user's own plan |
| 5 ✅ | Gov mocks, personas, applications, PUE canned replies, charities (verified orgs only) | Login → /me, application forms, help page |
| 6 ✅ | Submissions list; no runtime deck editor (decided) | Typed params form (groups, units, versions), submissions table |
| 7 | Cases parse/evaluate + golden tests (needs sample PDFs) | Cases review flow reusing `FamilyForm` *(needs BE7)* |
| 8 | Deploy the backend container + Postgres (managed, or the compose `db` with a real `POSTGRES_PASSWORD`) | Deploy the frontend container (`API_URL` at runtime); contrast fix; Playwright happy path + mobile/desktop screenshots (needed for the submission); 3-min video |

## Verification
- **Backend:** `uv run pytest` (unit, no DB: catalog, board preview, health, links, admin auth/validation, 501 stubs), the integration run above (seeding, versions, effective dates, admin round trip on Postgres) and `uv run ruff check app tests`. `test_base.py` covers the window, per-contribution rounding, exclusion/top-up incl. art. 38 ust. 3, shorter insurance, first month, the full-time floor, bonuses and the non-employee cap. `test_plan.py` covers month-by-month maternity, the averaged rate with the father's exclusive weeks at 70%, art. 31 ust. 3g + top-up, the floor (insured, full-leave days only), part-time, sick rates and the employer/ZUS split, rehab 90→75%, care, vacation, paternity, pool sizes and input errors. `test_rules.py`: a legal family plan must produce no issues, a parametrised table triggers every check by code, plus severities, deadlines (only with `today`), the supplementary entitlement table and the contract-end warning vs. error. `test_gov.py`: login and signed tokens, the account, the debt certificate, filed applications coming back, PUE answers rendered from params, persona issue codes and filed forms vs. paperwork, charities with KRS. `test_paperwork.py`: the art. 61 payer, exact document sets (form, parent, recipient, due date) for employees at small/big employers, non-employees (ZAM, Z-3a, ZAS-53), the maternity handover, sick pay past the employer days, part-time/supplementary/care/Za życiem, periods after the insurance ended, and the payer line in `explain`. `test_game_engine.py`: shared pools across rounds, reservations, part-time, gating, preserved medical facts, derived happiness, round order, and the coverage walks (always a playable card; every ungated card completes a legal plan).
- **Frontend:** `npm run typecheck && npm run lint && npm run build`. Then run both servers (`API_URL` set) and walk `/` (five plays → "Przelicz ten plan w kalkulatorze") → `/calculator` → "Przygotuj wnioski dla tego planu" → `/applications`, at 375px and 1280px.
- **Proxy:** `curl localhost:3000/api/v1/health` must return the backend's body. Without `API_URL` it must return 503 while `/` still renders.
- **Contract drift:** `npm run gen:api` then typecheck shows every UI spot that needs updating.
- **Docker:** `docker compose up --build`, then `curl localhost:3000/api/v1/cards` must return 15 cards and `curl -H 'Authorization: Bearer dev' localhost:3000/api/v1/admin/params/versions` must list version 1 (proves frontend → backend → Postgres).

## Open items
- **Deck decision:** 30 designed cards, six per stage (`cards-30.md`), with a three-card hand. Unavailable cards show with their reason; never invent legal availability. Open: a game for the user's own family or a mObywatel persona (today only the three sample stories), and enabling 1D/1F/2F/3F once a story has the facts.
- **Szczęście:** authored game score, not a health metric. Shared time and fulfilled care goals are separate derived inputs to Aura Farming. Mode formulas are proposed in `docs/card-grounding.md` and need playtesting.
- **Father's rate for non-exclusive parental leave under the mother's 81.5% application** (art. 30a ust. 3). Assumed 81.5%.
- **Care allowance rules:** local guide pages PDF 37–40 and official Sejm articles 32–35 are linked in `Documents/legal/README.md`; implement the family-wide annual limit and event/household checks before activation.
- **Rules shortcuts / not yet checked:** the 60-day break rule for the sickness period (all sick days in the plan are counted); hospital stay intervals (`hospital_days` must already be the qualifying days); exceptions to the 14-week handover (incapacity ruling, hospital, death) and to the 9 exclusive weeks are not modelled as facts; whether a father may take parental leave while the mother is on maternity is not checked (not in the supplied extract); adoption/foster age limits and deadlines (`adoption.not-checked` info); stillbirth and child death rules.
- **Frontend calculator gap:** `FamilyForm` has no fields for `voluntary_sickness`, `insured_since`, `insured_until`, `payer_insured_count`, `contribution_debt`, `age`, `full_time`, so a zlecenie/JDG parent always gets `insured-parent.no-voluntary-sickness` and every parent is ZUS-paid. Add them in the frontend calculator step.
- **Paperwork shortcuts:** one Z-3 per benefit type per parent (ZUS may ask for it per period); the art. 7 / art. 29 rules for benefits after an insurance that ends *after* the birth, and for the father's insurance ending, aren't checked (only the mother's insurance on the birth date is); `zadanie ZUS, cz. H` is cited for the sham-contract and raised-base risks because the supplied legal extracts don't cover them; adoption/foster, stillbirth and the father's special takeover cases (§ 20–25 of the documents regulation) have no documents yet.
- **Plan ledger shortcuts (marked `shortcut:` in `plan.py`, confirm with the samples):** a father taking over maternity is paid 100% even under the mother's 81.5% application; the art. 31 ust. 3a floor isn't applied on part-time days; salary in a month with leave is prorated by calendar days (payroll uses 1/30 per absence day); employer sick-pay counter assumes no earlier sick days that year; one base per parent for the whole plan (art. 43 recompute after a ≥1-month break not done); rehab base not indexed quarterly (art. 19 ust. 2); one params version (in force on the birth date) for the whole plan.
- **Benefit base, to confirm with the Z-3 samples (step 7 golden tests):** whether part-time employees get a proportional minimum (sources only state the full-time floor; none applied today); which pay components are topped up (today the whole month's pay is, but overtime, night pay and commissions shouldn't be); bonus attribution by payment month vs. period earned, and ÷12 when insured < 12 months; pension/disability contributions stop above the annual 30× cap (not modelled, affects high earners); art. 43 base continuity between benefits and the art. 46 cap after insurance ends belong to the plan layer.
- **Part-time extension caps for Za życiem:** supplied KP art. 182¹f § 1¹ explicitly gives 130/134; extend parameter contract before implementing those scenarios.
