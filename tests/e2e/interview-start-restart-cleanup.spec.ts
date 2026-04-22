import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED, SUPABASE_URL, SUPABASE_ANON_KEY } from "./helpers/constants";

/**
 * Vérifie que « Recommencer depuis le début » purge bien la session côté BDD :
 * - les session_messages liés sont supprimés,
 * - sessions.last_question_index repasse à 0,
 * - sessions.status repasse à 'pending'.
 */
const restHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

async function fetchSession() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sessions?id=eq.${SEED.resumeSessionId}&select=status,last_question_index`,
    { headers: restHeaders },
  );
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] : undefined;
}

async function fetchMessageCount() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/session_messages?session_id=eq.${SEED.resumeSessionId}&select=id`,
    { headers: restHeaders },
  );
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows.length : -1;
}

test("InterviewStart : « Recommencer » purge messages + reset session en BDD", async ({ page }) => {
  // 1. État initial attendu (posé par le seed à chaque run).
  const initialSession = await fetchSession();
  expect(initialSession?.status).toBe("in_progress");
  expect(initialSession?.last_question_index).toBe(1);
  expect(await fetchMessageCount()).toBe(2);

  // 2. Ouvre l'écran candidat sur le token resume.
  await page.goto(
    `${BASE_URL}/interview/${SEED.projectSlug}/start/${SEED.resumeSessionToken}`,
  );

  // 3. Le dialogue de reprise doit apparaître automatiquement.
  await expect(page.getByTestId("interview-resume-dialog"))
    .toBeVisible({ timeout: 20_000 });

  // 4. Clique sur « Recommencer depuis le début ».
  await page.getByTestId("interview-resume-restart").click();

  // 5. On revient sur l'écran d'accueil de l'entretien.
  await expect(page.getByTestId("interview-start-screen"))
    .toBeVisible({ timeout: 20_000 });

  // 6. La purge BDD doit être effective (poll : l'op est async côté client).
  await expect
    .poll(fetchMessageCount, {
      timeout: 15_000,
      message: "Les session_messages n'ont pas été purgés",
    })
    .toBe(0);

  await expect
    .poll(async () => (await fetchSession())?.last_question_index, {
      timeout: 15_000,
      message: "last_question_index n'a pas été remis à 0",
    })
    .toBe(0);

  await expect
    .poll(async () => (await fetchSession())?.status, {
      timeout: 15_000,
      message: "status n'a pas été remis à 'pending'",
    })
    .toBe("pending");
});
