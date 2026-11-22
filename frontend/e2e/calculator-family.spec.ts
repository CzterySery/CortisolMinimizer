import { expect, test, type Page } from "@playwright/test";

const next = (page: Page) => page.getByRole("button", { name: "Dalej", exact: true }).click();
const selectSituation = (page: Page, kind: "birth" | "adoption" | "foster") =>
  page.getByRole("button", { name: new RegExp(`^${{ birth: "Urodzenie dziecka", adoption: "Adopcja", foster: "Rodzina zastępcza niezawodowa" }[kind]}`) }).click();
async function noReports(page: Page) {
  await expect(page.getByRole("heading", { name: "Kwoty zasiłków", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}
async function mother(page: Page, unknown = false) {
  await page.getByLabel("Forma zatrudnienia — mama").selectOption("employee");
  await page.getByLabel("Jak podasz dane do wyliczenia?").selectOption(unknown ? "unknown" : "base");
  if (!unknown) await page.getByLabel("Podstawa wymiaru zasiłku (zł/mies.)", { exact: true }).fill("6000");
  await next(page);
  await page.getByLabel("Nie, liczymy plan jednej osoby").check();
  await next(page);
}
async function calculate(page: Page) {
  const response = page.waitForResponse((r) => r.url().endsWith("/api/v1/calc/plan") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Oblicz i pokaż wynik" }).click();
  return (await response).json();
}

test("questions reveal progressively; no financial request or report until the last step", async ({ page }) => {
  let calculations = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/v1/calc/plan")) calculations++; });
  await page.goto("/calculator");
  await expect(page.getByLabel("Forma zatrudnienia — mama")).toHaveCount(0);
  await expect(page.getByLabel("Przewidywana data porodu")).toHaveCount(0);
  await noReports(page);
  await next(page);
  await expect(page.getByRole("group", { name: "Sytuacja rodziny" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Wybierz sytuację rodziny." })).toBeVisible();
  await page.locator(".legal-basis summary").click();
  await expect(page.getByRole("link", { name: /art\. 180 § 1/ })).toHaveAttribute("href", "/sources/labour-code#article-180");
  await selectSituation(page, "birth");
  await expect(page.getByRole("button", { name: /^Urodzenie dziecka/ })).toHaveAttribute("aria-pressed", "true");
  await next(page);
  await page.getByLabel("Czekamy na narodziny").check();
  await page.getByLabel("Przewidywana data porodu").fill("2027-03-01");
  await noReports(page); await next(page);
  await expect(page.getByLabel("Podstawa wymiaru zasiłku (zł/mies.)", { exact: true })).toHaveCount(0);
  await mother(page);
  await next(page); // optional health -> starter period
  await expect(page.getByLabel("Dni", { exact: true })).toHaveValue("140");
  await noReports(page); await next(page);
  expect(calculations).toBe(0);
  await page.getByRole("button", { name: "Wstecz", exact: true }).click();
  await expect(page.getByLabel("Dni", { exact: true })).toHaveValue("140");
  await next(page);
  const result = await calculate(page);
  expect(result.issues.filter((x: { severity: string }) => x.severity === "error")).toEqual([]);
  expect(calculations).toBe(1);
  await expect(page.getByRole("heading", { name: "Kwoty zasiłków", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Budżet", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("button", { name: "Wstecz", exact: true }).click();
  await noReports(page);
});

for (const kind of ["adoption", "foster"] as const) test(`${kind} facts reach the calculator through steps`, async ({ page }) => {
  await page.goto("/calculator");
  await selectSituation(page, kind); await next(page);
  await page.getByLabel("Data urodzenia przyjętego dziecka", { exact: true }).fill(kind === "adoption" ? "2020-06-01" : "2018-06-01");
  await page.getByLabel("Data przyjęcia na wychowanie", { exact: true }).fill("2027-03-01");
  if (kind === "adoption") await page.getByLabel("Data wystąpienia do sądu o przysposobienie", { exact: true }).fill("2027-03-01");
  else await page.getByLabel("Decyzja o odroczeniu obowiązku szkolnego").check();
  await noReports(page); await next(page); await mother(page);
  await next(page); await next(page);
  const result = await calculate(page);
  expect(result.issues.filter((issue: { severity: string }) => issue.severity === "error")).toEqual([]);
  expect(result.documents.some((doc: { form: string }) => doc.form.includes("na warunkach"))).toBeTruthy();
});

test("hospitalization is conditional and a supplementary period is checked", async ({ page }) => {
  await page.goto("/calculator");
  await selectSituation(page, "birth"); await next(page);
  await page.getByLabel("Dziecko już się urodziło").check();
  await page.getByLabel("Faktyczna data urodzenia").fill("2027-03-01");
  await next(page); await mother(page);
  await expect(page.getByLabel("Masa urodzeniowa (g)", { exact: true })).toHaveCount(0);
  await page.getByText("Hospitalizacja dziecka — uzupełniający urlop macierzyński", { exact: true }).click();
  await page.getByLabel("Mam dane z zaświadczenia szpitalnego").check();
  await page.getByLabel("Ukończony tydzień ciąży przy porodzie").fill("30");
  await page.getByLabel("Masa urodzeniowa (g)", { exact: true }).fill("1500");
  await page.getByLabel("Kwalifikujące dni pobytu w szpitalu").fill("15");
  await noReports(page); await next(page);
  await page.getByRole("button", { name: "+ Dodaj okres" }).click();
  await page.getByLabel("Rodzaj", { exact: true }).nth(1).selectOption("supplementary");
  await page.getByLabel("Dni", { exact: true }).nth(1).fill("21");
  await next(page);
  const result = await calculate(page);
  expect(result.calendar[1].kind).toBe("supplementary");
  expect(result.issues.filter((issue: { severity: string }) => issue.severity === "error")).toEqual([]);
});

test("unknown income is not shown as zero and no budget chart is invented", async ({ page }) => {
  await page.goto("/calculator");
  await selectSituation(page, "birth"); await next(page);
  await page.getByLabel("Czekamy na narodziny").check();
  await page.getByLabel("Przewidywana data porodu").fill("2027-03-01");
  await next(page); await mother(page, true); await next(page); await next(page);
  await calculate(page);
  await expect(page.getByRole("cell", { name: "Brak danych", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Budżet", exact: true })).toHaveCount(0);
});

test("a late averaged-rate application hides invalid financial results", async ({ page }) => {
  await page.goto("/calculator");
  await selectSituation(page, "birth"); await next(page);
  await page.getByLabel("Dziecko już się urodziło").check();
  await page.getByLabel("Faktyczna data urodzenia").fill("2027-03-01");
  await next(page); await mother(page); await next(page); await next(page);
  await page.getByLabel(/81,5% — z wnioskiem/).check();
  await page.getByLabel("Data złożenia lub planowanego złożenia wniosku o 81,5%").fill("2027-03-23");
  const result = await calculate(page);
  expect(result.issues.some((issue: { code: string }) => issue.code === "averaged.deadline")).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Plan wymaga korekty" })).toBeVisible();
  await noReports(page);
  await expect(page.getByRole("link", { name: "Przygotuj wnioski dla tego planu" })).toHaveCount(0);
});

test("salary history validates every line and part-time consumes the proportional pool", async ({ page }) => {
  await page.goto("/calculator");
  await selectSituation(page, "birth"); await next(page);
  await page.getByLabel("Czekamy na narodziny").check();
  await page.getByLabel("Przewidywana data porodu").fill("2027-03-01"); await next(page);
  await page.getByLabel("Forma zatrudnienia — mama").selectOption("employee");
  await page.getByText("Chcę użyć dokładnych danych z poprzednich miesięcy", { exact: true }).click();
  await page.getByRole("button", { name: "Wpisz dane miesięczne", exact: true }).click();
  const history = page.getByLabel(/^Wynagrodzenie brutto z Z-3/);
  await history.fill("2026-13 6000"); await next(page);
  await expect(history).toBeVisible(); // invalid month cannot silently disappear from submitted data
  await history.fill("2026-12 6000"); await next(page);
  await page.getByLabel("Nie, liczymy plan jednej osoby").check(); await next(page); await next(page);
  await page.getByRole("button", { name: "+ Dodaj okres" }).click();
  await page.getByLabel("Dni", { exact: true }).nth(1).fill("70");
  await page.getByLabel(/^Praca podczas rodzicielskiego/).fill("0.5");
  await next(page);
  const result = await calculate(page);
  expect(result.bases.mother).toBe("5177.40");
  expect(result.pools.parental_days_left).toBe(252); // 287 - 70 × 0.5
  expect(result.issues.filter((issue: { severity: string }) => issue.severity === "error")).toEqual([]);
});

test("one gross salary is clearly estimated and mObywatel is discoverable", async ({ page }) => {
  await page.goto("/calculator");
  await expect(page.getByRole("link", { name: "Zaloguj się przez mObywatel", exact: true })).toHaveAttribute("href", "/me#logowanie");
  await selectSituation(page, "birth"); await next(page);
  await page.getByLabel("Czekamy na narodziny").check();
  await page.getByLabel("Przewidywana data porodu").fill("2027-03-01"); await next(page);
  await expect(page.locator(".legal-basis summary")).toBeVisible();
  await page.getByLabel("Forma zatrudnienia — mama").selectOption("employee");
  await page.getByLabel("Jak podasz dane do wyliczenia?").selectOption("estimate");
  await page.getByLabel("Wynagrodzenie brutto z ostatniego miesiąca (zł)").fill("6000");
  await next(page); await page.getByLabel("Nie, liczymy plan jednej osoby").check();
  await next(page); await next(page); await next(page);
  const result = await calculate(page);
  expect(result.bases.mother).toBe("5177.40");
  expect(result.issues.some((issue: { code: string }) => issue.code === "base.estimate")).toBeTruthy();
  await expect(page.getByText("Wynik orientacyjny.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Budżet", exact: true })).toHaveCount(0);
  await expect(page.getByText("Skąd te kwoty? · Szczegóły obliczeń", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Główna nawigacja" }).getByRole("link", { name: "Moje dane", exact: true }).click();
  await page.getByRole("button", { name: "Zaloguj się przez mObywatel", exact: true }).click();
  await expect(page).toHaveURL(/\/me$/);
  await page.getByRole("button", { name: /Anna Kowalczyk/ }).click();
  await expect(page).toHaveURL(/\/me$/);
});
