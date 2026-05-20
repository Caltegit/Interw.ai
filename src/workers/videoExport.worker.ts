/// <reference lib="webworker" />
import JSZip from "jszip";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

interface SegmentInput {
  url: string;
  questionId: string | null;
  questionNumber: number | null;
  questionText: string;
  isFollowUp: boolean;
  timestamp: string;
}

interface StartMessage {
  type: "start";
  segments: SegmentInput[];
  candidateName: string | null;
  candidateEmail: string | null;
  projectTitle: string | null;
  projectJobTitle: string | null;
  createdAt: string | null;
  durationSeconds: number | null;
}

type OutMessage =
  | { type: "progress"; value: number; label: string }
  | { type: "status"; label: string; phase: "downloading" | "converting" | "zipping" }
  | {
      type: "done";
      blob: Blob;
      filename: string;
      fileCount: number;
      failedSegments: string[];
    }
  | {
      type: "error";
      message: string;
      code:
        | "NO_SEGMENTS"
        | "ALL_DOWNLOADS_FAILED"
        | "FFMPEG_LOAD_FAILED"
        | "ALL_CONVERSIONS_FAILED"
        | "NON_MP4_IN_ZIP"
        | "UNKNOWN";
      details?: string;
    };

function post(msg: OutMessage, transfer?: Transferable[]) {
  (self as unknown as Worker).postMessage(msg, transfer ?? []);
}

function sanitizeName(s: string | null | undefined, fallback: string) {
  if (!s) return fallback;
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || fallback
  );
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

