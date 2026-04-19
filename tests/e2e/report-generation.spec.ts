import { test, expect } from "../../playwright-fixture";
import { loginAsRH } from "./helpers/auth";
import { BASE_URL, SEED } from "./helpers/constants";

test("RH peut générer le rapport d'une session complétée", async ({ page }) => {
  test.setTimeout(120_000); // AI generation may be slow

  await loginAsRH(page);
  await page.goto(`${BASE_URL}/sessions/${SEED.sessionId}`);

  // Click the "Générer le rapport" button
  const generateBtn = page.getByRole("button", { name: /générer le rapport|générer/i }).first();
  await expect(generateBtn).toBeVisible({ timeout: 10_000 });
  await generateBtn.click();

  // Wait for a score badge / recommendation to appear (poll up to 90s)
  await expect(
    page.getByText(/score global|recommandation|strong_yes|^yes$|maybe|^no$/i).first(),
  ).toBeVisible({ timeout: 90_000 });

  // At least one criterion should be visible in the report
  await expect(page.getByText(/clarté|motivation/i).first()).toBeVisible();
});
