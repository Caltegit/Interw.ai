import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { FPS, TOTAL_DURATION } from "./constants";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={TOTAL_DURATION}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
