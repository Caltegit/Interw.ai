// Cache mémoire pour les blobs TTS de phrases statiques de transition.
// Objectif : éviter un aller-retour réseau ElevenLabs (0.8–2 s) quand le
// candidat passe d'une question à la suivante avec une transition prévisible.
//
// Notes d'implémentation :
// - Clé = `${voiceId}|${normalizedText}` → un changement de voix invalide
//   naturellement le cache (rarissime en cours de session, mais propre).
// - Cache mémoire process-local (Map). Pas de persistance disque pour rester
//   simple et éviter toute fuite d'audio entre projets/voix.
// - Borné implicitement (≤ une poignée de phrases statiques par session).

type CacheKey = string;

const blobs = new Map<CacheKey, Blob>();

const norm = (text: string) => text.trim().replace(/\s+/g, " ");
const keyOf = (text: string, voiceId: string | null | undefined) =>
  `${voiceId ?? "default"}|${norm(text)}`;

export function getCachedTtsBlob(text: string, voiceId: string | null | undefined): Blob | null {
  if (!text) return null;
  return blobs.get(keyOf(text, voiceId)) ?? null;
}

export function setCachedTtsBlob(
  text: string,
  voiceId: string | null | undefined,
  blob: Blob,
): void {
  if (!text || !blob || blob.size === 0) return;
  blobs.set(keyOf(text, voiceId), blob);
}

// Phrases statiques que le client peut générer côté lui-même quand l'appel à
// `ai-conversation-turn` est court-circuité (relance impossible / désactivée).
// Doit rester synchronisé avec les chaînes utilisées dans InterviewStart.tsx.
export const STATIC_TRANSITION_PHRASES = {
  closing: "Merci pour cette session, à bientôt.",
  nextAudio: "Merci. Écoutez la question suivante.",
  nextVideo: "Merci. Regardez la question suivante.",
} as const;

export type TtsFetcher = (text: string) => Promise<{ blob: Blob; bytes: number; ms: number } | null>;

/**
 * Précharge en parallèle les phrases statiques pour la voix du projet.
 * Fire-and-forget : si une requête échoue, on retombe simplement sur le flux
 * normal au moment du jeu. Ne lève jamais.
 */
export async function prefetchTransitionPhrases(
  voiceId: string | null | undefined,
  fetcher: TtsFetcher,
  phrases: string[] = Object.values(STATIC_TRANSITION_PHRASES),
): Promise<void> {
  await Promise.all(
    phrases.map(async (text) => {
      try {
        if (getCachedTtsBlob(text, voiceId)) return;
        const res = await fetcher(text);
        if (res?.blob) setCachedTtsBlob(text, voiceId, res.blob);
      } catch {
        // silencieux : prefetch best-effort
      }
    }),
  );
}
