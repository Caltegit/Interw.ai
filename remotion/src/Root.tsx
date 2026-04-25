import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// Durées par scène (frames @ 30fps), tenant compte des transitions de 15f qui se chevauchent.
// Hook 4s + Step1 9s + Step2 6s + Step3 9s + Step4 8s + Outro 4s = 40s
// Moins 5 transitions × 0.5s = 37.5s = 1125 frames
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
const totalDuration =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) - 5 * TRANSITION_FRAMES;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={totalDuration}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
