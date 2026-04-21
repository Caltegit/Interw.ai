import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED } from "./helpers/constants";

/**
 * Vérifie le mécanisme de reprise d'une session en cours :
 * - dialogue « Reprendre votre entretien ? » présenté automatiquement,
 * - clic sur Reprendre → bascule sur la 2e question (index 1 persisté en BDD),
 * - rechargement de la page → le dialogue réapparaît bien.
 */
test("InterviewStart : reprise d'une session interrompue", async ({ page }) => {
  await page.goto(
    `${BASE_URL}/interview/${SEED.projectSlug}/start/${SEED.resumeSessionToken}`,
  );

  // Le dialogue de reprise doit apparaître automatiquement.
  const dialog = page.getByTestId("interview-resume-dialog");
  await expect(dialog).toBeVisible({ timeout: 20_000 });

  const confirm = page.getByTestId("interview-resume-confirm");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // Après reprise, on doit voir le compteur affichant la 2e question (index 1 → "Question 2 / 2").
  const counter = page.getByTestId("interview-current-question-index");
  await expect(counter).toBeVisible({ timeout: 20_000 });
  await expect(counter).toContainText("Question 2");

  // Sous-test : rechargement → la persistance doit reproposer le dialogue.
  await page.reload();
  await expect(page.getByTestId("interview-resume-dialog"))
    .toBeVisible({ timeout: 20_000 });
});
