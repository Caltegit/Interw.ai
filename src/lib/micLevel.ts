/**
 * Utilitaires de mesure du niveau micro (RMS) à partir d'un MediaStream.
 * Centralise le calcul utilisé par le test technique, la garde anti-silence
 * à l'entrée de session, et le watchdog pendant l'entretien.
 */

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
  /** RMS plafond considéré comme "silence quasi total" à l'entrée /start. */
  WARMUP_SILENCE_MAX: 0.01,
  /** Durée du test guidé (ms). */
  TEST_DURATION_MS: 6000,
  /** Durée de la mesure de warm-up à l'entrée de session (ms). */
  WARMUP_DURATION_MS: 1500,
};
