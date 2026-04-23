import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Mic, Video, Square, Play, Pause, Upload, RotateCcw, Trash2 } from "lucide-react";
import { MicLevelMeter } from "@/components/project/MicLevelMeter";

interface MediaRecorderFieldProps {
  type: "audio" | "video";
  /** URL existante (déjà uploadée) ou blob:URL en cours d'édition. */
  existingUrl: string | null;
  /** Appelé quand un nouveau blob est prêt (enregistré ou uploadé). */
  onMediaReady: (blob: Blob, previewUrl: string) => void;
  /** Appelé quand l'utilisateur supprime le média. */
  onClear?: () => void;
  /** Durée max en secondes (défaut 180). */
  maxDurationSec?: number;
  /** Libellé optionnel affiché au-dessus du champ. */
  label?: string;
  /** Description optionnelle affichée sous le libellé. */
  description?: string;
}

const ACCEPT_AUDIO = "audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/x-m4a,.mp3,.m4a,.wav,.webm";
const ACCEPT_VIDEO = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Composant unique d'enregistrement audio/vidéo utilisé partout dans l'app.
 * - Démarrage immédiat (pas de compte à rebours)
 * - Bouton « Arrêter » toujours visible (pleine largeur sur mobile)
 * - Aperçu miroir vidéo + jauge micro pendant l'enregistrement
 * - Chronomètre + barre de progression jusqu'à maxDurationSec
 * - Re-prise, lecture inline, import de fichier, suppression
 */
export function MediaRecorderField({
  type,
  existingUrl,
  onMediaReady,
  onClear,
  maxDurationSec = 180,
  label,
  description,
}: MediaRecorderFieldProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setPreviewUrl(existingUrl);
  }, [existingUrl]);

  // Branche le flux à l'élément vidéo en preview
  useEffect(() => {
    if (recording && type === "video" && previewVideoRef.current && streamRef.current) {
      previewVideoRef.current.srcObject = streamRef.current;
      previewVideoRef.current.play().catch(() => {});
    }
  }, [recording, type]);

  // Cleanup au démontage : timer + tracks
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopAllTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiveStream(null);
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
  };

  const startRecording = async () => {
    try {
      const constraints = type === "audio" ? { audio: true } : { audio: true, video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setActiveStream(stream);

      const mimeType = type === "audio" ? "audio/webm" : "video/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stopAllTracks();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onMediaReady(blob, url);
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
      };

      setElapsed(0);
      mr.start(500);
      setRecording(true);
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const e = (Date.now() - startedAt) / 1000;
        setElapsed(e);
        if (e >= maxDurationSec) stopRecording();
      }, 250);
    } catch {
      toast({
        title: "Accès refusé",
        description:
          type === "audio" ? "Impossible d'accéder au micro." : "Impossible d'accéder à la caméra.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      } else {
        // Fallback : si onstop n'est jamais appelé, coupe quand même les tracks
        stopAllTracks();
      }
    } catch {
      stopAllTracks();
    }
  };

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onMediaReady(file, url);
  };

  const clearMedia = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDuration(0);
    setPlaying(false);
    onClear?.();
  };

  const togglePlay = async () => {
    const el = type === "audio" ? audioRef.current : playbackVideoRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      await el.play();
      setPlaying(true);
    }
  };

  const progress = Math.min(100, (elapsed / maxDurationSec) * 100);

  // --- En-tête optionnel ---
  const Header = label ? (
    <div className="space-y-1">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  ) : null;

  // --- Phase enregistrement ---
  if (recording) {
    return (
      <div className="space-y-3">
        {Header}
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          {type === "video" && (
            <video
              ref={previewVideoRef}
              muted
              autoPlay
              playsInline
              className="w-full max-w-md rounded-md border bg-black aspect-video object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 text-xs font-medium text-destructive">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Enregistrement
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTime(elapsed)} / {formatTime(maxDurationSec)}
            </span>
            <MicLevelMeter stream={activeStream} segments={6} className="ml-auto" />
          </div>

          <Progress value={progress} className="h-1.5" />

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="w-full sm:w-auto"
          >
            <Square className="mr-1 h-3 w-3" /> Arrêter
          </Button>
        </div>
      </div>
    );
  }

  // --- Phase preview du résultat ---
  if (previewUrl) {
    return (
      <div className="space-y-3">
        {Header}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          {type === "audio" ? (
            <audio
              ref={audioRef}
              src={previewUrl}
              preload="metadata"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          ) : (
            <video
              ref={playbackVideoRef}
              src={previewUrl}
              preload="metadata"
              playsInline
              controls
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onEnded={() => setPlaying(false)}
              className="w-full max-w-md rounded-md border aspect-video bg-black"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium">
              {type === "audio" ? <Mic className="h-3 w-3" /> : <Video className="h-3 w-3" />}
              {type === "audio" ? "Audio" : "Vidéo"}
              {duration > 0 && (
                <span className="text-muted-foreground"> · {formatTime(duration)}</span>
              )}
            </span>

            {type === "audio" && (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={togglePlay}>
                {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={startRecording}
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Refaire
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 h-3 w-3" /> Importer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={clearMedia}
            >
              <Trash2 className="mr-1 h-3 w-3" /> Supprimer
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={type === "audio" ? ACCEPT_AUDIO : ACCEPT_VIDEO}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    );
  }

  // --- Phase vide ---
  return (
    <div className="space-y-3">
      {Header}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed bg-muted/20 p-3">
        <Button type="button" variant="default" size="sm" onClick={startRecording}>
          {type === "audio" ? (
            <>
              <Mic className="mr-1 h-3 w-3" /> Enregistrer
            </>
          ) : (
            <>
              <Video className="mr-1 h-3 w-3" /> Enregistrer
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">ou</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1 h-3 w-3" /> Importer un fichier
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={type === "audio" ? ACCEPT_AUDIO : ACCEPT_VIDEO}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
