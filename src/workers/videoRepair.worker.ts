/// <reference lib="webworker" />
// Répare un WebM cassé (typiquement un fichier reconstruit depuis des chunks
// bruts sans header EBML propre) via FFmpeg.wasm.
// Stratégie :
//   1) Remux WebM → WebM (`-c copy -fflags +genpts`) : rapide, régénère un
//      header EBML/Segment/Tracks cohérent + une vraie durée.
//   2) Si le remux échoue (pas de piste vidéo décodable), ré-encode en MP4
//      H.264 + AAC : plus lent mais lisible partout.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

interface StartMessage {
  type: "start";
  url: string;
}

type OutMessage =
  | { type: "progress"; value: number; label: string }
  | { type: "done"; data: Uint8Array; extension: "webm" | "mp4"; contentType: string }
  | { type: "error"; message: string };

function post(msg: OutMessage, transfer?: Transferable[]) {
  (self as unknown as Worker).postMessage(msg, transfer ?? []);
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

function looksLikeWebm(data: Uint8Array): boolean {
  return data.length >= 4 && data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3;
}
function looksLikeMp4(data: Uint8Array): boolean {
  return data.length >= 12 && data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70;
}

async function tryRemuxWebm(ffmpeg: FFmpeg): Promise<Uint8Array | null> {
  try {
    await ffmpeg.exec([
      "-fflags", "+genpts",
      "-i", "in.webm",
      "-c", "copy",
      "-f", "webm",
      "out.webm",
    ]);
    const out = await ffmpeg.readFile("out.webm");
    const bytes = out instanceof Uint8Array ? out : new Uint8Array();
    if (bytes.length > 0 && looksLikeWebm(bytes)) return bytes;
  } catch { /* try next */ }
  finally {
    await ffmpeg.deleteFile("out.webm").catch(() => {});
  }
  return null;
}

async function tryTranscodeMp4(ffmpeg: FFmpeg): Promise<Uint8Array | null> {
  // Ré-encodage : plus lent mais rattrape les cas où la piste vidéo est
  // partiellement corrompue. `-err_detect ignore_err` évite l'abandon sur
  // paquet cassé.
  const attempts: string[][] = [
    ["-err_detect", "ignore_err", "-i", "in.webm", "-c:v", "mpeg4", "-q:v", "5",
     "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
     "-movflags", "+faststart", "out.mp4"],
    ["-err_detect", "ignore_err", "-i", "in.webm", "-c:v", "mpeg4", "-q:v", "5",
     "-pix_fmt", "yuv420p", "-an",
     "-movflags", "+faststart", "out.mp4"],
  ];
  for (const args of attempts) {
    try {
      await ffmpeg.exec(args);
      const out = await ffmpeg.readFile("out.mp4");
      const bytes = out instanceof Uint8Array ? out : new Uint8Array();
      if (bytes.length > 0 && looksLikeMp4(bytes)) return bytes;
    } catch { /* try next */ }
    finally {
      await ffmpeg.deleteFile("out.mp4").catch(() => {});
    }
  }
  return null;
}

async function run(msg: StartMessage) {
  try {
    post({ type: "progress", value: 5, label: "Téléchargement…" });
    const res = await fetch(msg.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = new Uint8Array(await res.arrayBuffer());
    if (data.length === 0) throw new Error("Fichier vide");
    post({ type: "progress", value: 30, label: "Chargement du convertisseur…" });

    const ffmpeg = await loadFFmpeg();
    await ffmpeg.writeFile("in.webm", data);

    post({ type: "progress", value: 50, label: "Réparation du conteneur…" });
    const remuxed = await tryRemuxWebm(ffmpeg);
    if (remuxed) {
      post({ type: "progress", value: 100, label: "" });
      post(
        { type: "done", data: remuxed, extension: "webm", contentType: "video/webm" },
        [remuxed.buffer],
      );
      return;
    }

    post({ type: "progress", value: 70, label: "Ré-encodage vidéo…" });
    const mp4 = await tryTranscodeMp4(ffmpeg);
    if (mp4) {
      post({ type: "progress", value: 100, label: "" });
      post(
        { type: "done", data: mp4, extension: "mp4", contentType: "video/mp4" },
        [mp4.buffer],
      );
      return;
    }

    throw new Error("Aucune piste vidéo n'a pu être récupérée.");
  } catch (err) {
    post({ type: "error", message: (err as Error)?.message || String(err) });
  }
}

self.addEventListener("message", (e: MessageEvent<StartMessage>) => {
  if (e.data?.type === "start") void run(e.data);
});
