import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { ensureAudioContextRunning, getSharedAudioContext } from "@/lib/audioContext";

interface MicVolumeMeterProps {
  stream: MediaStream | null;
  active: boolean;
}

/**
 * Petit vu-mètre temps réel basé sur l'AnalyserNode de la WebAudio API.
 * Affiche 16 barres qui s'illuminent selon le volume capté par le micro,
 * pour indiquer au candidat qu'il parle assez fort.
 *
 * Utilise l'AudioContext partagé (singleton) : sur iOS Safari, cela évite
 * le vu-mètre figé à 0 quand le contexte reste suspended hors geste utilisateur.
 */
export default function MicVolumeMeter({ stream, active }: MicVolumeMeterProps) {
  const [level, setLevel] = useState(0);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !active) {
      setLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let cancelled = false;
    let ownsCtx = false;
    let ctx: AudioContext | null = getSharedAudioContext();
    if (!ctx) {
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new Ctor();
        ownsCtx = true;
      } catch {
        return;
      }
    }
    try {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceRef.current = source;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      // Si toujours suspended après 500 ms (cas iOS sans geste), proposer un déverrouillage manuel.
      const ctxRef = ctx;
      setTimeout(() => {
        if (!cancelled && ctxRef.state !== "running") {
          setNeedsUnlock(true);
        }
      }, 500);

      const buffer = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (cancelled || !analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const normalized = Math.min(1, rms * 4);
        setLevel(normalized);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn("[MicVolumeMeter] init failed", err);
    }

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.disconnect(); } catch { /* noop */ }
      if (ownsCtx) {
        try { ctx?.close(); } catch { /* noop */ }
      }
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, [stream, active]);

  const bars = 16;
  const activeBars = Math.round(level * bars);

  return (
    <div className="inline-flex items-center gap-3">
      <Mic className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <div className="flex items-end gap-[4px] h-10" aria-hidden="true">
        {Array.from({ length: bars }).map((_, i) => {
          const isOn = i < activeBars;
          const isHigh = i >= bars - 4;
          const isMid = i >= bars - 9 && i < bars - 4;
          const baseClass = isOn ? "candidate-mic-bar-on" : "bg-muted-foreground/20";
          const h = 8 + (i / bars) * 32;
          return (
            <span
              key={i}
              className={`w-[6px] rounded-sm transition-all ${baseClass}`}
              style={{ height: `${h}px`, opacity: isOn ? (isHigh ? 1 : isMid ? 0.9 : 0.7) : 1 }}
            />
          );
        })}
      </div>
      {needsUnlock && (
        <button
          type="button"
          onClick={async () => {
            const ok = await ensureAudioContextRunning();
            if (ok) setNeedsUnlock(false);
          }}
          className="text-xs underline text-muted-foreground hover:text-foreground"
        >
          Activer le vu-mètre
        </button>
      )}
    </div>
  );
}
