/**
 * AudioContext partagé pour toute la chaîne audio candidat.
 *
 * Pourquoi un singleton :
 * - iOS Safari refuse de démarrer un AudioContext créé hors geste utilisateur.
 *   Tant qu'on n'en crée qu'un seul, initialisé depuis le clic « Commencer »,
 *   tous les consommateurs (vu-mètre, watcher RMS, mesure du test) en
 *   bénéficient sans avoir besoin de leur propre geste.
 * - On évite aussi la limite iOS de ~6 AudioContext simultanés.
 *
 * Reprise automatique :
 * - `visibilitychange → visible` rappelle `resume()` (iOS/Android suspendent
 *   systématiquement le contexte quand l'onglet passe en arrière-plan).
 */

let sharedCtx: AudioContext | null = null;
let visibilityListenerAttached = false;

type AudioContextCtor = typeof AudioContext;

function getCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function attachVisibilityListener() {
  if (visibilityListenerAttached) return;
  if (typeof document === "undefined") return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && sharedCtx && sharedCtx.state === "suspended") {
      sharedCtx.resume().catch(() => { /* ignore */ });
    }
  });
  visibilityListenerAttached = true;
}

/**
 * Renvoie l'AudioContext partagé (le crée à la première demande).
 * À appeler IDÉALEMENT depuis un handler de clic pour iOS.
 */
export function getSharedAudioContext(): AudioContext | null {
  if (sharedCtx) return sharedCtx;
  const Ctor = getCtor();
  if (!Ctor) return null;
  try {
    // 48 kHz est le sample rate natif de la plupart des micros modernes et
    // le format optimal pour Whisper / Gemini Flash audio.
    sharedCtx = new Ctor({ latencyHint: "interactive", sampleRate: 48000 });
  } catch {
    try { sharedCtx = new Ctor(); } catch { return null; }
  }
  attachVisibilityListener();
  return sharedCtx;
}

/**
 * Force le démarrage (resume) du contexte. À appeler dans un handler de clic.
 * Renvoie true si running, false sinon.
 */
export async function ensureAudioContextRunning(): Promise<boolean> {
  const ctx = getSharedAudioContext();
  if (!ctx) return false;
  if ((ctx.state as string) === "running") return true;
  try { await ctx.resume(); } catch { /* ignore */ }
  return (ctx.state as string) === "running";
}

/** Vrai si le contexte existe et est en cours d'exécution. */
export function isAudioContextRunning(): boolean {
  return !!sharedCtx && (sharedCtx.state as string) === "running";
}
