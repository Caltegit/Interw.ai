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
