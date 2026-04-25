import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("→ Bundling…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

console.log("→ Opening browser…");
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

console.log("→ Selecting composition…");
const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

console.log(`→ Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps`);
const out = process.argv[2] || "/mnt/documents/tutoriel-creation-session.mp4";
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: out,
  puppeteerInstance: browser,
  muted: false,
  enforceAudioTrack: true,
  audioCodec: "aac",
  concurrency: 1,
  onProgress: ({ progress }) => {
    if (Math.round(progress * 100) % 10 === 0) {
      process.stdout.write(`  ${Math.round(progress * 100)}% `);
    }
  },
});

await browser.close({ silent: false });
console.log(`\n✔ Rendered → ${out}`);
