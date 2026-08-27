import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Usage: node render-remotion.mjs [compositionId] [outputPath] [--lang=fr|en]
const args = process.argv.slice(2);
const compositionId = args[0] || "main";
const langArg = args.find((a) => a.startsWith("--lang="));
const lang = langArg ? langArg.replace("--lang=", "") : undefined;
const outArg = args.find((a) => !a.startsWith("--") && a === args[1]);
const out =
  outArg ||
  (compositionId === "demo"
    ? lang === "en"
      ? "/mnt/documents/interw-demo-en.mp4"
      : "/mnt/documents/interw-demo-20s.mp4"
    : "/mnt/documents/tutoriel-creation-session.mp4");

const inputProps = lang ? { lang } : undefined;

console.log(`→ Bundling… (composition: ${compositionId}${lang ? `, lang: ${lang}` : ""})`);
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
  ...(inputProps ? { inputProps } : {}),
});

console.log(`→ Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps → ${out}`);
const isAlpha = compositionId.endsWith("-alpha");
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: isAlpha ? "vp8" : "h264",
  pixelFormat: isAlpha ? "yuva420p" : undefined,
  imageFormat: isAlpha ? "png" : undefined,
  outputLocation: out,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
  onProgress: ({ progress }) => {
    if (Math.round(progress * 100) % 10 === 0) {
      stdount`  ${Math.round(progress * 100)}% `;
    }
  },
});

await browser.close({ silent: false });
console.log(`\n✔ Rendered → ${out}`);
