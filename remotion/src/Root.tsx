import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { DemoVideo, DEMO_TOTAL } from "./DemoVideo";
import { FPS, TOTAL_DURATION } from "./constants";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={TOTAL_DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="demo"
      component={DemoVideo}
      durationInFrames={DEMO_TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
