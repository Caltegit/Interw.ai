import { useEffect, useMemo, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import { getSharedAudioContext } from "@/lib/audioContext";
import type { MicCalibration } from "@/lib/micLevel";

export type MicHealthStatus = "ok" | "too-quiet" | "silent" | "track-dead";

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
   * Calibration issue du test technique (pic vocal du candidat + bruit
   * ambiant). Utilisée pour rendre les seuils adaptatifs : un candidat à
   * voix douce ne sera plus auto-pausé à tort, et un environnement bruyant
   * ne masquera plus la détection de silence.
   */
  calibration?: MicCalibration | null;
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

const SILENT_THRESHOLD_DEFAULT = 30_000;
// Seuil bas par défaut : on veut détecter même les voix douces. Adapté
// runtime via calibration.noiseFloor × 1.5.
const RMS_SILENCE_MAX_DEFAULT = 0.008;
const SILENT_CONFIRM_TICKS = 3;
// Seuil par défaut au-dessus duquel on considère qu'il y a une vraie voix
// (pas du bruit ambiant). Adapté runtime via calibration.peakUser × 0.4.
const VOICE_RMS_THRESHOLD_DEFAULT = 0.03;
const VOICE_RMS_THRESHOLD_MIN = 0.015;
const VOICE_CONFIRM_TICKS = 3;
const VOICE_CALLBACK_THROTTLE_MS = 500;
// Durée (ms) où le RMS reste entre silence et voix sans dépasser le seuil voix
// avant d'afficher la bannière "trop faible".
const TOO_QUIET_THRESHOLD_MS = 15_000;

/**
 * Surveille en continu la santé du micro candidat pendant un entretien :
 * - écoute track.onended → bascule en "track-dead"
 * - mesure RMS via AnalyserNode → "silent" si rien, "too-quiet" si voix
 *   présente mais trop faible.
 *
 * Ne s'active que quand `active` est vrai (typiquement isListening && !isSpeaking).
 */
export function useMicHealthWatcher({
  stream,
  active,
  silentThresholdMs = SILENT_THRESHOLD_DEFAULT,
  rmsSilenceMax,
  sessionId,
  calibration,
  onVoice,
}: UseMicHealthWatcherOptions): MicHealthState {
  const [status, setStatus] = useState<MicHealthStatus>("ok");
  const [peak, setPeak] = useState(0);
  const [hasVoiceSignal, setHasVoiceSignal] = useState(false);
  const lastSignalAtRef = useRef<number>(Date.now());
  const lastFaintAtRef = useRef<number>(Date.now());
  const statusRef = useRef<MicHealthStatus>("ok");
  const onVoiceRef = useRef<typeof onVoice>(onVoice);
  useEffect(() => { onVoiceRef.current = onVoice; }, [onVoice]);

  // Seuils adaptatifs déduits de la calibration (avec garde-fous).
  const { effectiveSilenceMax, effectiveVoiceThreshold } = useMemo(() => {
    const baseSilence = typeof rmsSilenceMax === "number" ? rmsSilenceMax : RMS_SILENCE_MAX_DEFAULT;
    const noiseFloor = calibration?.noiseFloor ?? 0;
    const peakUser = calibration?.peakUser ?? 0;
    // GARDE-FOU : la calibration ne peut QUE desserrer le seuil silence,
    // jamais le durcir. Bornée à 3× le défaut pour qu'un noiseFloor anormalement
    // élevé (saturation au moment du test) ne désactive pas la détection.
    const noiseAdjusted = Math.min(noiseFloor * 1.5, baseSilence * 3);
    const adaptedSilence = Math.max(baseSilence, noiseAdjusted);
    const adaptedVoice = peakUser > 0
      ? Math.max(VOICE_RMS_THRESHOLD_MIN, peakUser * 0.4)
      : VOICE_RMS_THRESHOLD_DEFAULT;
    // Voix doit toujours être strictement au-dessus du seuil silence,
    // sinon les deux zones (silence / trop-faible) deviennent incohérentes.
    const finalVoice = Math.max(adaptedVoice, adaptedSilence * 1.5);
    return { effectiveSilenceMax: adaptedSilence, effectiveVoiceThreshold: finalVoice };
  }, [calibration, rmsSilenceMax]);

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

    // Mute/unmute : iOS et Android coupent brièvement la piste lors de notifications,
    // bascule Bluetooth, appel entrant... On tolère 5 s de mute (blip) avant de
    // basculer en track-dead, et on récupère immédiatement sur unmute.
    let muteTimer: ReturnType<typeof setTimeout> | null = null;
    const handleMute = () => {
      if (muteTimer) clearTimeout(muteTimer);
      muteTimer = setTimeout(() => setTrackDead("track_muted_persistent"), 5000);
    };
    const handleUnmute = () => {
      if (muteTimer) { clearTimeout(muteTimer); muteTimer = null; }
      if (statusRef.current === "track-dead") {
        // Retour à la vie : reset et laisser la boucle RMS reconfirmer l'état.
        statusRef.current = "ok";
        setStatus("ok");
        lastSignalAtRef.current = Date.now();
        lastFaintAtRef.current = Date.now();
        logger.warn("mic_health_unmuted", { sessionId });
      }
    };

    if (track.readyState !== "live") {
      setTrackDead("track_not_live_initial");
    }
    if (track.muted) handleMute();
    track.addEventListener("ended", handleEnded);
    track.addEventListener("mute", handleMute);
    track.addEventListener("unmute", handleUnmute);
    return () => {
      if (muteTimer) clearTimeout(muteTimer);
      track.removeEventListener("ended", handleEnded);
      track.removeEventListener("mute", handleMute);
      track.removeEventListener("unmute", handleUnmute);
    };
  }, [stream, active, sessionId]);

  // Boucle de mesure RMS.
  useEffect(() => {
    if (!stream || !active) {
      if (statusRef.current !== "ok") {
        statusRef.current = "ok";
        setStatus("ok");
      }
      lastSignalAtRef.current = Date.now();
      lastFaintAtRef.current = Date.now();
      setPeak(0);
      setHasVoiceSignal(false);
      return;
    }
    if (stream.getAudioTracks().length === 0) return;

    const now0 = Date.now();
    lastSignalAtRef.current = now0;
    lastFaintAtRef.current = now0;
    let silentTickCount = 0;
    let voiceTickCount = 0;
    let lastVoiceCallback = 0;
    let lastPeakSet = 0;

    let cancelled = false;
    let rafId: number | null = null;
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let ownsCtx = false;

    try {
      // Priorité au contexte partagé (débloqué par geste utilisateur sur iOS).
      ctx = getSharedAudioContext();
      if (!ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new Ctor();
        ownsCtx = true;
      }
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
        if (now - lastPeakSet > 100) {
          setPeak(rms);
          lastPeakSet = now;
        }

        const isVoice = rms > effectiveVoiceThreshold;
        const isFaint = !isVoice && rms > effectiveSilenceMax;

        // Détection de voix soutenue → notifier le parent et réarmer les
        // chronos. ATTENTION : on ne réarme `lastSignalAtRef` que sur vraie
        // voix, pas sur bruit ambiant, pour éviter qu'un ventilateur
        // empêche l'auto-pause indéfiniment.
        if (isVoice) {
          voiceTickCount += 1;
          lastSignalAtRef.current = now;
          lastFaintAtRef.current = now;
          silentTickCount = 0;
          if (voiceTickCount >= VOICE_CONFIRM_TICKS) {
            if (!hasVoiceSignal) setHasVoiceSignal(true);
            if (now - lastVoiceCallback > VOICE_CALLBACK_THROTTLE_MS) {
              lastVoiceCallback = now;
              try { onVoiceRef.current?.(); } catch { /* ignore */ }
            }
            // Sortie de tout statut dégradé sur retour de voix nette.
            if (statusRef.current !== "ok" && statusRef.current !== "track-dead") {
              statusRef.current = "ok";
              setStatus("ok");
              logger.warn("mic_health_recovered", { sessionId });
            }
          }
        } else {
          voiceTickCount = 0;
          if (isFaint) {
            // Signal présent mais trop faible : pas un silence, juste à risque.
            const faintFor = now - lastFaintAtRef.current;
            if (
              faintFor > TOO_QUIET_THRESHOLD_MS &&
              statusRef.current === "ok"
            ) {
              statusRef.current = "too-quiet";
              setStatus("too-quiet");
              logger.warn("mic_too_quiet", { sessionId, faintMs: faintFor, rms });
            }
          } else if (statusRef.current === "ok" || statusRef.current === "too-quiet") {
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
      if (ownsCtx) {
        try { ctx?.close(); } catch { /* noop */ }
      }
    };
    // hasVoiceSignal volontairement absent des deps : drapeau monotone lu via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, active, sessionId, silentThresholdMs, effectiveSilenceMax, effectiveVoiceThreshold]);

  return { status, lastSpokeAt: lastSignalAtRef.current, peak, hasVoiceSignal };
}