async function convertToMp4(
  ffmpeg: FFmpeg,
  inputName: string,
  outputName: string,
  ffmpegLogs: string[],
) {
  const attempts: string[][] = [
    ["-i", inputName, "-c:v", "mpeg4", "-q:v", "5", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputName],
    ["-i", inputName, "-c:v", "mpeg4", "-q:v", "5", "-pix_fmt", "yuv420p",
     "-an", "-movflags", "+faststart", outputName],
  ];
  let lastError: unknown = null;
  for (const args of attempts) {
    try {
      ffmpegLogs.length = 0;
      await ffmpeg.exec(args);
      const out = await ffmpeg.readFile(outputName);
      const bytes = out instanceof Uint8Array ? out : new Uint8Array();
      if (bytes.length > 0 && looksLikeMp4(bytes)) return bytes;
      lastError = new Error(
        `Sortie MP4 invalide (${bytes.length} octets). ${ffmpegLogs.slice(-5).join(" | ")}`,
      );
    } catch (error) {
      lastError = error;
    } finally {
      await ffmpeg.deleteFile(outputName).catch(() => {});
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Conversion MP4 impossible");
}

async function run(msg: StartMessage) {
  try {
    const { segments } = msg;
    if (segments.length === 0) throw new Error("Aucun segment à traiter.");

    post({ type: "status", label: "Téléchargement des segments…", phase: "downloading" });

    const followUpCounter = new Map<string, number>();
    type Downloaded = { baseName: string; ext: string; data: Uint8Array; question: string };
    const downloaded: Downloaded[] = [];
    const missing: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const seq = String(i + 1).padStart(2, "0");
      const questionLabel = seg.questionNumber ? `question-${seg.questionNumber}` : "question";
      let suffix = "";
      if (seg.isFollowUp) {
        const key = seg.questionId || `idx-${i}`;
        const k = (followUpCounter.get(key) ?? 0) + 1;
        followUpCounter.set(key, k);
        suffix = `-relance-${k}`;
      }
      const baseName = `${seq}-${questionLabel}${suffix}`;

      post({
        type: "status",
        label: `Téléchargement du segment ${i + 1} sur ${segments.length}…`,
        phase: "downloading",
      });

      try {
        const res = await fetch(seg.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const total = Number(res.headers.get("Content-Length") || 0);
        const ext = extFromContentType(res.headers.get("Content-Type"), seg.url);
        const reader = res.body?.getReader();
        let data: Uint8Array;
        if (!reader) {
          data = new Uint8Array(await res.arrayBuffer());
        } else {
          const chunks: Uint8Array[] = [];
          let received = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              const segShare = 60 / segments.length;
              const segProgress = total > 0 ? received / total : 0;
              const overall = i * segShare + Math.min(segProgress, 1) * segShare;
              post({ type: "progress", value: overall, label: `Segment ${i + 1}/${segments.length}` });
            }
          }
          data = new Uint8Array(received);
          let offset = 0;
          for (const c of chunks) {
            data.set(c, offset);
            offset += c.length;
          }
        }
        downloaded.push({ baseName, ext, data, question: seg.questionText });
        post({ type: "progress", value: ((i + 1) / segments.length) * 60, label: "" });
      } catch (err) {
        console.warn("[worker] download failed", baseName, err);
        missing.push(baseName);
      }
    }

    if (downloaded.length === 0) throw new Error("Aucun segment n'a pu être téléchargé.");

    const zip = new JSZip();
    const fileEntries: { name: string; question: string }[] = [];
    const needsConvert = downloaded.some((d) => d.ext !== "mp4");
    let ffmpeg: FFmpeg | null = null;
    let ffmpegLoadError: string | null = null;
    const ffmpegLogs: string[] = [];

    if (needsConvert) {
      post({ type: "status", label: "Préparation du convertisseur vidéo…", phase: "converting" });
      const cdnBases = [
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm",
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm",
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd",
        "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
      ];
      const loadErrors: string[] = [];
      for (const baseURL of cdnBases) {
        try {
          const candidate = new FFmpeg();
          candidate.on("log", ({ message }) => {
            ffmpegLogs.push(message);
            if (ffmpegLogs.length > 200) ffmpegLogs.shift();
          });
          const [coreURL, wasmURL] = await Promise.all([
            toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
          ]);
          await candidate.load({ coreURL, wasmURL });
          ffmpeg = candidate;
          break;
        } catch (err) {
          loadErrors.push(String((err as Error)?.message || err));
        }
      }
      if (!ffmpeg) {
        ffmpegLoadError = loadErrors.length > 0 ? loadErrors.join(" ; ") : "moteur indisponible";
      }
    }

    let convertedCount = 0;
    let conversionFailures = 0;

    for (let i = 0; i < downloaded.length; i++) {
      const d = downloaded[i];
      const finalName = `${d.baseName}.mp4`;
      if (d.ext === "mp4") {
        zip.file(finalName, d.data);
        fileEntries.push({ name: finalName, question: d.question });
        convertedCount++;
      } else if (!ffmpeg) {
        const name = `${d.baseName}.${d.ext}`;
        zip.file(name, d.data);
        fileEntries.push({ name, question: d.question });
      } else {
        post({
          type: "status",
          label: `Conversion en MP4 ${i + 1} sur ${downloaded.length}…`,
          phase: "converting",
        });
        try {
          const inputName = `in-${i}.${d.ext}`;
          const outputName = `out-${i}.mp4`;
          await ffmpeg.writeFile(inputName, d.data);
          const outData = await convertToMp4(ffmpeg, inputName, outputName, ffmpegLogs);
          zip.file(finalName, outData);
          fileEntries.push({ name: finalName, question: d.question });
          convertedCount++;
          await ffmpeg.deleteFile(inputName).catch(() => {});
        } catch (err) {
          console.warn("[worker] conversion failed", d.baseName, err);
          conversionFailures++;
          const name = `${d.baseName}.${d.ext}`;
          zip.file(name, d.data);
          fileEntries.push({ name, question: d.question });
        }
      }
      post({ type: "progress", value: 60 + ((i + 1) / downloaded.length) * 25, label: "" });
    }

    const safeName = sanitizeName(msg.candidateName, "candidat");
    const dateStr = new Date(msg.createdAt ?? Date.now()).toISOString().slice(0, 10);
    const durationMin = msg.durationSeconds ? Math.round(msg.durationSeconds / 60) : null;

    const readme: string[] = [];
    readme.push(`Entretien — ${msg.candidateName ?? ""}`);
    readme.push("");
    readme.push(`Candidat : ${msg.candidateName ?? ""}`);
    if (msg.candidateEmail) readme.push(`Courriel : ${msg.candidateEmail}`);
    if (msg.projectTitle) readme.push(`Projet   : ${msg.projectTitle}`);
    if (msg.projectJobTitle) readme.push(`Poste    : ${msg.projectJobTitle}`);
    readme.push(`Date     : ${dateStr}`);
    if (durationMin !== null) readme.push(`Durée    : ${durationMin} min`);
    readme.push("");
    readme.push("Contenu de l'archive :");
    fileEntries.forEach((f) => readme.push(`  ${f.name} — ${f.question}`));
    if (missing.length > 0) {
      readme.push("");
      readme.push("Segments indisponibles :");
      missing.forEach((n) => readme.push(`  ${n}`));
    }
    readme.push("");
    const allMp4 = fileEntries.every((f) => f.name.toLowerCase().endsWith(".mp4"));
    if (allMp4) {
      readme.push("Format : MP4 (MPEG-4 Part 2 / AAC). Lisible avec VLC, QuickTime, Chrome, Firefox, Edge.");
    } else {
      readme.push(
        `Format : ${convertedCount} fichier(s) en MP4, ${conversionFailures} fichier(s) restés en WebM.${
          ffmpegLoadError ? ` Convertisseur indisponible (${ffmpegLoadError}).` : ""
        }`,
      );
    }
    zip.file("README.txt", readme.join("\n"));

    post({ type: "status", label: "Création de l'archive ZIP…", phase: "zipping" });
    const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (meta) => {
      post({ type: "progress", value: 85 + meta.percent * 0.15, label: "" });
    });

    const filename = `entretien-${safeName}-${dateStr}.zip`;
    post({ type: "progress", value: 100, label: "" });
    post({ type: "done", blob: zipBlob, filename, fileCount: fileEntries.length });
  } catch (err) {
    post({ type: "error", message: (err as Error)?.message || String(err) });
  }
}

self.addEventListener("message", (e: MessageEvent<StartMessage>) => {
  if (e.data?.type === "start") void run(e.data);
});
