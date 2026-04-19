import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED } from "./helpers/constants";

test("Candidat peut accéder à la page d'entretien", async ({ page }) => {
  await page.goto(`${BASE_URL}/interview/${SEED.projectSlug}`);

  // Landing : nom + email
  await page.getByLabel(/nom/i).first().fill(`Candidat E2E ${Date.now()}`);
  await page.getByLabel(/email/i).first().fill(`candidat-e2e-${Date.now()}@example.com`);
  await page.getByRole("button", { name: /continuer|commencer|suivant/i }).first().click();

  // We expect to reach either the device test page or the start page.
  // The device test (mic/cam) cannot be passed in headless CI, so we just verify
  // we reached one of the candidate journey pages.
  await page.waitForURL(/\/interview\/.+\/(test|start|complete)/, { timeout: 20_000 });
  expect(page.url()).toMatch(/\/interview\/.+\/(test|start|complete)/);
});
