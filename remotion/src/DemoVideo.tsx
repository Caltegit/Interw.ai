import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { SceneProblem } from "./scenes/demo/SceneProblem";
import { SceneSolution } from "./scenes/demo/SceneSolution";
import { SceneAIInterview } from "./scenes/demo/SceneAIInterview";
import { SceneEvaluation } from "./scenes/demo/SceneEvaluation";
import { SceneResult } from "./scenes/demo/SceneResult";
import { SceneImpact } from "./scenes/demo/SceneImpact";

loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const t = (durationInFrames: number) =>
  springTiming({ config: { damping: 200 }, durationInFrames });

// 600 frames @ 30 fps = 20 s pile.
// Durées par scène — ajustées pour qu'à la fin (incluant le coût des transitions) ça tienne en 600 frames.
export const DEMO_SCENE_DURATIONS = {
  problem: 100,
  solution: 100,
  interview: 130,
  evaluation: 130,
  result: 100,
  impact: 115,
};
export const DEMO_TRANSITION_FRAMES = 15;
export const DEMO_TOTAL =
  Object.values(DEMO_SCENE_DURATIONS).reduce((a, b) => a + b, 0) -
  5 * DEMO_TRANSITION_FRAMES; // = 600

export const DemoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0F0F10", fontFamily: "Inter, sans-serif" }}>
      <BackgroundLayer />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.problem}>
          <SceneProblem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(DEMO_TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.solution}>
          <SceneSolution />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={t(DEMO_TRANSITION_FRAMES)}
        />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.interview}>
          <SceneAIInterview />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={t(DEMO_TRANSITION_FRAMES)}
        />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.evaluation}>
          <SceneEvaluation />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={t(DEMO_TRANSITION_FRAMES)}
        />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.result}>
          <SceneResult />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(DEMO_TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.impact}>
          <SceneImpact />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
