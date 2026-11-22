import { expect, test } from "@playwright/test";

const doc = { form: "ZAM: wniosek o zasiłek macierzyński", who: "mother", recipient: "zus", done: false,
  start: "2027-03-01", end: "2027-07-18", due_by: null, note: "", rule: "art. 29" };
const result = { months: [], calendar: [{ who: "mother", kind: "maternity", start: doc.start, end: doc.end, benefit: "0" }],
  documents: [], issues: [], explain: [], bases: { mother: "0" }, top_up: "0",
  pools: { maternity_days_left: 0, parental_days_left: 287, exclusive_days_left: { mother: 63 },
    paternity_days_left: 14, parental_parts_used: 0, care_days_left: 60 } };

test("incomplete cases show missing data and refused cases hide all financial reports", async ({ page }) => {
  let invalid = false;
  await page.route("**/api/v1/cases/samples", (r) => r.fulfill({ json: [] }));
  await page.route("**/api/v1/cases/evaluate*", (r) => r.fulfill({ json: {
    insured: invalid ? false : null, entitled: invalid ? false : null, waiting_period_ok: null, debt_block: false,
    missing_data: ["Podaj datę początku ubezpieczenia."], unknown_bases: ["mother"],
    result: { ...result, issues: invalid ? [{ code: "insured-parent.not-insured", severity: "error", text: "Brak ubezpieczenia", rule: "art. 29" }] : [] },
  } }));
  await page.goto("/cases");
  await page.getByRole("button", { name: "Wpisz dane ręcznie" }).click();
  await page.getByRole("button", { name: "Sprawdź sprawę", exact: true }).click();
  await expect(page.getByText("Prawo do zasiłku: do uzupełnienia", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Brak danych", exact: true })).toBeVisible();
  invalid = true;
  await page.getByRole("button", { name: "Sprawdź sprawę", exact: true }).click();
  await expect(page.getByText("Plan zawiera błędy prawne.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kwoty zasiłków", exact: true })).toHaveCount(0);
  await expect(page.getByText("Skąd te kwoty?", { exact: false })).toHaveCount(0);
});

test("PDF edits are submitted and a receipt survives reload without completing another period", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("otwartekarty.myplan", JSON.stringify({
    family: { mother: { employment: "self_employed", voluntary_sickness: true }, due_date: "2027-03-01" },
    blocks: [{ who: "mother", kind: "maternity", start: "2027-03-01", days: 140 }],
  })));
  await page.route("**/api/v1/calc/plan", (r) => r.fulfill({ json: { ...result, documents: [doc,
    { ...doc, start: "2027-08-01", end: "2027-08-14" }] } }));
  let payload: { official_fields?: Record<string, string>; start?: string } = {};
  await page.route("**/api/v1/applications", (r) => {
    payload = r.request().postDataJSON();
    return r.fulfill({ json: { id: 42, recipient: "zus", status: "wysłano (symulacja)" } });
  });
  await page.goto("/applications");
  const items = page.locator(".docs > li");
  await items.first().getByRole("button").click();
  await page.getByLabel("Imię i nazwisko", { exact: true }).fill("Anna Przykładowa");
  await page.getByRole("button", { name: "Pokaż demo: co wpisać i gdzie" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Pole 4:/ }).click();
  await dialog.getByLabel("Próbny wpis w tym polu").fill("Anna Maria");
  await dialog.getByRole("button", { name: "Zamknij podgląd" }).click();
  await page.getByRole("button", { name: /^Wyślij do:/ }).click();
  await expect(items.first()).toHaveClass("done");
  expect(payload.official_fields?.["p1-3"]).toBe("Anna Maria");
  expect(payload.start).toBe(doc.start);
  await page.reload();
  await expect(items.first()).toHaveClass("done");
  await expect(items.nth(1)).not.toHaveClass("done");
  await page.getByText("Treść złożonych symulacji", { exact: true }).click();
  await expect(page.getByText("Anna Maria", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("account reload matches exact periods and does not use an undated legacy receipt", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("otwartekarty.user", "receipt-test");
    sessionStorage.setItem("otwartekarty.myplan", JSON.stringify({ family: {
      mother: { employment: "employee" }, due_date: "2027-03-01" }, blocks: [] }));
  });
  const second = { ...doc, start: "2027-08-01", end: "2027-08-14" };
  await page.route("**/api/v1/calc/plan", (r) => r.fulfill({ json: { ...result, documents: [doc, second] } }));
  await page.route("**/api/v1/zus/me", (r) => r.fulfill({ json: {
    persona: { id: "demo", name: "Anna Przykładowa", who: "mother" }, insurance: [],
    applications: [{ ...doc, payload: {} }, { form: doc.form, who: doc.who, recipient: doc.recipient, payload: {} }],
  } }));
  await page.goto("/applications");
  await expect(page.locator(".docs > li").first()).toHaveClass("done");
  await expect(page.locator(".docs > li").nth(1)).not.toHaveClass("done");
  await page.reload();
  await expect(page.locator(".docs > li").first()).toHaveClass("done");
  await expect(page.locator(".docs > li").nth(1)).not.toHaveClass("done");
});
