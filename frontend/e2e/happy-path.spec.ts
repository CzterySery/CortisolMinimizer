import { expect, test, type Page, type TestInfo } from "@playwright/test";

// The jury's walk through the app, one screenshot per screen (docs/screenshots/<project>-<step>.png).
// Every screen must fit the viewport: a page wider than the phone breaks taps on mobile (the layout viewport grows).
async function shot(page: Page, info: TestInfo, step: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${step}: horizontal overflow`)
    .toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: `${process.env.SCREENSHOTS_DIR ?? "../docs/screenshots"}/${info.project.name}-${step}.png`, fullPage: true });
}

test("game → calculator → applications → mObywatel → cases → help → admin", async ({ page }, info) => {
  await page.goto("/");
  // A card in hand is a focusable group played with Enter (the keyboard path; clicking its body also plays it).
  const playable = page.getByRole("group", { name: /^Karta: .*aby zagrać\.$/ }).and(page.locator(":not(.is-unavailable)"));
  await expect(playable.first()).toBeVisible();
  await shot(page, info, "01-board");
  for (let round = 1; round <= 5; round++) {
    const card = playable.first();
    const id = await card.getAttribute("data-card-id");
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(`.hand-card[data-card-id="${id}"]`)).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Przeliczam" })).toHaveCount(0);
  }
  await shot(page, info, "02-board-complete");

  await page.getByRole("button", { name: "Pokaż ten scenariusz w kalkulatorze" }).click();
  await expect(page).toHaveURL(/\/calculator/);
  await expect(page.getByRole("heading", { name: "Kwoty zasiłków", exact: true })).toHaveCount(0);
  for (let step = 0; step < 6; step++) await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await page.getByLabel("Standardowo: 100% macierzyńskiego, 70% rodzicielskiego").check();
  await page.getByRole("button", { name: "Oblicz i pokaż wynik" }).click();
  await expect(page.getByText("Kwoty zasiłków")).toBeVisible();
  await shot(page, info, "03-calculator");
  await page.getByRole("link", { name: "Przygotuj wnioski dla tego planu" }).click();
  await expect(page.getByRole("heading", { name: "Twoje dokumenty", exact: true })).toBeVisible();
  // fill and "send" one leave/benefit form; anonymous, so repeated runs don't use up anyone's list
  await page.locator(".docs").getByRole("button", { name: /Wypełnij i wyślij \(symulacja\)/ }).filter({ hasNotText: "Odpis" }).first().click();
  const form = page.locator(".application-editor");
  await form.getByLabel("Imię i nazwisko").fill("Jan Przykładowy");
  await form.getByRole("button", { name: /^Wyślij do:/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Wysłano (symulacja)" })).toBeVisible();
  await shot(page, info, "04-applications");

  await page.goto("/login");
  await page.getByRole("button", { name: /Anna Kowalczyk/ }).click();
  await expect(page).toHaveURL(/\/me/);
  await page.getByText("Zwolnienia lekarskie (e-ZLA) i podstawy składek", { exact: true }).click();
  await expect(page.getByText("ZY 1048576")).toBeVisible();
  await shot(page, info, "05-me");
  await page.getByRole("link", { name: "Przejdź do dokumentów" }).click();
  await expect(page.getByText("Dokumenty, które ZUS już ma, są odhaczone.")).toBeVisible();
  await expect(page.locator(".docs li.done").first()).toBeVisible(); // e-ZLA and Z-3 she already filed
  await shot(page, info, "06-applications-logged-in");

  await page.goto("/cases");
  await page.getByRole("button", { name: /9 tygodni urlopu rodzicielskiego/ }).click();
  await expect(page.getByText("Wynik kalkulatora jest zgodny.")).toBeVisible();
  await shot(page, info, "07-cases");

  await page.goto("/help");
  await page.getByLabel("Twoje pytanie").fill("Ile trwa urlop ojcowski?");
  await page.getByRole("button", { name: "Wyślij pytanie" }).click();
  // The wording comes from the local answer or, with a model key, from Gemini; both state the 14-day pool.
  await expect(page.locator(".rag-answer")).toContainText(/14 dni/, { timeout: 20_000 });
  await shot(page, info, "08-help");

  await page.goto("/admin");
  await page.getByLabel("Token admina").fill(process.env.ADMIN_TOKEN ?? "dev");
  await page.getByRole("button", { name: "Wczytaj" }).click();
  await expect(page.getByText("Stawki zasiłków (część podstawy)")).toBeVisible();
  await shot(page, info, "09-admin");
});
