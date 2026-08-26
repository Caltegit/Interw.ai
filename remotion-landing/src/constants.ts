export const FPS = 30;
export const SCENE_DURATIONS = {
  hook: 4 * FPS,
  step1: 9 * FPS,
  step2: 6 * FPS,
  step3: 9 * FPS,
  step4: 8 * FPS,
  outro: 4 * FPS,
};
export const TRANSITION_FRAMES = 15;
export const TOTAL_DURATION =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) - 5 * TRANSITION_FRAMES;

// Délai d'entrée appliqué au début de chaque scène de la vidéo démo.
// Il correspond à la durée de la transition : tant que la scène précédente
// est encore visible (crossfade/slide), la scène entrante reste sur son état
// initial et ne commence à s'animer qu'une fois la transition terminée.
export const DEMO_ENTER_DELAY = TRANSITION_FRAMES;
