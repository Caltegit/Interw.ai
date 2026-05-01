/**
 * Conversion WebM → MP4 (H.264 + AAC) via ffmpeg.wasm, dans le navigateur.
 *
 * - Variante ESM du cœur (recommandée avec Vite). Auto-hébergée dans
 *   /public/ffmpeg/ pour éviter toute dépendance CDN externe.
 * - Le cœur ESM est chargé via `import()` dynamique côté worker, ce qui
 *   exige de passer un `coreURL` en blob:// (sinon Vite tente de le résoudre
 *   à la compilation et le worker plante en production).
 * - Singleton : ffmpeg.wasm n'est chargé qu'une fois.
 * - Si le blob d'entrée est déjà un MP4 (iOS), on le retourne tel quel.
 */

type FFmpegInstance = {
  loaded: boolean;
  load: (opts?: {
    coreURL?: string;
    wasmURL?: string;
    workerURL?: string;
    classWorkerURL?: string;
  }) => Promise<void>;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  readFile: (path: string) => Promise<Uint8Array>;
  deleteFile: (path: string) => Promise<void>;
  exec: (args: string[]) => Promise<number>;
  on: (event: string, cb: (e: any) => void) => void;
};

let ffmpegPromise: Promise<FFmpegInstance> | null = null;
let lastLoadError: unknown = null;

const CORE_BASE = "/ffmpeg";

/** Convertit une URL distante (même origine) en blob URL avec un MIME explicite. */
async function toBlobURL(url: string, mimeType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Échec téléchargement ${url} (HTTP ${res.status})`);
  const buf = await res.arrayBuffer();
  return URL.createObjectURL(new Blob([buf], { type: mimeType }));
}

async function getFFmpeg(
  onProgress?: (ratio: number) => void,
): Promise<FFmpegInstance> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      try {
        const { FFmpeg } = await import("@ffmpeg/ffmpeg");
        const ffmpeg = new FFmpeg() as unknown as FFmpegInstance;

        ffmpeg.on("log", ({ message }: { message: string }) => {
          console.debug("[ffmpeg]", message);
        });

        // Le worker importe le cœur via import() dynamique : il faut donc
        // un coreURL transformable en module ES. On passe par toBlobURL
        // pour garantir le bon Content-Type et bypasser tout souci CORS.
        const [coreURL, wasmURL] = await Promise.all([
          toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
          toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
        ]);

        await ffmpeg.load({ coreURL, wasmURL });
        lastLoadError = null;
        return ffmpeg;
      } catch (err) {
        lastLoadError = err;
        ffmpegPromise = null;
        throw err;
      }
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

export function canConvertVideo(): boolean {
  if (typeof window === "undefined") return false;
  return typeof WebAssembly !== "undefined";
}

/** Précharge ffmpeg.wasm (téléchargement du cœur ~30 Mo, mis en cache ensuite). */
export function preloadFFmpeg(): Promise<unknown> {
  return getFFmpeg();
}

export function getLastFFmpegError(): unknown {
  return lastLoadError;
}

/**
 * Convertit un blob vidéo en MP4 H.264/AAC.
 * Si le blob est déjà un MP4, le retourne tel quel.
 * @throws en cas d'échec ffmpeg — le caller gère le fallback.
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

  const id = Math.random().toString(36).slice(2, 10);
  const inputName = `in-${id}.webm`;
  const outputName = `out-${id}.mp4`;

  const buf = new Uint8Array(await blob.arrayBuffer());
  await ffmpeg.writeFile(inputName, buf);

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
  try { await ffmpeg.deleteFile(inputName); } catch { /* ignore */ }
  try { await ffmpeg.deleteFile(outputName); } catch { /* ignore */ }

  return new Blob([data as BlobPart], { type: "video/mp4" });
}
