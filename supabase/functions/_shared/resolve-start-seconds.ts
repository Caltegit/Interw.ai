// Résolveur de timestamps "Voir le moment".
// Donne, pour un (message_id, citation), la seconde de début de la citation
// dans le clip vidéo de la réponse candidat.
//
// Stratégie :
// 1. Si le message a `transcript_segments` (Whisper en mode segments),
//    on cherche le segment qui contient au moins 3 mots consécutifs de la
//    citation et on retourne son `start` exact.
// 2. Sinon, fallback proportionnel : on localise la citation dans la
//    transcription textuelle (fenêtres de 5 → 4 → 3 mots), on prend la
//    meilleure occurrence (celle dont la suite chevauche le plus la citation)
//    et on calcule i / nbMots × durée. Durée estimée à 2,5 mots/s.

export interface MessageLike {
  id: string;
  role?: string | null;
  content?: string | null;
  transcript_segments?: Array<{ start?: number; end?: number; text?: string }> | null;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface Prepared {
  words: string[];
  duration: number;
  segments: Array<{ start: number; words: string[] }> | null;
}

function prepare(messages: MessageLike[]): Map<string, Prepared> {
  const out = new Map<string, Prepared>();
  for (const m of messages) {
    if (m.role && m.role !== "candidate") continue;
    const words = normalize(typeof m.content === "string" ? m.content : "")
      .split(" ")
      .filter(Boolean);
    let duration = 0;
    let segments: Prepared["segments"] = null;
    const segs = m.transcript_segments;
    if (Array.isArray(segs) && segs.length > 0) {
      segments = [];
      for (const s of segs) {
        const start = Number(s?.start);
        const end = Number(s?.end);
        if (Number.isFinite(end) && end > duration) duration = end;
        if (Number.isFinite(start)) {
          segments.push({
            start: Math.max(0, start),
            words: normalize(typeof s?.text === "string" ? s.text : "")
              .split(" ")
              .filter(Boolean),
          });
        }
      }
      if (segments.length === 0) segments = null;
    }
    if (duration <= 0) duration = words.length / 2.5;
    out.set(m.id, { words, duration, segments });
  }
  return out;
}

export function resolveStartFactory(messages: MessageLike[]) {
  const prepared = prepare(messages);

  return (messageId: unknown, quote: unknown): number | null => {
    if (typeof messageId !== "string" || !messageId) return null;
    if (typeof quote !== "string" || !quote.trim()) return null;
    const data = prepared.get(messageId);
    if (!data) return null;
    const qWords = normalize(quote).split(" ").filter(Boolean);
    if (qWords.length === 0) return null;

    // 1) Si on a des segments Whisper, on cherche celui qui contient
    //    une fenêtre de 3 mots (puis 2) consécutifs de la citation.
    if (data.segments && data.segments.length > 0) {
      for (const n of [3, 2]) {
        if (qWords.length < n) continue;
        for (let i = 0; i <= qWords.length - n; i++) {
          const needle = qWords.slice(i, i + n);
          for (const seg of data.segments) {
            if (containsSequence(seg.words, needle)) {
              return Math.round(seg.start * 10) / 10;
            }
          }
        }
      }
      // Pas trouvé via segments, on continue avec le fallback proportionnel
      // (utile si la transcription des segments est partielle).
    }

    // 2) Fallback proportionnel sur le texte global du message.
    const { words, duration } = data;
    if (words.length === 0 || duration <= 0) return null;

    let bestIdx = -1;
    let bestScore = -1;
    for (const n of [5, 4, 3]) {
      if (qWords.length < n) continue;
      const needle = qWords.slice(0, n);
      for (let i = 0; i <= words.length - n; i++) {
        if (!matchAt(words, i, needle)) continue;
        // Score = nombre de mots suivants qui matchent encore la citation,
        // pour départager les occurrences multiples.
        let score = n;
        let k = n;
        while (
          k < qWords.length &&
          i + k < words.length &&
          words[i + k] === qWords[k]
        ) {
          score++;
          k++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) break;
    }
    // Dernier recours : un seul mot.
    if (bestIdx < 0) {
      const needle = [qWords[0]];
      for (let i = 0; i < words.length; i++) {
        if (words[i] === needle[0]) {
          bestIdx = i;
          break;
        }
      }
    }
    if (bestIdx < 0) return null;
    return Math.max(0, Math.round((bestIdx / words.length) * duration * 10) / 10);
  };
}

function matchAt(haystack: string[], i: number, needle: string[]): boolean {
  for (let k = 0; k < needle.length; k++) {
    if (haystack[i + k] !== needle[k]) return false;
  }
  return true;
}

function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || haystack.length < needle.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (matchAt(haystack, i, needle)) return true;
  }
  return false;
}
