/**
 * Utilitaires de mesure du niveau micro (RMS) à partir d'un MediaStream.
 * Centralise le calcul utilisé par le test technique, la garde anti-silence
 * à l'entrée de session, et le watchdog pendant l'entretien.
 */

import { getSharedAudioContext } from "./audioContext";

/**
 * Contraintes audio standard utilisées par l'entretien candidat.
 * - `noiseSuppression: false` : la suppression de bruit agressive de Chrome/Edge
 *   coupe régulièrement les voix douces ou éloignées du micro, ce qui produit
 *   l'impression que « le micro coupe ». On la désactive volontairement.
 * - `echoCancellation: true` : indispensable pour éviter que le TTS revienne
 *   dans l'enregistrement.
 * - `autoGainControl: true` : remonte automatiquement le niveau d'entrée.
 * - `channelCount: 1` : audio mono, suffisant et plus léger à uploader.
 * - `sampleRate: { ideal: 48000, min: 16000 }` : évite que le navigateur
 *   tombe sur 8 kHz (iOS 16+) ce qui dégrade fortement la transcription.
 */
export function buildAudioConstraints(deviceId?: string | null): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: false,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: { ideal: 48000, min: 16000 } as ConstrainULong,
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
  /** Plancher de bruit (RMS moyen des 500 premières ms, avant que le candidat parle). */
  noiseFloor: number;
  /** True si la piste audio est marquée muted (système ou navigateur). */
  muted: boolean;
  /** True si la mesure a pu se dérouler (AudioContext disponible et actif). */
  ok: boolean;
}

/**
 * Mesure le niveau micro pendant `durationMs`. Renvoie le pic + la durée
 * cumulée au-dessus de `activeThreshold` + le plancher de bruit.
 * Ne bloque pas si l'AudioContext ne démarre pas — renvoie `ok: false`.
 *
 * Utilise l'AudioContext partagé (singleton) si disponible. Sinon, en
 * crée un dédié et le ferme à la fin.
 */
export async function measureMicLevel(
  stream: MediaStream,
  durationMs = 1500,
  activeThreshold = 0.05,
): Promise<MicMeasurement> {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    return { peak: 0, activeMs: 0, activeRatio: 0, noiseFloor: 0, muted: true, ok: false };
  }
  const track = audioTracks[0];
  const muted = track.muted === true || track.readyState !== "live";

  // Priorité au contexte partagé (déjà débloqué par geste utilisateur sur iOS).
  let ctx: AudioContext | null = getSharedAudioContext();
  let ownsCtx = false;
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) {
      return { peak: 0, activeMs: 0, activeRatio: 0, noiseFloor: 0, muted, ok: false };
    }
    try {
      ctx = new Ctor();
      ownsCtx = true;
    } catch {
      return { peak: 0, activeMs: 0, activeRatio: 0, noiseFloor: 0, muted, ok: false };
    }
  }
  try {
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }
    if (ctx.state !== "running") {
      if (ownsCtx) { try { await ctx.close(); } catch { /* ignore */ } }
      return { peak: 0, activeMs: 0, activeRatio: 0, noiseFloor: 0, muted, ok: false };
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
    // Plancher de bruit : moyenne RMS sur les 500 premières ms, avant que
    // le candidat ne commence à parler.
    let noiseFloorSum = 0;
    let noiseFloorSamples = 0;
    const NOISE_FLOOR_WINDOW_MS = 500;

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
        if (now - start < NOISE_FLOOR_WINDOW_MS) {
          noiseFloorSum += rms;
          noiseFloorSamples += 1;
        }
        samples++;
        if (now - start >= durationMs) {
          try { source.disconnect(); } catch { /* ignore */ }
          if (ownsCtx) { try { ctx!.close(); } catch { /* ignore */ } }
          const elapsed = now - start;
          const noiseFloor = noiseFloorSamples > 0 ? noiseFloorSum / noiseFloorSamples : 0;
          resolve({
            peak,
            activeMs,
            activeRatio: elapsed > 0 ? activeMs / elapsed : 0,
            noiseFloor,
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
    if (ownsCtx) { try { await ctx.close(); } catch { /* ignore */ } }
    return { peak: 0, activeMs: 0, activeRatio: 0, noiseFloor: 0, muted, ok: false };
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

export interface MicCalibration {
  /** Pic vocal mesuré pendant le test (sert à calibrer le seuil voix runtime). */
  peakUser: number;
  /** Plancher de bruit ambiant mesuré au tout début du test. */
  noiseFloor: number;
}

interface MicTestValidation {
  deviceId: string | null;
  validatedAt: number;
  peak?: number;
  activeMs?: number;
  noiseFloor?: number;
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

/**
 * Récupère la calibration micro persistée par le test technique. Renvoie null
 * si non disponible ou expirée.
 */
export function loadMicCalibration(token: string | null | undefined): MicCalibration | null {
  if (!token) return null;
  try {
    const raw = sessionStorage.getItem(`mic-test-validated:${token}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as MicTestValidation;
    if (!data?.validatedAt) return null;
    if (Date.now() - data.validatedAt > MIC_TEST_VALIDITY_MS) return null;
    const peakUser = typeof data.peak === "number" ? data.peak : 0;
    const noiseFloor = typeof data.noiseFloor === "number" ? data.noiseFloor : 0;
    if (peakUser <= 0) return null;
    return { peakUser, noiseFloor };
  } catch {
    return null;
  }
}
