import { expect, test } from "@playwright/test";

const plan = {
  family: { mother: { employment: "employee", base_monthly: "6000" }, due_date: "2027-03-01" },
  blocks: [{ who: "mother", kind: "maternity", start: "2027-03-01", days: 140 }],
};
const doc = { form: "Wniosek o urlop rodzicielski", who: "mother", recipient: "employer", done: false,
  start: "2027-07-19", end: "2027-08-01", due_by: "2027-06-28", note: "", rule: "art. 182 KP" };
const result = { months: [], calendar: [], documents: [], issues: [], explain: [], top_up: "0", bases: { mother: "6000" },
  pools: { maternity_days_left: 0, parental_days_left: 287, exclusive_days_left: { mother: 63, father: 63 },
    paternity_days_left: 14, parental_parts_used: 0, care_days_left: 60 } };

test("unfiled checklist item expands its own form and a failed send can be retried", async ({ page }) => {
  await page.addInitScript((saved) => sessionStorage.setItem("otwartekarty.myplan", JSON.stringify(saved)), plan);
  await page.route("**/api/v1/calc/plan", (route) => route.fulfill({ json: { ...result, documents: [doc,
    { ...doc, start: "2027-09-01", end: "2027-09-14" },
    { ...doc, form: "Z-3: zaświadczenie płatnika", recipient: "zus" },
    { ...doc, form: "Wniosek już wysłany", done: true },
  ] } }));
  const payloads: unknown[] = [];
  await page.route("**/api/v1/applications", (route) => {
    payloads.push(route.request().postDataJSON());
    return payloads.length === 1
      ? route.fulfill({ status: 503, json: { detail: "Próbna awaria" } })
      : route.fulfill({ json: { id: 42, status: "Wysłano (symulacja)", recipient: "employer" } });
  });
  await page.goto("/applications");
  await expect(page).toHaveURL(/\/me#dokumenty$/);
  const menu = page.getByRole("button", { name: "Menu" }); if (await menu.isVisible()) await menu.click();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Moje dane" })).toBeVisible();
  await expect(page.locator(".application-editor")).toHaveCount(0);
  const items = page.locator(".docs > li");
  await items.nth(0).getByRole("button").click();
  const form = page.locator(".application-editor");
  await expect(form).toHaveCount(1);
  await expect(items.nth(0).locator("form")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(form.getByRole("button", { name: /^Wyślij do:/ })).toBeDisabled();
  await form.getByLabel("Imię i nazwisko", { exact: true }).fill("Anna Przykładowa");
  await form.getByRole("button", { name: /^Wyślij do:/ }).click();
  await expect(form.getByRole("alert")).toHaveText("Próbna awaria");
  await expect(items.nth(0)).not.toHaveClass("done");
  await form.getByRole("button", { name: /^Wyślij do:/ }).click();
  await expect(page.getByRole("status")).toContainText("numer 42");
  await expect(items.nth(0)).toHaveClass("done");
  await expect(items.nth(1)).not.toHaveClass("done");
  await expect(form).toHaveCount(0);
  expect(payloads[1]).toMatchObject({ form: doc.form, who: "mother", recipient: "employer",
    payload: { imie_nazwisko: "Anna Przykładowa", okres_od: doc.start, okres_do: doc.end } });
  await items.nth(2).getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Wyślij do:/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await items.nth(3).getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(form).toHaveCount(0);
});

test("signed-in calculator starts at the profile result and keeps earlier steps editable", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("otwartekarty.user", "profile-test"));
  await page.route("**/api/v1/zus/me", (route) => route.fulfill({ json: { plan } }));
  let calculated: unknown;
  await page.route("**/api/v1/calc/plan", (route) => {
    calculated = route.request().postDataJSON();
    return route.fulfill({ json: result });
  });
  await page.goto("/calculator");
  await expect(page.locator("[aria-current=step]")).toHaveText(/8\s*Wynik/);
  await expect(page.getByRole("heading", { name: "Kwoty zasiłków", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(calculated).toEqual(plan);
  await page.getByRole("button", { name: /3\s*Mama/ }).click();
  await expect(page.getByLabel("Podstawa wymiaru zasiłku (zł/mies.)", { exact: true })).toHaveValue("6000");
});

test("expired profile session returns to manual entry without calculating", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("otwartekarty.user", "expired"));
  await page.route("**/api/v1/zus/me", (route) => route.fulfill({ status: 401, json: { detail: "Sesja wygasła" } }));
  let requests = 0;
  await page.route("**/api/v1/calc/plan", (route) => { requests++; return route.fulfill({ json: result }); });
  await page.goto("/calculator");
  await expect(page.getByRole("button", { name: /^Urodzenie dziecka/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("otwartekarty.user"))).toBeNull();
  expect(requests).toBe(0);
});

test("explicit game handoff takes precedence over the signed-in profile", async ({ page }) => {
  await page.addInitScript((saved) => {
    sessionStorage.setItem("otwartekarty.user", "profile-test");
    sessionStorage.setItem("otwartekarty.plan", JSON.stringify(saved));
  }, plan);
  let requests = 0;
  await page.route("**/api/v1/zus/me", (route) => { requests++; return route.fulfill({ json: { plan } }); });
  await page.goto("/calculator");
  await expect(page.getByRole("button", { name: /^Urodzenie dziecka/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[aria-current=step]")).toHaveText(/1\s*Sytuacja/);
  expect(requests).toBe(0);
});
