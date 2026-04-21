import { createLovableConfig } from "lovable-agent-playwright-config/config";

// Active une caméra et un micro factices pour pouvoir tester les écrans
// candidat (`getUserMedia`, `MediaRecorder`) sans hardware réel.
const fakeMediaArgs = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  "--autoplay-policy=no-user-gesture-required",
];

export default createLovableConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: fakeMediaArgs,
    },
  },
});
