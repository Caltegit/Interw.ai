import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

interface MicVolumeMeterProps {
  stream: MediaStream | null;
  active: boolean;
}

/**
 * Petit vu-mètre temps réel basé sur l'AnalyserNode de la WebAudio API.
 * Affiche 12 barres qui s'illuminent selon le volume capté par le micro,
 * pour indiquer au candidat qu'il parle assez fort.
 */
export default function MicVolumeMeter({ stream, active }: MicVolumeMeterProps) {
  const [level, setLevel] = useState(0); // 0 → 1
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !active) {
      setLevel(0);
      return;
    }

    // Vérifie qu'il y a au moins une piste audio
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let cancelled = false;
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const buffer = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (cancelled || !analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buffer);
        // RMS sur signal centré autour de 128
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        // Boost visuel : la voix typique RMS ~ 0.05–0.2
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
      try {
        sourceRef.current?.disconnect();
      } catch {
        /* noop */
      }
      try {
        audioCtxRef.current?.close();
      } catch {
        /* noop */
      }
      sourceRef.current = null;
      analyserRef.current = null;
      audioCtxRef.current = null;
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
          const color = isOn
            ? isHigh
              ? "bg-success"
              : isMid
              ? "bg-primary"
              : "bg-primary/70"
            : "bg-muted-foreground/20";
          // Hauteur progressive
          const h = 8 + (i / bars) * 32; // 8px → 40px
          return (
            <span
              key={i}
              className={`w-[6px] rounded-sm transition-colors ${color}`}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}
