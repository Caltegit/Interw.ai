import { test, expect } from "../../playwright-fixture";
import { loginAsRH } from "./helpers/auth";
import { BASE_URL, SEED } from "./helpers/constants";

test("RH peut éditer le titre d'un projet et la modification persiste", async ({ page }) => {
  await loginAsRH(page);

  await page.goto(`${BASE_URL}/projects/${SEED.projectId}/edit`);

  // Wait for the form to be ready (title field populated)
  const titleInput = page.getByLabel(/titre/i).first();
  await expect(titleInput).toBeVisible({ timeout: 15_000 });
  await expect(titleInput).not.toHaveValue("", { timeout: 10_000 });

  const stamp = Date.now();
  const newTitle = `E2E Edit ${stamp}`;

  await titleInput.fill(newTitle);

  // Jump straight to last step using the stepper (edit allows navigation to any step)
  await page.locator("button", { hasText: "5" }).first().click();

  await page.getByRole("button", { name: /enregistrer/i }).last().click();

  // Redirect to project detail
  await page.waitForURL(new RegExp(`/projects/${SEED.projectId}(?!/edit)`), { timeout: 15_000 });

  // Reload and verify persistence by re-opening the editor
  await page.goto(`${BASE_URL}/projects/${SEED.projectId}/edit`);
  const reloadedTitle = page.getByLabel(/titre/i).first();
  await expect(reloadedTitle).toHaveValue(newTitle, { timeout: 15_000 });
});
