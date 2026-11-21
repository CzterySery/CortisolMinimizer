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
  const play = page.getByRole("button", { name: /^Zagraj kartę:/ });
  await expect(play.first()).toBeVisible();
  await shot(page, info, "01-board");
  for (let round = 1; round <= 5; round++) {
    const enabled = play.and(page.locator(":enabled")).first();
    await expect(enabled).toBeVisible();
    await enabled.click();
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
  await expect(page.getByRole("heading", { name: /Twoje dokumenty/ })).toBeVisible();
  // fill and "send" one leave/benefit form; anonymous, so repeated runs don't use up anyone's list
  const form = page.locator("details.form-card").filter({ hasNotText: "Odpis" }).first();
  await form.locator("summary").click();
  await form.getByLabel("Imię i nazwisko").fill("Jan Przykładowy");
  await form.getByRole("button", { name: /^Wyślij do:/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Wysłano (symulacja)" })).toBeVisible();
  await shot(page, info, "04-applications");

  await page.goto("/login");
  await page.getByRole("button", { name: /Anna Kowalczyk/ }).click();
  await expect(page).toHaveURL(/\/me/);
  await expect(page.getByText("ZY 1048576")).toBeVisible();
  await shot(page, info, "05-me");
  await page.getByRole("button", { name: "Moje wnioski" }).click();
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
  await expect(page.getByText(/Urlop ojcowski trwa 14 dni/)).toBeVisible();
  await shot(page, info, "08-help");

  await page.goto("/admin");
  await page.getByLabel("Token admina").fill(process.env.ADMIN_TOKEN ?? "dev");
  await page.getByRole("button", { name: "Wczytaj" }).click();
  await expect(page.getByText("Stawki zasiłków (część podstawy)")).toBeVisible();
  await shot(page, info, "09-admin");
});
