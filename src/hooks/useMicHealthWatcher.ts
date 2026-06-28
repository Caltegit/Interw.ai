import { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

export type MicHealthStatus = "ok" | "silent" | "track-dead";

interface UseMicHealthWatcherOptions {
  /** MediaStream à surveiller. */
  stream: MediaStream | null;
  /** Vrai uniquement pendant l'enregistrement candidat (pas pendant TTS). */
  active: boolean;
  /** Durée (ms) sans signal RMS avant de basculer en "silent". */
  silentThresholdMs?: number;
  /** Seuil RMS sous lequel on considère le micro muet. */
  rmsSilenceMax?: number;
  /** Identifiant de session pour les logs. */
  sessionId?: string | null;
  /**
   * Appelé (throttlé à ~500 ms) chaque fois qu'une présence vocale est détectée.
   * Remplace l'ancien réarmement basé sur la transcription live.
   */
  onVoice?: () => void;
}

interface MicHealthState {
  status: MicHealthStatus;
  /** Timestamp ms du dernier signal détecté. */
  lastSpokeAt: number | null;
  /** Pic RMS instantané (0 → 1). */
  peak: number;
  /** Vrai dès qu'une voix a été captée pendant la phase d'écoute en cours. */
  hasVoiceSignal: boolean;
}

const SILENT_THRESHOLD_DEFAULT = 30000;
// Seuil bas : on veut détecter même les voix douces. La détection se fait
// purement sur le signal acoustique, plus sur la transcription.
const RMS_SILENCE_MAX_DEFAULT = 0.008;
const SILENT_CONFIRM_TICKS = 3;
// Seuil au-dessus duquel on considère qu'il y a une vraie voix (pas du bruit ambiant).
const VOICE_RMS_THRESHOLD = 0.03;
const VOICE_CONFIRM_TICKS = 3;
const VOICE_CALLBACK_THROTTLE_MS = 500;

/**
 * Surveille en continu la santé du micro candidat pendant un entretien :
 * - écoute track.onended → bascule en "track-dead"
 * - mesure RMS via AnalyserNode → bascule en "silent" si pas de signal
 *   pendant `silentThresholdMs`
 * - expose un drapeau `hasVoiceSignal` et un callback `onVoice` pour piloter
 *   le réarmement des minuteries de silence sans dépendre d'une STT live.
 *
 * Ne s'active que quand `active` est vrai (typiquement isListening && !isSpeaking).
 */
export function useMicHealthWatcher({
  stream,
  active,
  silentThresholdMs = SILENT_THRESHOLD_DEFAULT,
  rmsSilenceMax = RMS_SILENCE_MAX_DEFAULT,
  sessionId,
  onVoice,
}: UseMicHealthWatcherOptions): MicHealthState {
  const [status, setStatus] = useState<MicHealthStatus>("ok");
  const [peak, setPeak] = useState(0);
  const [hasVoiceSignal, setHasVoiceSignal] = useState(false);
  const lastSignalAtRef = useRef<number>(Date.now());
  const statusRef = useRef<MicHealthStatus>("ok");
  const onVoiceRef = useRef<typeof onVoice>(onVoice);
  useEffect(() => { onVoiceRef.current = onVoice; }, [onVoice]);

  // Surveille les events natifs de la piste audio.
  useEffect(() => {
    if (!stream || !active) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    const setTrackDead = (reason: string) => {
      if (statusRef.current === "track-dead") return;
      statusRef.current = "track-dead";
      setStatus("track-dead");
      logger.warn("mic_health_track_dead", { sessionId, reason });
    };

    const handleEnded = () => setTrackDead("track_ended");

    if (track.readyState !== "live") {
      setTrackDead("track_not_live_initial");
    }
    track.addEventListener("ended", handleEnded);
    return () => {
      track.removeEventListener("ended", handleEnded);
    };
  }, [stream, active, sessionId]);

  // Boucle de mesure RMS.
  useEffect(() => {
    if (!stream || !active) {
      // Reset état quand on devient inactif (TTS qui parle, pause, etc.).
      if (statusRef.current !== "ok") {
        statusRef.current = "ok";
        setStatus("ok");
      }
      lastSignalAtRef.current = Date.now();
      setPeak(0);
      setHasVoiceSignal(false);
      return;
    }
    if (stream.getAudioTracks().length === 0) return;

    lastSignalAtRef.current = Date.now();
    let silentTickCount = 0;
    let voiceTickCount = 0;
    let lastVoiceCallback = 0;
    let lastPeakSet = 0;

    let cancelled = false;
    let rafId: number | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (cancelled || !analyser) return;
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const now = Date.now();
        // Throttle setPeak pour limiter le re-render (~10 fps suffit pour le vu-mètre).
        if (now - lastPeakSet > 100) {
          setPeak(rms);
          lastPeakSet = now;
        }

        // Détection de voix soutenue → notifier le parent (réarme les minuteries de silence).
        if (rms > VOICE_RMS_THRESHOLD) {
          voiceTickCount += 1;
          if (voiceTickCount >= VOICE_CONFIRM_TICKS) {
            if (!hasVoiceSignal) setHasVoiceSignal(true);
            if (now - lastVoiceCallback > VOICE_CALLBACK_THROTTLE_MS) {
              lastVoiceCallback = now;
              try { onVoiceRef.current?.(); } catch { /* ignore */ }
            }
          }
        } else {
          voiceTickCount = 0;
        }

        if (rms > rmsSilenceMax) {
          lastSignalAtRef.current = now;
          silentTickCount = 0;
          if (statusRef.current === "silent") {
            statusRef.current = "ok";
            setStatus("ok");
            logger.warn("mic_health_recovered_from_silent", { sessionId });
          }
        } else if (statusRef.current === "ok") {
          const silentFor = now - lastSignalAtRef.current;
          if (silentFor > silentThresholdMs) {
            silentTickCount += 1;
            if (silentTickCount >= SILENT_CONFIRM_TICKS) {
              statusRef.current = "silent";
              setStatus("silent");
              logger.warn("mic_health_silent", { sessionId, silentMs: silentFor });
            }
          } else {
            silentTickCount = 0;
          }
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    } catch (err) {
      logger.warn("mic_health_watcher_init_failed", {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      try { source?.disconnect(); } catch { /* noop */ }
      try { ctx?.close(); } catch { /* noop */ }
    };
    // hasVoiceSignal volontairement absent des deps : c'est un drapeau monotone
    // pendant la durée de vie de la session d'écoute, lu via une closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, active, sessionId, silentThresholdMs, rmsSilenceMax]);

  return { status, lastSpokeAt: lastSignalAtRef.current, peak, hasVoiceSignal };
}
