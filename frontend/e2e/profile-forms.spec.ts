import { expect, test } from "@playwright/test";

for (const profile of [
  { name: "Anna Kowalczyk", pesel: "00000000001", street: "Przykładowa", payerStreet: "Demonstracyjna", nip: "0000000001", form: "Z-3", tick: "p2-7" },
  { name: "Magdalena Wiśniewska", pesel: "00000000002", street: "Demonstracyjna", payerStreet: "Demonstracyjna", nip: "0000000002", form: "ZAM", tick: "p2-1" },
  { name: "Aleksandra Zielińska", pesel: "00000000003", street: "Testowa", payerStreet: "Przykładowa", nip: "0000000003", form: "Z-3", tick: "p2-11" },
]) test(`${profile.name}: inline login and profile fields in the correct PDF areas`, async ({ page }, info) => {
  await page.goto("/me");
  await page.getByRole("button", { name: "Zaloguj się przez mObywatel", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "3 symulacje", exact: true })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(profile.name) }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("button", { name: "Wyloguj", exact: true })).toBeVisible();
  const list = page.locator("#dokumenty .docs");
  await expect(list).not.toContainText("Wystawia lekarz");
  await expect(list).not.toContainText("rozp. dok.");
  await list.getByRole("button", { name: profile.form === "ZAM" ? /^ZAM: wniosek o zasiłek macierzyński/ : /^Z-3:/ }).first().click();
  if (profile.form === "ZAM") await page.getByRole("button", { name: "Pokaż demo: co wpisać i gdzie" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Dane osobowe i numery PESEL są fikcyjne.", { exact: false })).toBeVisible();
  await expect(dialog.locator(`[data-field="${profile.form === "ZAM" ? "p1-0" : "p1-14"}"] .pdf-example`)).toHaveText(profile.pesel);
  if (profile.form === "Z-3") {
    await expect(dialog.locator('[data-field="p1-4"] .pdf-example')).toHaveCount(0); // payer's PESEL is not the parent's
    await expect(dialog.locator('[data-field="p1-7"] .pdf-example')).toHaveText(profile.payerStreet);
    await expect(dialog.locator('[data-field="p1-2"] .pdf-example')).toHaveText(profile.nip);
    await expect(dialog.locator('[data-field="p1-15"] .pdf-example')).toHaveCount(0); // DOB is conditional on no PESEL
    await dialog.getByLabel("Strona formularza").selectOption("1");
  }
  await expect(dialog.locator(`[data-field="${profile.form === "ZAM" ? "p1-5" : "p2-0"}"] .pdf-example`)).toHaveText(profile.street);
  if (profile.form === "ZAM") await dialog.getByLabel("Strona formularza").selectOption("1");
  await expect(dialog.locator(`[data-field="${profile.tick}"] .pdf-example`)).toHaveText("X");
  await page.screenshot({ path: info.outputPath("profile-form.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Wyloguj", exact: true }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("button", { name: "Zaloguj się przez mObywatel", exact: true })).toBeVisible();
});

test("Z-3a fills unconditional birth date and care request, without payer identifiers", async ({ page }) => {
  const plan = { family: { mother: { employment: "contract", voluntary_sickness: true, base_monthly: "6000" }, due_date: "2027-03-01" },
    blocks: [{ who: "mother", kind: "care", start: "2027-09-01", days: 7 }] };
  const doc = { form: "Z-3a: zaświadczenie płatnika składek do zasiłku opiekuńczego", who: "mother", recipient: "zus",
    start: "2027-09-01", end: "2027-09-07", due_by: null, done: false, note: "", rule: "art. 61" };
  await page.addInitScript(() => sessionStorage.setItem("otwartekarty.user", "demo-test"));
  await page.route("**/api/v1/zus/me", (r) => r.fulfill({ json: {
    persona: { id: "demo", who: "mother", name: "Magdalena Wiśniewska", description: "Dane fikcyjne" },
    personal_data: { pesel: "00000000002", birth_date: "1992-02-09", street: "Demonstracyjna", house_number: "20",
      apartment_number: "7", postal_code: "30-001", city: "Kraków" },
    plan, insurance: [], ezla: [], applications: [], debt: { as_of: "2027-03-01", debt: "0", blocks_benefits: false },
  } }));
  await page.route("**/api/v1/calc/plan", (r) => r.fulfill({ json: { documents: [doc] } }));
  await page.goto("/me");
  await page.locator("#dokumenty .docs").getByRole("button", { name: /^Z-3a:/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('[data-field="p1-14"] .pdf-example')).toHaveText("00000000002");
  await expect(dialog.locator('[data-field="p1-15"] .pdf-example')).toHaveText("09 02 1992");
  await expect(dialog.locator('[data-field="p1-4"] .pdf-example')).toHaveCount(0);
  await dialog.getByLabel("Strona formularza").selectOption("1");
  await expect(dialog.locator('[data-field="p2-9"] .pdf-example')).toHaveText("X");
  await expect(dialog.locator('[data-field="p2-7"] .pdf-example')).toHaveCount(0);
  await expect(dialog.locator('[data-field="p2-10"] .pdf-example')).toContainText("2027");
});
