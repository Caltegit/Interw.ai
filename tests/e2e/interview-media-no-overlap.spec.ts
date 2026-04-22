import { test, expect } from "../../playwright-fixture";
import { BASE_URL, SEED } from "./helpers/constants";

/**
 * Vérifie qu'aucune superposition audio/vidéo ne se produit pendant un
 * entretien candidat : à tout instant, au plus UN élément média
 * (<audio>/<video>) ou la TTS doit être en lecture simultanément.
 *
 * On instrumente la page avec un MutationObserver + écoute des événements
 * `play`/`pause`/`ended` sur tous les <audio>/<video> ainsi que sur
 * `speechSynthesis.speak`. À chaque tick, on calcule le nombre de pistes
 * « actives » et on archive le maximum observé.
 */
test("InterviewStart : pas de superposition audio/vidéo entre questions et relances", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__mediaOverlap = { max: 0, samples: [] as number[] };

    const countActiveMedia = () => {
      const els = Array.from(
        document.querySelectorAll<HTMLMediaElement>("audio, video"),
      );
      let n = els.filter((el) => !el.paused && !el.ended && el.currentTime > 0).length;
      // Compte la TTS Web Speech comme une piste active.
      if (window.speechSynthesis?.speaking) n += 1;
      return n;
    };

    const sample = () => {
      const n = countActiveMedia();
      const store = (window as any).__mediaOverlap;
      store.samples.push(n);
      if (n > store.max) store.max = n;
    };

    // Échantillonne toutes les 200 ms — assez fin pour attraper une
    // superposition même brève entre la fin d'une TTS et le démarrage du
    // média suivant.
    setInterval(sample, 200);

    // Échantillonne aussi sur chaque transition d'état média.
    const attach = (el: HTMLMediaElement) => {
      ["play", "playing", "pause", "ended"].forEach((evt) =>
        el.addEventListener(evt, sample),
      );
    };
    new MutationObserver((records) => {
      records.forEach((r) =>
        r.addedNodes.forEach((node) => {
          if (node instanceof HTMLMediaElement) attach(node);
          if (node instanceof HTMLElement) {
            node.querySelectorAll<HTMLMediaElement>("audio, video").forEach(attach);
          }
        }),
      );
    }).observe(document.documentElement, { childList: true, subtree: true });
  });

  await page.goto(
    `${BASE_URL}/interview/${SEED.projectSlug}/start/${SEED.pendingSessionToken}`,
  );

  await page.getByTestId("interview-start-button").click();

  // Attend que l'écran d'entretien soit prêt (selfview visible).
  await expect(page.getByTestId("interview-self-video"))
    .toBeVisible({ timeout: 20_000 });

  // Laisse l'IA dérouler quelques secondes : intro TTS → question 1 média →
  // (éventuelle relance) → transition. On observe en continu.
  await page.waitForTimeout(15_000);

  const result = await page.evaluate(() => (window as any).__mediaOverlap);
  const samplesPreview = result.samples.slice(-50);

  // On tolère 1 piste active (normal). Plus de 1 = superposition.
  expect(
    result.max,
    `Superposition média détectée : max=${result.max} pistes simultanées.\n` +
      `Derniers échantillons: ${samplesPreview.join(",")}`,
  ).toBeLessThanOrEqual(1);
});
