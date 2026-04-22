import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED, SUPABASE_URL } from "./helpers/constants";

/**
 * Vérifie que « Recommencer depuis le début » supprime aussi le fichier media
 * uploadé sous interviews/{sessionId}/ dans le bucket storage.
 *
 * Le seed (re)dépose à chaque run un fichier factice
 * `interviews/{resumeSessionId}/q0.webm` → on s'assure qu'il est présent au
 * démarrage, puis absent (404) après le restart.
 */
const MEDIA_PATH = `interviews/${SEED.resumeSessionId}/q0.webm`;
const MEDIA_URL = `${SUPABASE_URL}/storage/v1/object/public/media/${MEDIA_PATH}`;

async function fetchMediaStatus(): Promise<number> {
  // Cache-bust pour éviter qu'un CDN garde une 200 obsolète.
  const res = await fetch(`${MEDIA_URL}?t=${Date.now()}`, { method: "GET" });
  return res.status;
}

test("InterviewStart : « Recommencer » purge aussi les fichiers media uploadés", async ({ page }) => {
  // 1. État initial : le fichier déposé par le seed doit être accessible (200).
  expect(await fetchMediaStatus()).toBe(200);

  // 2. Ouvre l'écran candidat sur le token resume.
  await page.goto(
    `${BASE_URL}/interview/${SEED.projectSlug}/start/${SEED.resumeSessionToken}`,
  );

  // 3. Attend le dialogue de reprise puis clique sur « Recommencer depuis le début ».
  await expect(page.getByTestId("interview-resume-dialog"))
    .toBeVisible({ timeout: 20_000 });
  await page.getByTestId("interview-resume-restart").click();

  // 4. Retour à l'écran d'accueil → preuve que le restart est terminé côté UI.
  await expect(page.getByTestId("interview-start-screen"))
    .toBeVisible({ timeout: 20_000 });

  // 5. Le fichier media doit avoir disparu du bucket (404 ou 400).
  await expect
    .poll(fetchMediaStatus, {
      timeout: 15_000,
      message: "Le fichier media n'a pas été purgé du bucket storage",
    })
    .not.toBe(200);
});
