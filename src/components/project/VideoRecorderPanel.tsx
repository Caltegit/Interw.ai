import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Square, X, Video } from "lucide-react";
import { MicLevelMeter } from "./MicLevelMeter";

interface VideoRecorderPanelProps {
  onComplete: (data: { blob: Blob; previewUrl: string }) => void;
  onCancel: () => void;
}

type Phase = "preview" | "countdown" | "recording";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

/**
 * Panneau d'enregistrement vidéo avec aperçu en miroir, compte à rebours
 * et chronomètre. Le flux caméra démarre dès le montage (phase "preview").
 */
export function VideoRecorderPanel({ onComplete, onCancel }: VideoRecorderPanelProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("preview");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  // Démarre la caméra à l'ouverture
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible d'accéder à la caméra ou au micro.",
          variant: "destructive",
        });
        onCancel();
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attache le flux à l'élément vidéo
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  const handleStart = () => {
    if (!stream) return;
    setPhase("countdown");
    setCountdown(3);
    countdownRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) window.clearInterval(countdownRef.current);
          beginRecording();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const beginRecording = () => {
    if (!stream || cancelledRef.current) return;
    try {
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const previewUrl = URL.createObjectURL(blob);
        // Coupe la caméra avant de remonter le résultat
        stream.getTracks().forEach((t) => t.stop());
        if (!cancelledRef.current) {
          onComplete({ blob, previewUrl });
        }
      };

      recorder.start(500);
      setPhase("recording");
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch {
      toast({ title: "Erreur", description: "Impossible de démarrer l'enregistrement.", variant: "destructive" });
      onCancel();
    }
  };

  const handleStop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    stream?.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-black aspect-video">
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          className="h-full w-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
            <span className="text-7xl font-bold text-foreground drop-shadow-lg">{countdown}</span>
          </div>
        )}

        {phase === "recording" && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            <span className="text-destructive">Enregistrement</span>
            <span className="tabular-nums text-muted-foreground">{formatTime(elapsed)}</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-background/80 to-transparent px-3 py-2">
          <MicLevelMeter stream={stream} />
        </div>
      </div>

      {phase === "preview" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Cadrez-vous, vérifiez la lumière puis lancez l'enregistrement.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={handleStart} disabled={!stream}>
              <Video className="mr-1 h-4 w-4" /> Démarrer l'enregistrement
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              <X className="mr-1 h-4 w-4" /> Annuler
            </Button>
          </div>
        </div>
      )}

      {phase === "recording" && (
        <Button type="button" variant="destructive" size="sm" onClick={handleStop}>
          <Square className="mr-1 h-4 w-4" /> Arrêter
        </Button>
      )}
    </div>
  );
}
