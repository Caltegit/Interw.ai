import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED } from "./helpers/constants";

/**
 * Vérifie que l'écran d'entretien active bien la caméra et le MediaRecorder
 * via les flux factices fournis par Chromium (`--use-fake-device-for-media-stream`).
 */
test("InterviewStart : caméra + enregistrement actifs après lancement", async ({ page }) => {
  const mediaErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (t.includes("getUserMedia") || t.includes("MediaRecorder")) {
      mediaErrors.push(t);
    }
  });

  await page.goto(
    `${BASE_URL}/interview/${SEED.projectSlug}/start/${SEED.pendingSessionToken}`,
  );

  await page.getByTestId("interview-start-button").click();

  // Le selfview vidéo doit apparaître et recevoir un srcObject (flux caméra factice).
  const selfVideo = page.getByTestId("interview-self-video");
  await expect(selfVideo).toBeVisible({ timeout: 20_000 });

  await expect
    .poll(
      async () =>
        selfVideo.evaluate(
          (el) => !!(el as HTMLVideoElement).srcObject,
        ),
      { timeout: 15_000, message: "srcObject jamais défini sur le selfview" },
    )
    .toBe(true);

  // Indicateur d'enregistrement « REC » présent.
  await expect(page.getByTestId("interview-recording-indicator"))
    .toBeVisible({ timeout: 10_000 });

  // Compteur de question initialisé à 1.
  await expect(page.getByTestId("interview-current-question-index"))
    .toContainText("Question 1");

  // Petit délai pour laisser le MediaRecorder émettre un éventuel chunk.
  await page.waitForTimeout(2_500);

  expect(mediaErrors, `Erreurs media inattendues:\n${mediaErrors.join("\n")}`)
    .toHaveLength(0);
});
