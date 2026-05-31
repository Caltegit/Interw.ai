/// <reference lib="webworker" />
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

interface StartMessage {
  type: "start";
  url: string;
  filename: string;
}

type OutMessage =
  | { type: "progress"; value: number; label: string }
  | { type: "done"; blob: Blob; filename: string }
  | { type: "error"; message: string };

function post(msg: OutMessage, transfer?: Transferable[]) {
  (self as unknown as Worker).postMessage(msg, transfer ?? []);
}

function extFromContentType(ct: string | null, url: string): string {
  if (ct) {
    if (ct.includes("mp4")) return "mp4";
    if (ct.includes("webm")) return "webm";
    if (ct.includes("quicktime") || ct.includes("mov")) return "mov";
    if (ct.includes("ogg")) return "ogv";
  }
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".mp4")) return "mp4";
  if (lower.endsWith(".mov")) return "mov";
  if (lower.endsWith(".ogv")) return "ogv";
  return "webm";
}

function looksLikeMp4(data: Uint8Array): boolean {
  if (!data || data.length < 12) return false;
  return data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70;
}

async function loadFFmpeg(): Promise<FFmpeg> {
  const bases = [
    "/ffmpeg",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm",
    "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm",
  ];
  let lastErr: unknown = null;
  for (const baseURL of bases) {
    try {
      const ffmpeg = new FFmpeg();
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      return ffmpeg;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("FFmpeg load failed");
}

async function convertToMp4(ffmpeg: FFmpeg, inputName: string, outputName: string): Promise<Uint8Array> {
  const attempts: string[][] = [
    ["-i", inputName, "-c:v", "mpeg4", "-q:v", "5", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputName],
    ["-i", inputName, "-c:v", "mpeg4", "-q:v", "5", "-pix_fmt", "yuv420p",
     "-an", "-movflags", "+faststart", outputName],
  ];
  let lastError: unknown = null;
  for (const args of attempts) {
    try {
      await ffmpeg.exec(args);
      const out = await ffmpeg.readFile(outputName);
      const bytes = out instanceof Uint8Array ? out : new Uint8Array();
      if (bytes.length > 0 && looksLikeMp4(bytes)) return bytes;
      lastError = new Error(`Sortie MP4 invalide (${bytes.length} octets)`);
    } catch (err) {
      lastError = err;
    } finally {
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Conversion MP4 impossible");
}

async function run(msg: StartMessage) {
  try {
    post({ type: "progress", value: 5, label: "Téléchargement…" });
    const res = await fetch(msg.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ext = extFromContentType(res.headers.get("Content-Type"), msg.url);
    const data = new Uint8Array(await res.arrayBuffer());
    post({ type: "progress", value: 35, label: "Téléchargement terminé" });

    if (ext === "mp4") {
      post({ type: "progress", value: 100, label: "" });
      post({ type: "done", blob: new Blob([data], { type: "video/mp4" }), filename: msg.filename });
      return;
    }

    post({ type: "progress", value: 40, label: "Préparation du convertisseur…" });
    const ffmpeg = await loadFFmpeg();
    post({ type: "progress", value: 55, label: "Conversion en MP4…" });
    const inputName = `in.${ext}`;
    const outputName = "out.mp4";
    await ffmpeg.writeFile(inputName, data);
    const out = await convertToMp4(ffmpeg, inputName, outputName);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    post({ type: "progress", value: 100, label: "" });
    post({ type: "done", blob: new Blob([out], { type: "video/mp4" }), filename: msg.filename });
  } catch (err) {
    post({ type: "error", message: (err as Error)?.message || String(err) });
  }
}

self.addEventListener("message", (e: MessageEvent<StartMessage>) => {
  if (e.data?.type === "start") void run(e.data);
});
