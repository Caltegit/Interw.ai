import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MicLevelMeterProps {
  stream: MediaStream | null;
  segments?: number;
  className?: string;
}

/**
 * Jauge de niveau micro alimentée par un AnalyserNode.
 * Affiche une barre segmentée qui s'illumine en fonction du volume capté.
 */
export function MicLevelMeter({ stream, segments = 8, className }: MicLevelMeterProps) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);

    audioCtxRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      // RMS normalisé autour de 128
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      // Mise à l'échelle pour rendre visible
      const scaled = Math.min(1, rms * 3);
      setLevel(scaled);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        /* noop */
      }
      ctx.close().catch(() => {});
      audioCtxRef.current = null;
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, [stream]);

  const activeCount = Math.round(level * segments);

  return (
    <div className={cn("flex items-center gap-1", className)} aria-label="Niveau micro">
      {Array.from({ length: segments }).map((_, i) => {
        const active = i < activeCount;
        const isHigh = i >= segments - 2;
        return (
          <span
            key={i}
            className={cn(
              "h-2 w-1.5 rounded-sm transition-colors",
              active ? (isHigh ? "bg-destructive" : "bg-primary") : "bg-muted",
            )}
          />
        );
      })}
    </div>
  );
}
