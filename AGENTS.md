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
  - Models used both in requests and responses are split into `S["X-Input"]` / `S["X-Output"]` (e.g. `Plan-Input`, `Card-Output`, `Source-Output`). Others keep their plain name (`GameState`, `Statistic`, `Stage`, `Round`, `Preview`, `CardPreview`).
  - Board components import friendly aliases from `src/types/game.ts`; everything else uses `S[...]` from `src/lib/api.ts`.
- **Persistence lives only in `backend/app/repositories.py`:** the card catalog (`shared/cards.json`, or `CARDS_DATA_PATH`) plus PostgreSQL via `psycopg` 3 (`DATABASE_URL`, default `postgresql://zp:zp@localhost:5432/zp` = the compose `db`). Tables `config` (versioned params, JSONB), `games` and `submissions` are created and seeded by `init()` at startup; there are no migrations yet (`CREATE TABLE IF NOT EXISTS`), so a column change needs a manual `ALTER` or a fresh volume. Callers use its functions, never SQL.
- **Legal numbers live only in `backend/app/data/params.json`.** They are admin-editable and versioned by `effective_from`. Never hardcode a rate, duration or limit in code, and that includes the frontend.
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
  - `/` is prerendered at **build** time from the local 30-card design and does not fetch the backend, regardless of `API_URL`. Server-driven sessions remain under `/game/[id]`.
  - `outputFileTracingRoot`/`turbopack.root` is the repo root (the UI imports `../shared/cards.json`), so standalone output nests under `.next/standalone/frontend/server.js`, and **both Docker images build from the repo root** (`docker-compose.yml`, root `.dockerignore`).
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
    calc/              # base.py plan.py rules.py paperwork.py   (step 2-3, not created yet)
    game/              # engine.py effects.py combos.py          (step 4, not created yet)
    data/              # params.json links.json (+ scenarios.json personas.json charities.json samples.json later)
  tests/               # test_api.py (unit, no DB), test_repositories.py (integration, Postgres)
  Dockerfile (context: repo root)   .env.example
frontend/
  src/app/             # page.tsx (/ preview board), game/[id], game/[id]/summary, calculator, cases, applications,
                       # help, login, me, admin/{,deck,submissions}, api/v1/[...path]/route.ts (proxy), globals.css
  src/components/      # game/ (game-board, preview-game, round-track, decision-card, statistics, combo-toast),
                       # plan/ (plan-timeline, budget-chart, care-calendar, pools-meter, docs-checklist),
                       # forms/ (family-form, blocks-editor), site-header, site-footer, page-header, api-result, json-editor
  src/hooks/           # use-game.ts, use-plan.ts
  src/lib/             # api.ts (openapi-fetch client), schema.d.ts (generated), game.ts (board preview loader),
                       # format.ts, labels.ts, session.ts
  src/types/game.ts    # aliases of generated game types
  Dockerfile (context: repo root)   .env.example
