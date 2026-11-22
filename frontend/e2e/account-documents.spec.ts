import { expect, test } from "@playwright/test";

const plan = {
  family: { mother: { employment: "employee", base_monthly: "6000" }, due_date: "2027-03-01" },
  blocks: [{ who: "mother", kind: "maternity", start: "2027-03-01", days: 140 }],
};
const doc = { form: "Wniosek o urlop rodzicielski", who: "mother", recipient: "employer", done: false,
  start: "2027-07-19", end: "2027-08-01", due_by: "2027-06-28", note: "", rule: "KP art. 182¹d" };
const second = { ...doc, start: "2027-09-01", end: "2027-09-14" };
const filed = { ...doc, filed_on: "2027-06-01", status: "wysłano (symulacja)", payload: {} };
const account = { persona: { id: "anna", who: "mother", name: "Anna Kowalczyk", description: "Konto testowe" },
  plan, insurance: [], ezla: [], debt: { as_of: "2027-03-01", debt: "0", blocks_benefits: false }, applications: [filed] };
const result = { documents: [doc, second] };

test("fresh deployment origin loads the account plan and persisted receipts without local plan or receipt cache", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("otwartekarty.user", "account-test"));
  const applications = [filed];
  await page.route("**/api/v1/zus/me", (r) => r.fulfill({ json: { ...account, applications } }));
  await page.route("**/api/v1/calc/plan", (r) => r.fulfill({ json: result }));
  await page.route("**/api/v1/applications", (r) => {
    expect(r.request().headers().authorization).toBe("Bearer account-test");
    expect(r.request().postDataJSON()).toMatchObject({ start: second.start, end: second.end });
    applications.push({ ...filed, ...second });
    return r.fulfill({ json: { id: 9, recipient: "employer", status: "wysłano (symulacja)" } });
  });
  await page.goto("/me");
  await expect(page.getByRole("heading", { name: /Anna Kowalczyk/ })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Twoje dokumenty", exact: true })).toHaveCount(0);
  const items = page.locator("#dokumenty .docs > li");
  await expect(items.first()).toHaveClass("done");
  await expect(items.nth(1)).not.toHaveClass("done");
  expect(await page.evaluate(() => sessionStorage.getItem("otwartekarty.myplan"))).toBeNull();
  await items.nth(1).getByRole("button").click();
  await page.getByRole("button", { name: /^Wyślij do:/ }).click();
  await expect(page.getByRole("status")).toContainText("numer 9");
  await expect(items.nth(1)).toHaveClass("done");
  await expect(page.getByText("Złożone dokumenty na koncie:", { exact: false })).toContainText("2");
  await page.evaluate(() => sessionStorage.removeItem("otwartekarty.receipts.v1"));
  await page.reload();
  await expect(items).toHaveCount(2);
  await expect(items.nth(1)).toHaveClass("done");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: test.info().outputPath("account-documents.png"), fullPage: true });
});

test("account errors are visible and a retry restores receipt states without anonymous sending", async ({ page }) => {
  await page.addInitScript((saved) => {
    sessionStorage.setItem("otwartekarty.user", "account-test");
    sessionStorage.setItem("otwartekarty.myplan", JSON.stringify(saved));
  }, plan);
  let fail = true;
  await page.route("**/api/v1/zus/me", (r) => fail ? r.fulfill({ status: 503, json: { detail: "Konto chwilowo niedostępne" } })
    : r.fulfill({ json: account }));
  await page.route("**/api/v1/calc/plan", (r) => r.fulfill({ json: result }));
  await page.goto("/me");
  await expect(page.getByRole("alert").filter({ hasText: "Konto chwilowo niedostępne" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Wypełnij i wyślij (symulacja)", exact: false })).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Spróbuj pobrać ponownie" }).click();
  await expect(page.locator("#dokumenty .docs > li").first()).toHaveClass("done");
});

test("expired deployment sessions are explained and never silently send anonymously", async ({ page }) => {
  await page.addInitScript((saved) => {
    sessionStorage.setItem("otwartekarty.user", "expired");
    sessionStorage.setItem("otwartekarty.myplan", JSON.stringify(saved));
  }, plan);
  await page.route("**/api/v1/zus/me", (r) => r.fulfill({ status: 401, json: { detail: "Sesja wygasła" } }));
  await page.route("**/api/v1/calc/plan", (r) => r.fulfill({ json: result }));
  await page.goto("/applications");
  await expect(page).toHaveURL(/\/me#dokumenty$/);
  await expect(page.getByRole("status")).toContainText("Sesja wygasła");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("otwartekarty.user"))).toBeNull();
  await expect(page.getByRole("button", { name: /Wypełnij i wyślij/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Kontynuuj bez logowania" }).click();
  await expect(page.getByRole("button", { name: /Wypełnij i wyślij/ }).first()).toBeVisible();
});

test("filed history stays visible even if recalculating the current document list fails", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("otwartekarty.user", "account-test"));
  await page.route("**/api/v1/zus/me", (r) => r.fulfill({ json: account }));
  await page.route("**/api/v1/calc/plan", (r) => r.fulfill({ status: 503, json: { detail: "Kalkulator niedostępny" } }));
  await page.goto("/me");
  await expect(page.getByRole("alert").filter({ hasText: "Kalkulator niedostępny" })).toBeVisible();
  await expect(page.locator("#dokumenty .docs > li").first()).toHaveClass("done");
});
