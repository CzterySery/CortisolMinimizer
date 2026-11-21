import { expect, test } from "@playwright/test";

test("adoption, foster care and hospitalization reach the shared calculator", async ({ page }) => {
  await page.goto("/calculator");
  await page.getByLabel("Sytuacja rodziny").selectOption("adoption");
  await page.getByLabel("Data urodzenia przyjętego dziecka", { exact: true }).fill("2020-06-01");
  await page.getByLabel("Data przyjęcia na wychowanie", { exact: true }).fill("2027-03-01");
  const adoptionResponse = page.waitForResponse(async (response) => {
    if (!response.url().endsWith("/api/v1/calc/plan") || response.request().method() !== "POST") return false;
    return response.request().postDataJSON().family.adoption?.court_applied_on === "2027-03-01";
  });
  await page.getByLabel("Data wystąpienia do sądu o przysposobienie", { exact: true }).fill("2027-03-01");
  const adoption = await (await adoptionResponse).json();
  expect(adoption.issues.filter((issue: { severity: string }) => issue.severity === "error")).toEqual([]);
  expect(adoption.pools.maternity_days_left).toBe(0);
  expect(adoption.documents.some((doc: { form: string }) => doc.form.includes("na warunkach"))).toBeTruthy();

  await page.getByLabel("Sytuacja rodziny").selectOption("foster");
  await page.getByLabel("Data urodzenia przyjętego dziecka", { exact: true }).fill("2018-06-01");
  const fosterResponse = page.waitForResponse(async (response) => {
    if (!response.url().endsWith("/api/v1/calc/plan") || response.request().method() !== "POST") return false;
    return response.request().postDataJSON().family.adoption?.school_deferred === true;
  });
  await page.getByLabel("Decyzja o odroczeniu obowiązku szkolnego").check();
  const foster = await (await fosterResponse).json();
  expect(foster.issues.filter((issue: { severity: string }) => issue.severity === "error")).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  await page.getByLabel("Sytuacja rodziny").selectOption("birth");
  await page.getByLabel("Faktyczna data urodzenia").fill("2027-03-01");
  await page.getByText("Hospitalizacja dziecka — uzupełniający urlop macierzyński", { exact: true }).click();
  await page.getByLabel("Mam dane z zaświadczenia szpitalnego").check();
  await page.getByLabel("Ukończony tydzień ciąży przy porodzie").fill("30");
  await page.getByLabel("Masa urodzeniowa (g)", { exact: true }).fill("1500");
  const hospitalResponse = page.waitForResponse(async (response) => {
    if (!response.url().endsWith("/api/v1/calc/plan") || response.request().method() !== "POST") return false;
    return response.request().postDataJSON().family.hospitalization?.hospital_days === 15;
  });
  await page.getByLabel("Kwalifikujące dni pobytu w szpitalu").fill("15");
  const hospital = await hospitalResponse;
  expect(hospital.status()).toBe(200);
  expect(hospital.request().postDataJSON().family.birth_date).toBe("2027-03-01");
  expect(hospital.request().postDataJSON().family.hospitalization.pregnancy_week).toBe(30);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
