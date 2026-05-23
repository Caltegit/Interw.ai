// Résolveur de timestamps "Voir le moment" — méthode unique et déterministe.
//
// Règle : on prend le nombre de mots total de la transcription du message
// candidat (= 100 %). On localise le premier mot de la citation dans cette
// transcription, on calcule son pourcentage de position, puis on le convertit
// en secondes par rapport au début du clip vidéo de la réponse.
//
// Durée du clip :
// - si Whisper a fourni des `transcript_segments`, on prend le `end` du
//   dernier segment (vraie durée de l'audio transcrit) ;
// - sinon, estimation à 2,5 mots/seconde (rythme moyen FR).
//
// Aucun fallback IA, aucune branche spéciale, aucune heuristique de score :
// une seule règle pour tous les boutons "Voir le moment" du rapport.

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
}

function prepare(messages: MessageLike[]): Map<string, Prepared> {
  const out = new Map<string, Prepared>();
  for (const m of messages) {
    if (m.role && m.role !== "candidate") continue;
    const words = normalize(typeof m.content === "string" ? m.content : "")
      .split(" ")
      .filter(Boolean);

    // Vraie durée du clip si Whisper l'a fournie via les segments.
    let duration = 0;
    const segs = m.transcript_segments;
    if (Array.isArray(segs)) {
      for (const s of segs) {
        const end = Number(s?.end);
        if (Number.isFinite(end) && end > duration) duration = end;
      }
    }
    // Fallback : estimation à 2,5 mots/seconde.
    if (duration <= 0) duration = words.length / 2.5;

    out.set(m.id, { words, duration });
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
    const { words, duration } = data;
    if (words.length === 0 || duration <= 0) return null;

    const qWords = normalize(quote).split(" ").filter(Boolean);
    if (qWords.length === 0) return null;

    // Cherche la meilleure occurrence du début de la citation dans la
    // transcription. On tente d'abord des fenêtres longues (plus fiables),
    // puis on rétrécit. En cas d'occurrences multiples, on garde celle dont
    // la suite chevauche le plus la citation (= meilleur match contextuel).
    let bestIdx = -1;
    let bestScore = -1;
    for (const n of [5, 4, 3, 2]) {
      if (qWords.length < n) continue;
      const needle = qWords.slice(0, n);
      for (let i = 0; i <= words.length - n; i++) {
        if (!matchAt(words, i, needle)) continue;
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
    // Dernier recours : premier mot seul.
    if (bestIdx < 0) {
      const first = qWords[0];
      for (let i = 0; i < words.length; i++) {
        if (words[i] === first) {
          bestIdx = i;
          break;
        }
      }
    }
    if (bestIdx < 0) return null;

    // Position du 1er mot / nombre total de mots × durée du clip.
    const seconds = (bestIdx / words.length) * duration;
    return Math.max(0, Math.round(seconds * 10) / 10);
  };
}

function matchAt(haystack: string[], i: number, needle: string[]): boolean {
  for (let k = 0; k < needle.length; k++) {
    if (haystack[i + k] !== needle[k]) return false;
  }
  return true;
}
