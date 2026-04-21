import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED } from "./helpers/constants";

/**
 * Vérifie que l'écran d'accueil de l'entretien charge correctement
 * pour une session « pending » fraîche (avant tout clic candidat).
 */
test("InterviewStart : écran d'accueil charge sans erreur", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // On ignore les erreurs réseau / TTS connues qui ne bloquent pas l'UI.
    if (
      text.includes("ElevenLabs") ||
      text.includes("speechSynthesis") ||
      text.includes("favicon") ||
      text.includes("Failed to load resource")
    ) return;
    consoleErrors.push(text);
  });

  await page.goto(
    `${BASE_URL}/interview/${SEED.projectSlug}/start/${SEED.pendingSessionToken}`,
  );

  // Écran « Prêt à démarrer ? » avec son bouton de lancement.
  const screen = page.getByTestId("interview-start-screen");
  await expect(screen).toBeVisible({ timeout: 20_000 });

  const startButton = page.getByTestId("interview-start-button");
  await expect(startButton).toBeVisible();
  await expect(startButton).toBeEnabled();

  // Aucune erreur console critique liée au composant lui-même.
  expect(consoleErrors, `Erreurs console inattendues:\n${consoleErrors.join("\n")}`)
    .toHaveLength(0);
});
