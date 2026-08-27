import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Inter";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { SceneProblem } from "./scenes/demo/SceneProblem";
import { SceneDefinition } from "./scenes/demo/SceneDefinition";
import { SceneInterview } from "./scenes/demo/SceneInterview";
import { SceneEvaluation } from "./scenes/demo/SceneEvaluation";
import { SceneProfiles } from "./scenes/demo/SceneProfiles";
import type { Lang } from "./i18n/demo-copy";

loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const t = (durationInFrames: number) =>
  springTiming({ config: { damping: 200 }, durationInFrames });

export const DEMO_SCENE_DURATIONS = {
  problem: 165,
  definition: 281,
  interview: 180,
  evaluation: 200,
  profiles: 238,
};
export const DEMO_TRANSITION_FRAMES = 15;
export const DEMO_TOTAL =
  Object.values(DEMO_SCENE_DURATIONS).reduce((a, b) => a + b, 0) -
  4 * DEMO_TRANSITION_FRAMES;

export const DemoVideo: React.FC<{ transparent?: boolean; lang?: Lang }> = ({
  transparent = false,
  lang = "fr",
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: transparent ? "transparent" : "#FFFFFF",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {transparent ? null : <BackgroundLayer />}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.problem}>
          <SceneProblem lang={lang} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(DEMO_TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.definition}>
          <SceneDefinition lang={lang} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(DEMO_TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.interview}>
          <SceneInterview lang={lang} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(DEMO_TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.evaluation}>
          <SceneEvaluation lang={lang} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(DEMO_TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={DEMO_SCENE_DURATIONS.profiles}>
          <SceneProfiles lang={lang} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
