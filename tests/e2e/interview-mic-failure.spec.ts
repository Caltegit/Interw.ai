import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED } from "./helpers/constants";

/**
 * Vérifie que la bannière MicFailureBanner s'affiche quand la piste audio
 * du MediaStream est coupée en cours d'entretien (simulation de panne micro).
 */
test("InterviewStart : bannière micro déconnecté affichée si la piste audio s'arrête", async ({ page }) => {
  await page.goto(
    `${BASE_URL}/interview/${SEED.projectSlug}/start/${SEED.pendingSessionToken}`,
  );

  await page.getByTestId("interview-start-button").click();

  // On attend que le selfview soit prêt (= getUserMedia a réussi).
  const selfVideo = page.getByTestId("interview-self-video");
  await expect(selfVideo).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      async () =>
        selfVideo.evaluate((el) => !!(el as HTMLVideoElement).srcObject),
      { timeout: 15_000 },
    )
    .toBe(true);

  // On laisse l'entretien démarrer (TTS introduction puis passage en listening).
  await expect(page.getByTestId("interview-recording-indicator"))
    .toBeVisible({ timeout: 15_000 });

  // Attente que la trappe de test soit montée et qu'une piste audio existe.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const ref = (window as unknown as {
            __interviewStreamRef?: { current: MediaStream | null };
          }).__interviewStreamRef;
          return ref?.current?.getAudioTracks?.()?.length ?? 0;
        }),
      { timeout: 20_000, message: "streamRef jamais exposé sur window" },
    )
    .toBeGreaterThan(0);

  // Simule la perte de la piste audio (équivalent OS qui débranche le micro).
  await page.evaluate(() => {
    const ref = (window as unknown as {
      __interviewStreamRef?: { current: MediaStream | null };
    }).__interviewStreamRef;
    ref?.current?.getAudioTracks().forEach((t) => t.stop());
  });

  // La bannière "Micro déconnecté" doit apparaître.
  await expect(page.getByRole("alert").filter({ hasText: "Micro déconnecté" }))
    .toBeVisible({ timeout: 10_000 });

  // Bouton de réactivation présent.
  await expect(page.getByRole("button", { name: /Réactiver le micro/i }))
    .toBeVisible();
});
