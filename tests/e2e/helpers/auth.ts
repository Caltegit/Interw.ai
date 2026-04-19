import { Page, expect } from "@playwright/test";
import { SEED, BASE_URL } from "./constants";

export async function loginAsRH(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Email").fill(SEED.email);
  await page.getByLabel("Mot de passe").fill(SEED.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}
