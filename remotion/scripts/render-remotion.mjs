import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Usage: node render-remotion.mjs [compositionId] [outputPath]
const compositionId = process.argv[2] || "main";
const out =
  process.argv[3] ||
  (compositionId === "demo"
    ? "/mnt/documents/interw-demo-20s.mp4"
    : "/mnt/documents/tutoriel-creation-session.mp4");

console.log(`→ Bundling… (composition: ${compositionId})`);
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
  id: compositionId,
  puppeteerInstance: browser,
});

console.log(`→ Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps → ${out}`);
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: out,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
  onProgress: ({ progress }) => {
    if (Math.round(progress * 100) % 10 === 0) {
      process.stdout.write(`  ${Math.round(progress * 100)}% `);
    }
  },
});

await browser.close({ silent: false });
console.log(`\n✔ Rendered → ${out}`);
