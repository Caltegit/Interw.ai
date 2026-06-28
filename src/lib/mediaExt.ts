// Déduit l'extension de fichier à partir du type MIME d'un blob.
// Priorise mp4/m4a qui sont lisibles partout (notamment iOS Safari).
export function extFromMime(mime: string | undefined | null, kind: "audio" | "video"): string {
  const m = (mime || "").toLowerCase();
  if (kind === "video") {
    if (m.includes("mp4")) return "mp4";
    if (m.includes("quicktime")) return "mov";
    if (m.includes("webm")) return "webm";
    return "webm";
  }
  if (m.includes("mp4") || m.includes("aac") || m.includes("m4a")) return "m4a";
  if (m.includes("mpeg")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("webm") || m.includes("ogg") || m.includes("opus")) return "webm";
  return "webm";
}

export function contentTypeOf(blob: Blob, kind: "audio" | "video"): string {
  return blob.type || (kind === "audio" ? "audio/webm" : "video/webm");
}

/**
 * Détecte le vrai conteneur d'un Blob à partir de ses premiers octets,
 * utile quand `blob.type` est vide (cas Safari sur certains chemins).
 * Renvoie un MIME standard ou null si le format n'est pas reconnu.
 */
export async function detectMimeFromBlob(blob: Blob, kind: "audio" | "video"): Promise<string | null> {
  try {
    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    if (head.length < 4) return null;
    // ISO BMFF / MP4 / M4A : "....ftyp" (offset 4)
    if (
      head.length >= 8 &&
      head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70
    ) {
      return kind === "audio" ? "audio/mp4" : "video/mp4";
    }
    // WebM / Matroska : EBML header 1A 45 DF A3
    if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
      return kind === "audio" ? "audio/webm" : "video/webm";
    }
    // Ogg : "OggS"
    if (head[0] === 0x4f && head[1] === 0x67 && head[2] === 0x67 && head[3] === 0x53) {
      return kind === "audio" ? "audio/ogg" : "video/ogg";
    }
    // ID3 ou frame MPEG → MP3
    if (
      (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) || // "ID3"
      (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)
    ) {
      return "audio/mpeg";
    }
    // WAV : "RIFF....WAVE"
    if (
      head.length >= 12 &&
      head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
      head[8] === 0x57 && head[9] === 0x41 && head[10] === 0x56 && head[11] === 0x45
    ) {
      return "audio/wav";
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Résout le MIME le plus fiable pour un blob :
 * - `blob.type` si présent
 * - sinon magic bytes
 * - sinon fallback par défaut selon le kind
 */
export async function resolveBlobMime(blob: Blob, kind: "audio" | "video"): Promise<string> {
  if (blob.type && blob.type !== "application/octet-stream") return blob.type;
  const sniffed = await detectMimeFromBlob(blob, kind);
  if (sniffed) return sniffed;
  return kind === "audio" ? "audio/webm" : "video/webm";
}
