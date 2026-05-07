import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Mic, Video, Square, Play, Pause, Upload, RotateCcw, Trash2, Circle } from "lucide-react";
import { MicLevelMeter } from "@/components/project/MicLevelMeter";

interface MediaRecorderFieldProps {
  type: "audio" | "video";
  existingUrl: string | null;
  onMediaReady: (blob: Blob, previewUrl: string) => void;
  onClear?: () => void;
  maxDurationSec?: number;
  label?: string;
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
  const [cameraReady, setCameraReady] = useState(false);

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

  const stopAllTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiveStream(null);
    setCameraReady(false);
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
  }, []);

  const initCamera = useCallback(async () => {
    if (type !== "video" || streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      setActiveStream(stream);
      setCameraReady(true);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(() => {});
      }
    } catch {
      toast({
        title: "Accès refusé",
        description: "Impossible d'accéder à la caméra.",
        variant: "destructive",
      });
    }
  }, [type, toast]);

  // Démarre la caméra dès l'affichage de la phase preview/vide pour la vidéo
  useEffect(() => {
    if (type === "video" && !previewUrl && !recording && !streamRef.current) {
      void initCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, previewUrl, recording]);

  // Branche le flux à l'élément vidéo si nécessaire
  useEffect(() => {
    if (type === "video" && previewVideoRef.current && streamRef.current) {
      previewVideoRef.current.srcObject = streamRef.current;
      previewVideoRef.current.play().catch(() => {});
    }
  }, [recording, type, cameraReady, previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        const constraints = type === "audio" ? { audio: true } : { audio: true, video: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setActiveStream(stream);
        setCameraReady(true);
        if (type === "video" && previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
          previewVideoRef.current.play().catch(() => {});
        }
      }

      const stream = streamRef.current!;
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
        mediaRecorderRef.current = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, maxDurationSec, onMediaReady, stopAllTracks, toast]);

  const stopRecording = useCallback(() => {
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      } else {
        stopAllTracks();
      }
    } catch {
      stopAllTracks();
    }
  }, [stopAllTracks]);

  // Raccourci clavier : barre d'espace pour démarrer/arrêter (vidéo uniquement, hors champ saisie)
  useEffect(() => {
    if (type !== "video" || previewUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      e.preventDefault();
      if (recording) stopRecording();
      else void startRecording();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type, previewUrl, recording, startRecording, stopRecording]);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onMediaReady(file, url);
  };

  const clearMedia = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch { /* noop */ }
      audioRef.current.removeAttribute("src");
      audioRef.current.load?.();
    }
    if (playbackVideoRef.current) {
      try { playbackVideoRef.current.pause(); } catch { /* noop */ }
      playbackVideoRef.current.removeAttribute("src");
      playbackVideoRef.current.load?.();
    }
    setPreviewUrl(null);
    setDuration(0);
    setPlaying(false);
    onClear?.();
  };

  const retake = () => {
    clearMedia();
    // Pour la vidéo, on revient en preview caméra (l'effet relance initCamera).
    // Pour l'audio, on lance directement l'enregistrement.
    if (type === "audio") void startRecording();
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

  const Header = label ? (
    <div className="space-y-1">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  ) : null;

  // --- Phase preview caméra + enregistrement (vidéo) ---
  if (type === "video" && !previewUrl) {
    const containerTone = recording ? "border-destructive/30 bg-destructive/5" : "border bg-muted/30";
    return (
      <div className="space-y-3">
        {Header}
        <div className={`space-y-3 rounded-lg p-3 ${containerTone}`}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <video
                ref={previewVideoRef}
                muted
                autoPlay
                playsInline
                className="w-full rounded-md border bg-black aspect-video object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md text-xs text-white/80">
                  Activation de la caméra…
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch justify-center gap-2 sm:w-44">
              {recording ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  onClick={stopRecording}
                  className="h-14"
                >
                  <Square className="mr-2 h-5 w-5 fill-current" /> Arrêter
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => void startRecording()}
                  disabled={!cameraReady}
                  className="h-14 bg-success text-success-foreground hover:bg-success/90"
                >
                  <Circle className="mr-2 h-5 w-5 fill-current" /> Démarrer
                </Button>
              )}
              <p className="text-center text-[11px] leading-tight text-muted-foreground">
                Astuce : barre d'espace pour démarrer / arrêter
              </p>
            </div>
          </div>

          {recording && (
            <>
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
            </>
          )}

          {!recording && (
            <div className="flex flex-wrap items-center gap-2">
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
                accept={ACCEPT_VIDEO}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Phase enregistrement audio ---
  if (recording) {
    return (
      <div className="space-y-3">
        {Header}
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
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
              onClick={retake}
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

  // --- Phase vide (audio uniquement) ---
  return (
    <div className="space-y-3">
      {Header}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed bg-muted/20 p-3">
        <Button type="button" variant="default" size="sm" onClick={() => void startRecording()}>
          <Mic className="mr-1 h-3 w-3" /> Enregistrer
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
          accept={ACCEPT_AUDIO}
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
