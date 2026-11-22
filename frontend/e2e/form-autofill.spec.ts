import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const personas = JSON.parse(readFileSync(resolve(__dirname, "../../backend/app/data/personas.json"), "utf8"));

for (const persona of personas) test(`${persona.id}: account data fills all six PDFs and employer letter`, async ({ page, request }) => {
  const session = await request.post("/api/v1/auth/mobywatel", { data: { persona_id: persona.id } });
  expect(session.ok()).toBeTruthy();
  const { token } = await session.json();
  const response = await request.get("/api/v1/zus/me", { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok()).toBeTruthy();
  const account = await response.json();
  expect(account.personal_data).toEqual(persona.personal_data);
  expect(account.insurance[0].payer_data).toEqual(persona.insurance[0].payer_data);
  const insurance = persona.insurance[0];
  const doc = { who: persona.who, recipient: "zus", start: insurance.start, end: insurance.start,
    done: false, due_by: null, note: "", rule: "test" };
  const forms = ["ZAM", "Z-15", "ZAS-53", "ZNp-7", "Z-3", "Z-3a", "Wniosek o urlop macierzyński"];
  const documents = forms.map((form) => ({ ...doc, form, recipient: form.startsWith("Wniosek") ? "employer" : "zus" }));
  await page.addInitScript((plan) => {
    sessionStorage.setItem("otwartekarty.user", "test-profile");
    sessionStorage.setItem("otwartekarty.myplan", JSON.stringify(plan));
  }, persona.plan);
  await page.route("**/api/v1/zus/me", (r) => r.fulfill({ json: { ...account, applications: [] } }));
  await page.route("**/api/v1/calc/plan", (r) => r.fulfill({ json: { documents } }));
  await page.goto("/me");
  for (const [index, form] of forms.entries()) {
    await page.locator("#dokumenty .docs > li").nth(index).getByRole("button").first().click();
    if (!["Z-3", "Z-3a"].includes(form))
      await page.getByRole("button", { name: "Pokaż demo: co wpisać i gdzie" }).click();
    const dialog = page.getByRole("dialog");
    if (form.startsWith("Wniosek")) {
      await expect(dialog.locator(".leave-demo-paper")).toContainText(persona.personal_data.pesel);
      await expect(dialog.locator(".leave-demo-paper")).toContainText(persona.personal_data.street);
      await expect(dialog.locator(".leave-demo-paper")).toContainText(insurance.payer_data.street);
      await expect(dialog.locator(".leave-demo-paper")).toContainText(insurance.payer_data.nip);
    } else {
      const certificate = form === "Z-3" || form === "Z-3a";
      const personalId = certificate ? "p1-14" : form === "ZNp-7" ? "p1-2" : "p1-0";
      await expect(dialog.locator(`[data-field="${personalId}"] .pdf-example`)).toHaveText(persona.personal_data.pesel);
      const birthId = certificate ? "p1-15" : form === "ZNp-7" ? "p1-3" : "p1-1";
      if (form === "Z-3a") await expect(dialog.locator(`[data-field="${birthId}"] .pdf-example`))
        .toHaveText(persona.personal_data.birth_date.split("-").reverse().join(" "));
      else await expect(dialog.locator(`[data-field="${birthId}"] .pdf-example`)).toHaveCount(0);
      if (certificate) await dialog.getByLabel("Strona formularza").selectOption("1");
      const streetId = certificate ? "p2-0" : form === "ZNp-7" ? "p1-7" : "p1-5";
      await expect(dialog.locator(`[data-field="${streetId}"] .pdf-example`)).toHaveText(persona.personal_data.street);
      await dialog.getByLabel("Strona formularza").selectOption(form === "Z-15" ? "1" : form === "ZNp-7" ? "2" : "0");
      const payerId = form === "Z-15" ? "p2-9" : form === "ZNp-7" ? "p3-0" : certificate ? "p1-2" : "p1-12";
      await expect(dialog.locator(`[data-field="${payerId}"] .pdf-example`)).toHaveText(insurance.payer_data.nip);
      const payerNameId = form === "Z-15" ? "p2-13" : form === "ZNp-7" ? "p3-4" : certificate ? "p1-6" : "p1-16";
      await expect(dialog.locator(`[data-field="${payerNameId}"] .pdf-example`)).toHaveText(insurance.payer_data.name);
      if (form === "Z-15") await expect(dialog.locator('[data-field="p2-1"] .pdf-example')).toHaveCount(0);
      if (form === "ZNp-7") await expect(dialog.locator('[data-field="p3-12"] .pdf-example')).toHaveText(persona.name);
    }
    await page.keyboard.press("Escape");
  }
});
