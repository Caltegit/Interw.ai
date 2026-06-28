/**
 * Utilitaires de mesure du niveau micro (RMS) à partir d'un MediaStream.
 * Centralise le calcul utilisé par le test technique, la garde anti-silence
 * à l'entrée de session, et le watchdog pendant l'entretien.
 */

/**
 * Contraintes audio standard utilisées par l'entretien candidat.
 * - `noiseSuppression: false` : la suppression de bruit agressive de Chrome/Edge
 *   coupe régulièrement les voix douces ou éloignées du micro, ce qui produit
 *   l'impression que « le micro coupe ». On la désactive volontairement.
 * - `echoCancellation: true` : indispensable pour éviter que le TTS revienne
 *   dans l'enregistrement.
 * - `autoGainControl: true` : remonte automatiquement le niveau d'entrée.
 * - `channelCount: 1` : audio mono, suffisant et plus léger à uploader.
 */
export function buildAudioConstraints(deviceId?: string | null): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: false,
    autoGainControl: true,
    channelCount: 1,
  };
  if (deviceId) {
    return { ...base, deviceId: { exact: deviceId } };
  }
  return base;
}


export interface MicMeasurement {
  /** Pic de RMS observé (0 → 1). */
  peak: number;
  /** Durée cumulée (en ms) au-dessus du seuil d'activité vocale. */
  activeMs: number;
  /** Pourcentage du temps où le signal était au-dessus du seuil. */
  activeRatio: number;
  /** True si la piste audio est marquée muted (système ou navigateur). */
  muted: boolean;
  /** True si la mesure a pu se dérouler (AudioContext disponible et actif). */
  ok: boolean;
}

/**
 * Mesure le niveau micro pendant `durationMs`. Renvoie le pic + la durée
 * cumulée au-dessus de `activeThreshold`. Ne bloque pas si l'AudioContext
 * ne démarre pas — renvoie `ok: false` dans ce cas.
 */
export async function measureMicLevel(
  stream: MediaStream,
  durationMs = 1500,
  activeThreshold = 0.05,
): Promise<MicMeasurement> {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    return { peak: 0, activeMs: 0, activeRatio: 0, muted: true, ok: false };
  }
  const track = audioTracks[0];
  const muted = track.muted === true || track.readyState !== "live";

  const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) {
    return { peak: 0, activeMs: 0, activeRatio: 0, muted, ok: false };
  }
  const ctx = new Ctor();
  try {
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    if (ctx.state !== "running") {
      try { await ctx.close(); } catch { /* ignore */ }
      return { peak: 0, activeMs: 0, activeRatio: 0, muted, ok: false };
    }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    const buffer = new Uint8Array(analyser.fftSize);

    const start = performance.now();
    let peak = 0;
    let activeMs = 0;
    let lastTick = start;
    let samples = 0;

    return await new Promise<MicMeasurement>((resolve) => {
      const tick = () => {
        const now = performance.now();
        const dt = now - lastTick;
        lastTick = now;
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        if (rms > peak) peak = rms;
        if (rms > activeThreshold) activeMs += dt;
        samples++;
        if (now - start >= durationMs) {
          try { source.disconnect(); } catch { /* ignore */ }
          try { ctx.close(); } catch { /* ignore */ }
          const elapsed = now - start;
          resolve({
            peak,
            activeMs,
            activeRatio: elapsed > 0 ? activeMs / elapsed : 0,
            muted: track.muted === true || track.readyState !== "live",
            ok: samples > 5,
          });
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  } catch {
    try { await ctx.close(); } catch { /* ignore */ }
    return { peak: 0, activeMs: 0, activeRatio: 0, muted, ok: false };
  }
}

/** Seuils standards utilisés par le test technique et la garde à l'entrée. */
export const MIC_THRESHOLDS = {
  /** RMS minimum considéré comme "voix audible" (au-dessus du bruit ambiant). */
  ACTIVE_RMS: 0.05,
  /** Pic minimum requis pour valider le micro au test technique. */
  TEST_PEAK_MIN: 0.10,
  /** Temps cumulé (ms) au-dessus du seuil pour valider le micro au test. */
  TEST_ACTIVE_MS_MIN: 800,
  /** RMS plafond considéré comme "silence quasi total" (legacy, conservé pour le watcher). */
  WARMUP_SILENCE_MAX: 0.01,
  /** Durée du test guidé (ms). */
  TEST_DURATION_MS: 6000,
  /** Durée de la mesure de warm-up (ms) — legacy, plus utilisé par défaut. */
  WARMUP_DURATION_MS: 1500,
};

/** Durée pendant laquelle une validation de test technique reste valable (30 min). */
export const MIC_TEST_VALIDITY_MS = 30 * 60 * 1000;

interface MicTestValidation {
  deviceId: string | null;
  validatedAt: number;
  peak?: number;
  activeMs?: number;
}

/**
 * Vérifie qu'un test technique micro a été passé récemment, et que la piste
 * audio courante correspond au périphérique validé. Évite de re-mesurer
 * inutilement à l'entrée de session.
 */
export function isMicTestStillValid(
  token: string | null | undefined,
  currentDeviceId: string | null | undefined,
  maxAgeMs: number = MIC_TEST_VALIDITY_MS,
): boolean {
  if (!token) return false;
  try {
    const raw = sessionStorage.getItem(`mic-test-validated:${token}`);
    if (!raw) return false;
    const data = JSON.parse(raw) as MicTestValidation;
    if (!data?.validatedAt) return false;
    if (Date.now() - data.validatedAt > maxAgeMs) return false;
    // Si on connait le deviceId courant ET celui validé, ils doivent matcher.
    if (currentDeviceId && data.deviceId && data.deviceId !== currentDeviceId) return false;
    return true;
  } catch {
    return false;
  }
}

