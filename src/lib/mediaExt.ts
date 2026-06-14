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
