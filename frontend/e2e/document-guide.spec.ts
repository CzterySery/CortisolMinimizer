import { expect, test, type Page } from "@playwright/test";

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBeTruthy();
}

async function library(page: Page, code: string) {
  await page.goto("/applications");
  await page.getByText("Przejrzyj oficjalne formularze ZUS — demo pól", { exact: true }).click();
  await page.locator(".form-template-library").getByRole("button").filter({ has: page.locator("strong", { hasText: new RegExp(`^${code}$`) }) }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("official ZAM fields and page images form an interactive, non-submitting demo", async ({ page }, info) => {
  let sent = 0;
  page.on("request", (r) => { if (r.method() === "POST" && /applications|birth-certificate/.test(r.url())) sent++; });
  await library(page, "ZAM");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("link", { name: "Otwórz oryginalny PDF" })).toHaveAttribute("href", "/forms/zam/original.pdf");
  await expect(dialog.getByText("Wpisz swój numer PESEL", { exact: true })).toBeVisible();
  await dialog.getByLabel("Wybierz pole na tej stronie").selectOption("3");
  await expect(dialog.getByText("Wpisz swoje imię", { exact: true })).toBeVisible();
  await dialog.getByLabel("Próbny wpis w tym polu").fill("PRZYKŁAD");
  await expect(dialog.locator('[data-field="p1-3"] .pdf-example')).toHaveText("PRZYKŁAD");
  await page.screenshot({ path: `../tmp/form-guide-${info.project.name}.png`, fullPage: true });
  await dialog.getByLabel("Strona formularza").selectOption("4");
  await dialog.getByLabel("Wybierz pole na tej stronie").selectOption("4");
  await expect(dialog.locator(".field-official-instruction")).toContainText("z innego tytułu");
  await expect(dialog.locator(".field-official-instruction")).toContainText("ojcowskiego");
  await dialog.getByLabel("Strona formularza").selectOption("6");
  await expect(dialog.getByRole("heading", { name: "Pouczenie z oryginalnego formularza" })).toBeVisible();
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(sent).toBe(0);
});

test("known periods and leave type are filled immediately, editable and restorable", async ({ page }) => {
  await page.goto("/applications");
  await page.evaluate(() => sessionStorage.setItem("otwartekarty.myplan", JSON.stringify({
    family: { mother: { employment: "self_employed", voluntary_sickness: true, base_monthly: "6000" }, due_date: "2027-03-01" },
    blocks: [{ who: "mother", kind: "maternity", start: "2027-03-01", days: 140 }],
  })));
  await page.reload();
  await expect(page.locator("details.form-card").filter({ hasText: /Z-3:/ })).toHaveCount(0);
  await page.locator(".docs").getByRole("button", { name: /^ZAM:/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Próbny wpis w tym polu")).toHaveValue(""); // identity is not guessed
  await dialog.getByLabel("Strona formularza").selectOption("1");
  await dialog.getByLabel("Wybierz pole na tej stronie").selectOption("2");
  await expect(dialog.getByLabel("Próbne zaznaczenie X")).not.toBeChecked(); // not adoption
  await expect(dialog.locator('[data-field="p2-1"] .pdf-example')).toHaveText("X");
  await dialog.getByLabel("Wybierz pole na tej stronie").selectOption("3");
  await expect(dialog.getByLabel("Próbny wpis w tym polu")).toBeVisible();
  await expect(dialog.getByText("Uzupełniono automatycznie", { exact: true })).toBeVisible();
  await expect(dialog.locator('[data-field="p2-3"] .pdf-example')).toContainText("2027");
  const original = await dialog.getByLabel("Próbny wpis w tym polu").inputValue();
  await dialog.getByLabel("Próbny wpis w tym polu").fill("");
  await expect(dialog.locator('[data-field="p2-3"] .pdf-example')).toHaveCount(0);
  await dialog.getByRole("button", { name: "Przywróć dane źródłowe" }).click();
  await expect(dialog.getByLabel("Próbny wpis w tym polu")).toHaveValue(original);
  await dialog.getByLabel("Powiększenie").selectOption("200");
  await noOverflow(page);
});

test("account identity and payer are filled only for the matching parent, library stays blank", async ({ page }, info) => {
  await page.route("**/api/v1/zus/me", (route) => route.fulfill({ json: {
    persona: { id: "demo", name: "Anna Kowalczyk", who: "mother" }, applications: [],
    insurance: [{ payer: "Przykładowa firma", start: "2020-01-01", end: null }],
  } }));
  await page.goto("/applications");
  await page.evaluate(() => {
    sessionStorage.setItem("otwartekarty.user", "demo");
    sessionStorage.setItem("otwartekarty.myplan", JSON.stringify({
      family: { mother: { employment: "self_employed", voluntary_sickness: true, base_monthly: "6000" },
        father: { employment: "self_employed", voluntary_sickness: true, base_monthly: "6000" }, due_date: "2027-03-01" },
      blocks: [{ who: "mother", kind: "maternity", start: "2027-03-01", days: 140 },
        { who: "father", kind: "paternity", start: "2027-03-01", days: 14 }],
    }));
  });
  await page.reload();
  await expect(page.getByText("Dokumenty, które ZUS już ma, są odhaczone.", { exact: false })).toBeVisible();
  await page.locator(".docs").getByRole("button", { name: /^ZAM: wniosek o zasiłek macierzyński/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('[data-field="p1-3"] .pdf-example')).toHaveText("Anna");
  await expect(dialog.locator('[data-field="p1-4"] .pdf-example')).toHaveText("Kowalczyk");
  await expect(dialog.locator('[data-field="p1-16"] .pdf-example')).toHaveText("Przykładowa firma");
  await expect(dialog.locator('[data-field="p1-0"] .pdf-example')).toHaveCount(0);
  await page.screenshot({ path: `../tmp/form-prefilled-${info.project.name}.png`, fullPage: true });
  await dialog.getByLabel("Strona formularza").selectOption("4");
  await expect(dialog.locator(".pdf-example")).toHaveCount(0); // other parent and declarations
  await page.keyboard.press("Escape");
  await page.locator(".docs").getByRole("button", { name: /^ZAM: wniosek o zasiłek za urlop ojcowski/ }).click();
  await expect(dialog.locator(".pdf-example")).toHaveCount(0); // father's first page
  await dialog.getByLabel("Strona formularza").selectOption("1");
  await expect(dialog.locator('[data-field="p2-9"] .pdf-example')).toHaveText("X");
  await expect(dialog.locator('[data-field="p2-10"] .pdf-example')).toContainText("2027");
  await page.keyboard.press("Escape");
  await library(page, "ZAM");
  await expect(dialog.locator(".pdf-example")).toHaveCount(0);
  await dialog.getByLabel("Strona formularza").selectOption("1");
  await expect(dialog.locator(".pdf-example")).toHaveCount(0);
  await noOverflow(page);
});

for (const code of ["Z-15", "ZAS-53", "ZNp-7", "Z-3", "Z-3a"]) test(`official ${code} shows its real pages and correct responsibility`, async ({ page }) => {
  await library(page, code);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img")).toBeVisible();
  if (["Z-3", "Z-3a"].includes(code)) {
    await expect(dialog.getByText("Wypełnia płatnik składek — pracodawca lub zleceniodawca.", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Próbny wpis w tym polu")).toHaveCount(0);
  }
  if (code === "Z-15") {
    await expect(dialog.getByText(/Z-15 zastępuje Z-15A/)).toBeVisible();
    await dialog.getByLabel("Strona formularza").selectOption("1");
    await dialog.getByLabel("Wybierz pole na tej stronie").selectOption("4");
    await expect(dialog.locator(".field-official-instruction")).toHaveText("Wpisz nazwisko osoby, nad którą sprawujesz opiekę.");
  }
  if (code === "ZNp-7") {
    await dialog.getByLabel("Strona formularza").selectOption("2");
    await expect(dialog.getByText("To część dla płatnika.", { exact: false })).toBeVisible();
    await expect(dialog.getByLabel("Próbny wpis w tym polu")).toHaveCount(0);
  }
  await noOverflow(page);
});

test("employer leave example is clearly distinct from an official ZUS PDF", async ({ page }) => {
  await page.goto("/applications");
  await page.evaluate(() => sessionStorage.setItem("otwartekarty.myplan", JSON.stringify({
    family: { mother: { employment: "employee", base_monthly: "6000" }, due_date: "2027-03-01" },
    blocks: [{ who: "mother", kind: "maternity", start: "2027-03-01", days: 140 }],
  })));
  await page.reload();
  await page.locator(".docs").getByRole("button", { name: /^Wniosek o urlop macierzyński/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/nasz przykład pisma do pracodawcy/)).toBeVisible();
  await dialog.getByLabel("Fragment wniosku").selectOption("3");
  await expect(dialog.getByRole("heading", { name: "Treść i okres" })).toBeVisible();
  await noOverflow(page);
});
