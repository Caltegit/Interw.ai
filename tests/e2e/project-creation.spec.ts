import { test, expect } from "../fixtures";
import { loginAsRH } from "./helpers/auth";
import { BASE_URL } from "./helpers/constants";

test("RH peut créer un projet via le wizard", async ({ page }) => {
  await loginAsRH(page);

  await page.goto(`${BASE_URL}/projects/new`);

  const stamp = Date.now();
  const jobTitle = `E2E Wizard ${stamp}`;

  // Step 1: poste + description
  await page.getByLabel(/intitulé|titre du poste/i).first().fill(jobTitle);
  await page.getByLabel(/description/i).first().fill("Description E2E auto-générée.");
  await page.getByRole("button", { name: /suivant|continuer/i }).first().click();

  // Step 2: questions — open library, pick first 2
  await page.getByRole("button", { name: /bibliothèque/i }).first().click();
  const libCheckboxes = page.locator('[role="dialog"] input[type="checkbox"], [role="dialog"] [role="checkbox"]');
  await libCheckboxes.nth(0).click();
  await libCheckboxes.nth(1).click();
  await page.getByRole("button", { name: /ajouter/i }).last().click();
  await page.getByRole("button", { name: /suivant|continuer/i }).first().click();

  // Step 3: criteria — open library, pick first 2
  await page.getByRole("button", { name: /bibliothèque/i }).first().click();
  const critCheckboxes = page.locator('[role="dialog"] input[type="checkbox"], [role="dialog"] [role="checkbox"]');
  await critCheckboxes.nth(0).click();
  await critCheckboxes.nth(1).click();
  await page.getByRole("button", { name: /ajouter/i }).last().click();
  await page.getByRole("button", { name: /suivant|continuer/i }).first().click();

  // Step 4: validate creation
  await page.getByRole("button", { name: /créer|valider|terminer/i }).last().click();

  // Assert: redirected to project detail
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/, { timeout: 15_000 });
  await expect(page.getByText(jobTitle)).toBeVisible();
});
