import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import { SceneHook } from "./scenes/SceneHook";
import { SceneStep1 } from "./scenes/SceneStep1";
import { SceneStep2 } from "./scenes/SceneStep2";
import { SceneStep3 } from "./scenes/SceneStep3";
import { SceneStep4 } from "./scenes/SceneStep4";
import { SceneOutro } from "./scenes/SceneOutro";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { SCENE_DURATIONS, TRANSITION_FRAMES } from "./constants";

loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const t = (durationInFrames: number) =>
  springTiming({ config: { damping: 200 }, durationInFrames });

// Décalage cumulé pour positionner les <Audio> au bon endroit.
// Les transitions de 15f mangent 15f sur la durée précédente.
const audioOffsets = (() => {
  const d = SCENE_DURATIONS;
  const tr = TRANSITION_FRAMES;
  const o0 = 0;
  const o1 = o0 + d.hook - tr;
  const o2 = o1 + d.step1 - tr;
  const o3 = o2 + d.step2 - tr;
  const o4 = o3 + d.step3 - tr;
  const o5 = o4 + d.step4 - tr;
  return [o0, o1, o2, o3, o4, o5];
})();

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0F0F10", fontFamily: "Inter, sans-serif" }}>
      <BackgroundLayer />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.hook}>
          <SceneHook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.step1}>
          <SceneStep1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t(TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.step2}>
          <SceneStep2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t(TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.step3}>
          <SceneStep3 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t(TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.step4}>
          <SceneStep4 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t(TRANSITION_FRAMES)} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.outro}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Voix off — un fichier par scène, déclenché à l'offset de la scène */}
      <Sequence from={audioOffsets[0]}>
        <Audio src={staticFile("voiceover/1-hook.mp3")} />
      </Sequence>
      <Sequence from={audioOffsets[1]}>
        <Audio src={staticFile("voiceover/2-step1.mp3")} />
      </Sequence>
      <Sequence from={audioOffsets[2]}>
        <Audio src={staticFile("voiceover/3-step2.mp3")} />
      </Sequence>
      <Sequence from={audioOffsets[3]}>
        <Audio src={staticFile("voiceover/4-step3.mp3")} />
      </Sequence>
      <Sequence from={audioOffsets[4]}>
        <Audio src={staticFile("voiceover/5-step4.mp3")} />
      </Sequence>
      <Sequence from={audioOffsets[5]}>
        <Audio src={staticFile("voiceover/6-outro.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};