shared/cards.json      # card catalog for both apps      scripts/sync_cards.py   cards.md   cards_inspo.md
docker-compose.yml     .dockerignore                     Documents/
```

## Backend design

### 1. Params (`data/params.json`, Pydantic `Params`, versioned in the `config` table)
- `contribution_deduction 0.1371`, `min_wage 4806`, `voluntary_base_cap 20321.30`, `parental_benefit_floor 1000` (art. 31 ust. 3a)
- **rates:** sick 0.80, sick_pregnancy 1.00, maternity / supplementary / paternity / job_loss 1.00, parental 0.70, averaged 0.815, care 0.80
- **sick:** employer pays 33 days (14 at age 50+). Benefit period 182 days, 270 in pregnancy, 91 after insurance ends. Waiting period 30 days (mandatory insurance) / 90 (voluntary). 60-day break rule.
- **maternity:** weeks by number of children `[20,31,33,35,37]`. Up to 6 weeks before the birth. The mother uses the first 14 weeks herself (8 with an incapacity ruling). Stillbirth 8 weeks; at least 7 days after a death. Adoption minimum 9 weeks.
- **parental:** 41/43 weeks, Za życiem 65/67, 9 weeks exclusive to each parent, max 5 parts, until the end of the year the child turns 6. Part-time work ≤0.5, extension caps 82/86.
- **paternity:** 14 days, ≤2 parts of ≥7 days, used before the child is 12 months old, 7 days' notice
- **supplementary:** the extreme / preterm / term hospitalization table (caps 15 / 8 / 8 weeks)
- **deadlines:** 81.5% request ≤21 days after birth, part-time notice ≥21 days, supplementary request ≥21 days before maternity ends
- **care:** 60 days/year for a child under 14. Payer threshold: >20 insured. JDG debt threshold: 1% of min wage (art. 2a)
- **game:** round anchor offsets relative to the birth date `[-70, 0, 14, 90, 730]`, budget target ratio

### 2. Calculator (`calc/`, pure functions)
- **base.py**
  - Employee: average of 12 full calendar months (art. 36), or of the shorter full insured period. For the first month, the contract salary as if worked the full month (art. 37). Exclude months with less than half the required time worked and top up the rest (art. 38). Quarterly bonuses ÷12 over 4 quarters, annual ÷12 (art. 42). Then −13.71% and the full-time minimum floor (art. 45).
  - Non-employee: average income × (1−0.1371), capped (art. 48).
  - Returns `BaseResult{base, steps[]}`.
- **plan.py** builds a per-day ledger per parent, then aggregates it into `PlanResult`: `months[]`, `calendar[]`, `pools`, `documents[]`, `issues[]`, `explain[]`, `top_up`.
  - Rate variants: `standard` (100/70) or `averaged` (81.5%, but the other parent's 9 exclusive weeks stay at 70%).
  - Under `averaged`, if no parental day is used in year 1: parental drops to 70% (3g) and a `top_up` wyrównanie is computed (ust. 4).
  - Floor at 1000 zł/month, pro rata.
  - Part-time parental: the benefit is reduced by `work_fraction` and the block is extended by `1/(1−f)`.
  - Sick leave in pregnancy: an employee is paid by the employer for the first 33 (or 14) days, then by ZUS at 100%. A non-employee gets ZUS from day 1. Track the 270-day counter.
  - Amounts are before income tax. Salary is after the 13.71% contributions (`shortcut:` no PIT).
- **rules.py** returns `Issue{code, severity, text, rule}`. Errors are what make a game card ineligible:
  - pools not exceeded; exclusive weeks not transferred
  - the mother's first 14 weeks used by her (incl. the special exceptions)
  - parental leave ≤5 parts and within the age limit
  - paternity leave before 12 months, ≤2 parts of ≥7 days
  - supplementary leave right after maternity, one block, one parent
  - simultaneous parental leave counts double against the pool
  - part-time fraction ≤0.5
  - care allowance for only one parent per day
  - notice deadlines reachable from `today`
- **paperwork.py**
  - Payer: an employee whose employer has >20 insured is paid by the employer, otherwise by ZUS. JDG → ZUS.
  - Documents by kind × employment × payer:
    - sick: e-ZLA + Z-3 / Z-3a / ZAS-53 / ZAS-12
    - leave: leave request (employee) or ZAM + Z-3 / Z-3a. **ZUR/ZAO/Z-3b were merged into ZAM / abolished on 2026-10-24.**
    - supplementary: hospital certificate + the other parent's statement
    - care: Z-15A; rehab: ZNp-7
    - birth certificate; Za życiem certificate
  - Each document has a recipient and a due date.
  - Risks: waiting period, voluntary insurance not active on the birth date, contract ending before the birth, base raised during pregnancy, JDG debt, fixed-term UoP extended to the birth date (KP 177 §3).
  - Stillbirth / child death is calculator-only, **never a game card**.

### 3. Game engine (`game/`)
- **Cards** (`Card` in `schemas.py`) have two parts:
  - catalog fields `{id, round_id, title, description, sources[Source{id,title,url,locator}]}` from `shared/cards.json`
  - game fields `{tags[], requires: Requirement{fact, op, value}[], effects[], chips, combos[{with, name, check, mult}]}`, which are empty until step 4

  The game deck **is** the catalog. Admin deck versions (step 6) get seeded from it.
  - `requires` checks scenario facts only. **Legal feasibility comes from simulate + `rules.py`, not per-card code.**
  - Effects are ~8 primitives: `add_block, set_rate_variant, set_flag, set_birth, reserve, mark_docs, transfer_maternity, add_care`. They use symbolic anchors: `birth | due-6w | after:maternity:mother | need:adaptation | need:emergency`.
- **Rounds:** `Stage{id, title, description}` is a round's story; `Round` = `Stage` + its 3 cards. `GameState.stages` carries the scenario's stage texts (round-track labels + story panel).
- **scenarios.json** (step 4) has ~5 stories: standard UoP family, premature birth + sick leave in pregnancy, zlecenie mother + JDG father, employer liquidation, Za życiem. Each holds family facts, `needs` (date ranges where the child needs care), a budget target and per-round stage texts.
- **Hand:**
  - With the 15-card deck, the hand is the round's 3 cards.
  - Cards that `rules.py` rejects for this family should still show, **disabled with the reason**. That's an open UI item and teaches more than hiding them.
  - With a bigger deck (cards_inspo), use the deal: filter → simulate + validate → lookahead → 3 with distinct tags, seeded RNG in state.
- **Statistics** (sidebar, `Statistic{id, label, value, unit, max}`):
  - `money` = lowest monthly family income in the plan (zł)
  - `time` = days a parent is home while the story needs care; `max` = days needed, which fills the track
  - `happiness` = score: Σ chips × (1 + Σ combo mult) plus end bonuses
- **Card preview** returns `CardPreview{statistics (projected), pools, new_documents, new_issues}`. The board shows projected − current as delta badges.
- **Play** returns `PlayResult{state, combos, chips, mult, points}`.
  - Combo checks: `touching | overlap | budget_ok | docs_complete | covers_need`.
  - End bonuses (`GameState.bonuses`): no care gap in year 1, budget never below target, no missed deadline.
- Start a game from a scenario, a mObywatel persona, or custom `Family` facts (uses the generic story).

### 4. REST API (all under `/api/v1`, see `/docs`)
| Area | Endpoints | State |
|---|---|---|
| Catalog | `GET /health`, `/cards`, `/rounds`, `/rounds/{id}`, `/game/preview` | ✅ |
| Calculator | `POST /calc/base`, `POST /calc/plan` | 501 (step 2) |
| Game | `GET /game/scenarios`, `POST /game`, `GET /game/{id}`, `POST /game/{id}/preview`, `POST /game/{id}/play`, `GET /game/{id}/summary` | 501 (step 4) |
| Cases | `GET /cases/samples`, `POST /cases/parse` (PDF → `ParseResult`), `POST /cases/evaluate` (`CaseInput` → `CaseVerdict`) | 501 (step 7) |
| Gov mocks | `GET /auth/personas`, `POST /auth/mobywatel`, `GET /zus/me/{insurance,ezla,debt-certificate}` (Bearer), `POST /pue/messages`, `POST /applications`, `POST /usc/birth-certificate` | 501 (step 5) |
| Info | `GET /info/links` ✅, `GET /info/charities` (empty until curated) | partial |
| Admin (Bearer `ADMIN_TOKEN`) | `GET/PUT /admin/params`, `GET /admin/params/versions` ✅; `GET/PUT /admin/deck`, `GET /admin/submissions` | partial (step 6) |

### 5. Case PDFs
- **parse:** `pdfplumber` text → detect the form (Z-3 / Z-3a / ZAM / ZAS-53 / insurance confirmation) by header → regex the labelled fields into `CaseInput`. No text (a scan) → `needs_manual_entry`, and the UI falls back to `FamilyForm`. Add pdfplumber and write the regexes once the samples arrive.
- **Golden tests:** `tests/cases/*.json` = case numbers + the ZUS-granted amounts from the system screenshots. `samples.json` holds synthetic public demo cases.

## Frontend design

### Principles
- **The server is authoritative.** The client holds no game rules and no money math. It renders `GameState` / `PlanResult` and asks the server for previews. The only local logic is the `/` preview walkthrough (`preview-game.tsx`).
- **No extra libraries until a need is proven.** No state library, no chart library (CSS bars/lanes), no form library. `openapi-fetch` + generated types are the only additions.
- **Accessibility target: WCAG 2.1 AA** (Polish public-sector requirement):
  - the board already has a keyboard/touch path ("Połóż na stole"), an `aria-live` announcement and `prefers-reduced-motion`
  - **Known gap:** the board's grey text (`#7b8580` and lighter, 8–11px) is below AA contrast. Fix it in the polish step and don't copy those greys; new screens use `--muted-strong`.
- **Responsive:** the board CSS has breakpoints at 1100/800/560px (cards stack vertically on phones). The header nav becomes a horizontal scroll row under 800px. Tables and charts scroll inside their own container.
- **Identity:** the team's light green "family table" look. No casino imagery, no copying Balatro's look, no ZUS logo (the footer says it isn't a ZUS service).

### Routes
| Route | Purpose | Main pieces |
|---|---|---|
| `/` | Board preview from the local catalog (works without a backend) | `getGamePreview()` → `PreviewGame` → `GameBoard` |
| `/game/[id]` | Server-driven game | `useGame` → `GameBoard mode="game"` (projected stats on hover/focus, `new_issues`, `ComboToast`) |
| `/game/[id]/summary` | End screen: happiness score, combos, bonuses, plan, next steps | `PlanTimeline`; "Przygotuj wnioski", "Otwórz w kalkulatorze" (`planHandoff`), "Zagraj ponownie" |
| `/calculator` | Integrated calculator, recomputed live | `FamilyForm`, rate variant, `BlocksEditor`, `usePlan` → `PlanTimeline` |
| `/cases` | Jury flow: upload a PDF or pick a sample → verdict | `cases/parse`, `cases/evaluate`; later reuses `FamilyForm` to review parsed fields |
| `/applications` | Pre-filled documents from the plan → "send" to the employer or ZUS | `game/{id}/summary`, `POST /applications` |
| `/login` → `/me` | Simulated mObywatel login → "Moje dane z ZUS" | `userToken` in sessionStorage |
| `/help` | Charities, official links, simulated PUE question | `info/*`, `pue/messages` |
| `/admin`, `/admin/deck`, `/admin/submissions` | Params and deck JSON editors (new version per save), submitted applications | `admin/layout.tsx` holds the token + sub-nav, `JsonEditor` |

### Board (team UI) and how the skeleton plugs in
- **Layout:**
  - `Statistics` sidebar (money/time/happiness, track fills when `max` is known, delta badges from `projected`)
  - `RoundTrack` (5 slots, drop target = current round)
  - story section (stage title + description)
  - hand of 3 `DecisionCard`s (hover/focus lifts a card; drag onto the slot or press "Połóż na stole"; sources in a `<details>`)
  - decorative deck
- **`GameBoard` is presentational.** Props: `mode`, `stages`, `currentRound` (null = complete), `statistics`, `projected`, `played`, `hand`, `onPlay`, `onFocusCard`, `onReset`, `summaryHref`. The caller owns state: `PreviewGame` (local) or `/game/[id]` (`useGame`). The preview shows the "Podgląd planszy" badge.
- **Chrome:** `SiteHeader` (brand + nav) and `SiteFooter` are in the root layout; pages render their own `<main>` (`.page` + `PageHeader`).
- **Next for the board (step F4/F6):** disabled-card state with the rule that blocks it, combo links between slots, a count-up animation on happiness, and real stat tracks.

## Build order
Backend and frontend run in parallel once the contract exists. FE steps that depend on BE are marked.

| Step | Backend | Frontend |
|---|---|---|
| 1 ✅ | Skeleton + contract + params + store + admin params + catalog (merged with the team's API) | Skeleton merged onto the team's board: routes, proxy, typed client, hooks, plan views, forms, admin |
| 2 | `calc/base.py`, `calc/plan.py`, `rules.py` + tests → `/calc/*` | Calculator: salary history, hospitalization, adoption fields; presets; 422 → field errors *(needs BE2)* |
| 3 | `paperwork.py` (payer, documents, deadlines, risks) | Plan views: kind colours + legend, care gaps, issue styling |
| 4 | Game: card mechanics in `shared/cards.json`, scenarios.json, deal/preview/play/combos/stats, coverage test | Board on real data (`/` creates a game when the API is up), disabled cards, summary *(needs BE4)* |
| 5 | Gov mocks, personas, applications, PUE canned replies, charities (verified orgs only) | Login → /me, application forms, help page *(needs BE5)* |
| 6 | Admin deck (versioned, seeded from the catalog) + submissions | Admin typed forms (grouped params with units, deck as card list) |
| 7 | Cases parse/evaluate + golden tests (needs sample PDFs) | Cases review flow reusing `FamilyForm` *(needs BE7)* |
| 8 | Deploy the backend container + Postgres (managed, or the compose `db` with a real `POSTGRES_PASSWORD`) | Deploy the frontend container (`API_URL` at runtime); contrast fix; Playwright happy path + mobile/desktop screenshots (needed for the submission); 3-min video |

## Verification
- **Backend:** `uv run pytest` (unit, no DB: catalog, board preview, health, links, admin auth/validation, 501 stubs), the integration run above (seeding, versions, effective dates, admin round trip on Postgres) and `uv run ruff check app tests`. Planned unit tests:
  - `test_base`: art. 36–45 cases
  - `test_plan`: durations, rates, the 9-week exclusive part at 70%, top-up, floor, part-time, sick-pay split, supplementary table
  - `test_rules`
  - `test_game`: every scenario always gets a full hand, never produces an invalid plan, uses every card, and combos score once
- **Frontend:** `npm run typecheck && npm run lint && npm run build`. Then run both servers (`API_URL` set) and walk `/` → `/game/{id}` → summary → `/applications`, and `/calculator`, at 375px and 1280px.
- **Proxy:** `curl localhost:3000/api/v1/health` must return the backend's body. Without `API_URL` it must return 503 while `/` still renders.
- **Contract drift:** `npm run gen:api` then typecheck shows every UI spot that needs updating.
- **Docker:** `docker compose up --build`, then `curl localhost:3000/api/v1/cards` must return 15 cards and `curl -H 'Authorization: Bearer dev' localhost:3000/api/v1/admin/params/versions` must list version 1 (proves frontend → backend → Postgres).

## Open items
- **Deck decision:** 30 designed cards, six per stage (`cards-30.md`), with a three-card hand. Separate the pool from the hand in the contract before runtime integration. Some special scenarios cannot supply three legal options: show disabled alternatives with reasons, and never invent legal availability. Scenario coverage remains to be tested with the implemented engine.
- **Szczęście:** authored game score, not a health metric. Shared time and fulfilled care goals are separate derived inputs to Aura Farming. Mode formulas are proposed in `docs/card-grounding.md` and need playtesting.
- **Father's rate for non-exclusive parental leave under the mother's 81.5% application** (art. 30a ust. 3). Assumed 81.5%.
- **Care allowance rules:** local guide pages PDF 37–40 and official Sejm articles 32–35 are linked in `Documents/legal/README.md`; implement the family-wide annual limit and event/household checks before activation.
- **Part-time extension caps for Za życiem:** supplied KP art. 182¹f § 1¹ explicitly gives 130/134; extend parameter contract before implementing those scenarios.
