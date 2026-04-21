import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED, SUPABASE_URL, SUPABASE_ANON_KEY } from "./helpers/constants";

/**
 * Vérifie qu'une session démarrée puis rechargée propose bien la reprise,
 * et que « Recommencer depuis le début » nettoie l'historique pour repartir
 * de l'écran d'accueil.
 */
test("InterviewStart : la session survit à un refresh", async ({ page }) => {
  await page.goto(
    `${BASE_URL}/interview/${SEED.projectSlug}/start/${SEED.pendingSessionToken}`,
  );

  // Lance l'entretien (fait passer la session de "pending" à "in_progress").
  await page.getByTestId("interview-start-button").click();

  // On attend que la 1re question soit affichée (preuve que la session est bien démarrée).
  await expect(page.getByTestId("interview-current-question-index"))
    .toBeVisible({ timeout: 20_000 });

  // Vérifie côté BDD (REST anon, RLS l'autorise) que le statut a basculé.
  await expect
    .poll(
      async () => {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/sessions?id=eq.${SEED.pendingSessionId}&select=status`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
        const rows = await res.json().catch(() => []);
        return Array.isArray(rows) && rows[0]?.status;
      },
      { timeout: 15_000, message: "La session n'est jamais passée en in_progress" },
    )
    .toBe("in_progress");

  // Refresh → l'écran de reprise doit s'afficher (au moins 1 message IA persisté).
  await page.reload();

  const resume = page.getByTestId("interview-resume-dialog");
  await expect(resume).toBeVisible({ timeout: 20_000 });

  // Choisit « Recommencer depuis le début » → on revient à l'écran d'accueil.
  await page.getByTestId("interview-resume-restart").click();
  await expect(page.getByTestId("interview-start-screen"))
    .toBeVisible({ timeout: 20_000 });
});
