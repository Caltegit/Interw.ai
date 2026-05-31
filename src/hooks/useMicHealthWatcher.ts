import { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

export type MicHealthStatus = "ok" | "silent" | "track-dead";

interface UseMicHealthWatcherOptions {
  /** MediaStream à surveiller. */
  stream: MediaStream | null;
  /** Vrai uniquement pendant l'enregistrement candidat (pas pendant TTS). */
  active: boolean;
  /** Texte transcrit en direct par STT — si change, on considère que le micro capte. */
  liveTranscript?: string;
  /** Durée (ms) sans signal RMS et sans STT avant de basculer en "silent". */
  silentThresholdMs?: number;
  /** Seuil RMS sous lequel on considère le micro muet. */
  rmsSilenceMax?: number;
  /** Identifiant de session pour les logs. */
  sessionId?: string | null;
}

interface MicHealthState {
  status: MicHealthStatus;
  /** Timestamp ms du dernier signal détecté (RMS ou STT). */
  lastSpokeAt: number | null;
  /** Pic RMS instantané (0 → 1). */
  peak: number;
}

const SILENT_THRESHOLD_DEFAULT = 6000;
const RMS_SILENCE_MAX_DEFAULT = 0.015;

/**
 * Surveille en continu la santé du micro candidat pendant un entretien :
 * - écoute track.onmute / onended → bascule en "track-dead"
 * - mesure RMS via AnalyserNode → bascule en "silent" si pas de signal ni
 *   d'événement STT pendant `silentThresholdMs`
 *
 * Ne s'active que quand `active` est vrai (typiquement isListening && !isSpeaking).
 */
export function useMicHealthWatcher({
  stream,
  active,
  liveTranscript,
  silentThresholdMs = SILENT_THRESHOLD_DEFAULT,
  rmsSilenceMax = RMS_SILENCE_MAX_DEFAULT,
  sessionId,
}: UseMicHealthWatcherOptions): MicHealthState {
  const [status, setStatus] = useState<MicHealthStatus>("ok");
  const [peak, setPeak] = useState(0);
  const lastSignalAtRef = useRef<number>(Date.now());
  const lastTranscriptRef = useRef<string>("");
  const statusRef = useRef<MicHealthStatus>("ok");
  const transitionAtRef = useRef<Record<MicHealthStatus, number>>({ ok: Date.now(), silent: 0, "track-dead": 0 });

  // Reset signal timer dès que STT renvoie un nouveau texte.
  useEffect(() => {
    const lt = liveTranscript ?? "";
    if (lt && lt !== lastTranscriptRef.current) {
      lastTranscriptRef.current = lt;
      lastSignalAtRef.current = Date.now();
      if (statusRef.current === "silent") {
        statusRef.current = "ok";
        setStatus("ok");
      }
    }
  }, [liveTranscript]);

  // Surveille les events natifs de la piste audio.
  useEffect(() => {
    if (!stream || !active) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    const setTrackDead = (reason: string) => {
      if (statusRef.current === "track-dead") return;
      statusRef.current = "track-dead";
      transitionAtRef.current["track-dead"] = Date.now();
      setStatus("track-dead");
      logger.warn("mic_health_track_dead", { sessionId, reason });
    };

    const handleMute = () => setTrackDead("track_muted");
    const handleEnded = () => setTrackDead("track_ended");
    const handleUnmute = () => {
      if (statusRef.current === "track-dead" && track.readyState === "live") {
        statusRef.current = "ok";
        setStatus("ok");
        lastSignalAtRef.current = Date.now();
      }
    };

    // État initial.
    if (track.muted || track.readyState !== "live") {
      setTrackDead(track.muted ? "track_muted_initial" : "track_not_live_initial");
    }
    track.addEventListener("mute", handleMute);
    track.addEventListener("unmute", handleUnmute);
    track.addEventListener("ended", handleEnded);
    return () => {
      track.removeEventListener("mute", handleMute);
      track.removeEventListener("unmute", handleUnmute);
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
      return;
    }
    if (stream.getAudioTracks().length === 0) return;

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
        setPeak(rms);
        const now = Date.now();
        if (rms > rmsSilenceMax) {
          lastSignalAtRef.current = now;
          if (statusRef.current === "silent") {
            statusRef.current = "ok";
            setStatus("ok");
            logger.warn("mic_health_recovered_from_silent", { sessionId });
          }
        } else if (statusRef.current === "ok") {
          const silentFor = now - lastSignalAtRef.current;
          if (silentFor > silentThresholdMs) {
            statusRef.current = "silent";
            transitionAtRef.current.silent = now;
            setStatus("silent");
            logger.warn("mic_health_silent", { sessionId, silentMs: silentFor });
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
  }, [stream, active, sessionId, silentThresholdMs, rmsSilenceMax]);

  return { status, lastSpokeAt: lastSignalAtRef.current, peak };
}
