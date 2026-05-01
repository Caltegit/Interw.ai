/**
 * Conversion WebM → MP4 (H.264 + AAC) via ffmpeg.wasm, dans le navigateur.
 *
 * - Singleton : ffmpeg.wasm n'est chargé qu'une fois (~30 Mo cachés ensuite).
 * - Lazy import dynamique pour ne pas alourdir le bundle initial.
 * - Si le blob d'entrée est déjà un MP4 (iOS), on le retourne tel quel.
 * - En cas d'échec, le caller décide du fallback (typiquement : garder le WebM).
 */

type FFmpegInstance = {
  loaded: boolean;
  load: (opts?: { coreURL?: string; wasmURL?: string }) => Promise<void>;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  readFile: (path: string) => Promise<Uint8Array>;
  deleteFile: (path: string) => Promise<void>;
  exec: (args: string[]) => Promise<number>;
  on: (event: string, cb: (e: any) => void) => void;
};

let ffmpegPromise: Promise<FFmpegInstance> | null = null;

const CORE_VERSION = "0.12.6";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

async function getFFmpeg(
  onProgress?: (ratio: number) => void,
): Promise<FFmpegInstance> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg() as unknown as FFmpegInstance;

      // Charge le core UMD + wasm depuis le CDN, transformés en blob URLs
      // (nécessaire pour contourner les restrictions cross-origin sur les workers).
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      ]);

      await ffmpeg.load({ coreURL, wasmURL });
      return ffmpeg;
    })();
  }

  const ffmpeg = await ffmpegPromise;

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }: { progress: number }) => {
      if (typeof progress === "number" && isFinite(progress)) {
        onProgress(Math.max(0, Math.min(1, progress)));
      }
    });
  }

  return ffmpeg;
}

/**
 * Indique si le navigateur peut probablement faire tourner ffmpeg.wasm
 * (présence de SharedArrayBuffer, requise par les builds threadés ; en
 * mode mono-thread on n'en a pas besoin, donc on retourne true par défaut).
 */
export function canConvertVideo(): boolean {
  if (typeof window === "undefined") return false;
  // Le build mono-thread n'exige pas COOP/COEP.
  return typeof WebAssembly !== "undefined";
}

/**
 * Précharge ffmpeg.wasm sans rien convertir — utile pour démarrer le download
 * du core en parallèle du fetch des segments.
 */
export function preloadFFmpeg(): Promise<unknown> {
  return getFFmpeg().catch(() => null);
}

/**
 * Convertit un blob vidéo en MP4 H.264/AAC.
 * Si le blob est déjà un MP4, retourne le blob tel quel (sans appeler ffmpeg).
 *
 * @throws en cas d'échec ffmpeg — le caller doit gérer le fallback.
 */
export async function convertToMp4(
  blob: Blob,
  opts?: { onProgress?: (ratio: number) => void },
): Promise<Blob> {
  const type = (blob.type || "").toLowerCase();
  if (type.includes("mp4")) {
    return blob;
  }

  const ffmpeg = await getFFmpeg(opts?.onProgress);

  // Nom unique pour éviter toute collision si plusieurs conversions séquentielles.
  const id = Math.random().toString(36).slice(2, 10);
  const inputName = `in-${id}.webm`;
  const outputName = `out-${id}.mp4`;

  const buf = new Uint8Array(await blob.arrayBuffer());
  await ffmpeg.writeFile(inputName, buf);

  // -preset ultrafast : ~1× temps réel sur laptop standard.
  // -crf 23 : qualité visuelle proche de l'original.
  // -movflags +faststart : permet la lecture progressive sans buffering complet.
  const code = await ffmpeg.exec([
    "-i",
    inputName,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  if (code !== 0) {
    try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }
    throw new Error(`ffmpeg exit code ${code}`);
  }

  const data = await ffmpeg.readFile(outputName);
  // Nettoyage du système de fichiers virtuel pour éviter d'accumuler la RAM.
  try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
  try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

  return new Blob([data as BlobPart], { type: "video/mp4" });
}
