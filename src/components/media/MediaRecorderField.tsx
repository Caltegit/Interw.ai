import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Mic,
  Video,
  Square,
  Play,
  Pause,
  Upload,
  RotateCcw,
  Trash2,
  Circle,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { MicLevelMeter } from "@/components/project/MicLevelMeter";
import { useCurrentOrgLogo } from "@/hooks/useCurrentOrgLogo";
import { VideoComposer, isBlurSupported } from "@/lib/videoComposer";

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

const PREFS_KEY = "media-recorder-prefs:v1";
const DEFAULT_BLUR = 12;
const MIN_BLUR = 4;
const MAX_BLUR = 24;

interface RecorderPrefs {
  blur: boolean;
  logo: boolean;
  blurAmount: number;
}

function loadPrefs(): RecorderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { blur: false, logo: false, blurAmount: DEFAULT_BLUR };
    const p = JSON.parse(raw);
    const amount = typeof p.blurAmount === "number" ? p.blurAmount : DEFAULT_BLUR;
    return {
      blur: !!p.blur,
      logo: !!p.logo,
      blurAmount: Math.min(MAX_BLUR, Math.max(MIN_BLUR, amount)),
    };
  } catch {
    return { blur: false, logo: false, blurAmount: DEFAULT_BLUR };
  }
}

function savePrefs(p: RecorderPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

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
  const orgLogoUrl = useCurrentOrgLogo();
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl);
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const initialPrefs = loadPrefs();
  const [blurEnabled, setBlurEnabled] = useState(initialPrefs.blur);
  const [logoEnabled, setLogoEnabled] = useState(initialPrefs.logo);
  const [blurAmount, setBlurAmount] = useState(initialPrefs.blurAmount);
  const blurSupported = useState(() => (type === "video" ? isBlurSupported() : true))[0];

  const composerActive = type === "video" && (blurEnabled || logoEnabled);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<VideoComposer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setPreviewUrl(existingUrl);
  }, [existingUrl]);

  useEffect(() => {
    savePrefs({ blur: blurEnabled, logo: logoEnabled, blurAmount });
  }, [blurEnabled, logoEnabled, blurAmount]);

  const destroyComposer = useCallback(() => {
    if (composerRef.current) {
      composerRef.current.destroy();
      composerRef.current = null;
    }
    if (canvasContainerRef.current) {
      canvasContainerRef.current.innerHTML = "";
    }
  }, []);

  const stopAllTracks = useCallback(() => {
    destroyComposer();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiveStream(null);
    setCameraReady(false);
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
  }, [destroyComposer]);

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

  // Branche le flux brut à l'élément vidéo quand le composer n'est pas actif
  useEffect(() => {
    if (type !== "video" || !streamRef.current) return;
    if (!composerActive && previewVideoRef.current) {
      previewVideoRef.current.srcObject = streamRef.current;
      previewVideoRef.current.play().catch(() => {});
    }
  }, [recording, type, cameraReady, previewUrl, composerActive]);

  // Création / destruction du composer selon les toggles
  useEffect(() => {
    if (type !== "video" || !streamRef.current || !cameraReady) return;

    if (composerActive && !composerRef.current) {
      const comp = new VideoComposer(streamRef.current, {
        blurBackground: blurEnabled,
        showLogo: logoEnabled,
        mirrorPreview: true,
        blurPx: blurAmount,
      });
      composerRef.current = comp;
      void comp.init(logoEnabled ? orgLogoUrl : null).then(() => {
        if (composerRef.current !== comp) return;
        if (canvasContainerRef.current) {
          canvasContainerRef.current.innerHTML = "";
          const canvas = comp.getPreviewCanvas();
          canvas.className = "w-full h-full object-cover";
          canvasContainerRef.current.appendChild(canvas);
        }
      });
    } else if (!composerActive && composerRef.current) {
      destroyComposer();
    } else if (composerRef.current) {
      composerRef.current.setOptions({
        blurBackground: blurEnabled,
        showLogo: logoEnabled,
        blurPx: blurAmount,
      });
      void composerRef.current.setLogoUrl(logoEnabled ? orgLogoUrl : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composerActive, blurEnabled, logoEnabled, blurAmount, cameraReady, orgLogoUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      destroyComposer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [destroyComposer]);

  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        const constraints = type === "audio" ? { audio: true } : { audio: true, video: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setActiveStream(stream);
        setCameraReady(true);
        if (type === "video" && previewVideoRef.current && !composerActive) {
          previewVideoRef.current.srcObject = stream;
          previewVideoRef.current.play().catch(() => {});
        }
      }

      // Sélectionne le stream à enregistrer (composite si options actives)
      let recordStream: MediaStream = streamRef.current!;
      if (type === "video" && composerActive) {
        // Attend l'initialisation du composer si besoin
        if (!composerRef.current) {
          const comp = new VideoComposer(streamRef.current!, {
            blurBackground: blurEnabled,
            showLogo: logoEnabled,
            mirrorPreview: true,
          });
          composerRef.current = comp;
          await comp.init(logoEnabled ? orgLogoUrl : null);
          if (canvasContainerRef.current) {
            canvasContainerRef.current.innerHTML = "";
            const canvas = comp.getPreviewCanvas();
            canvas.className = "w-full h-full object-cover";
            canvasContainerRef.current.appendChild(canvas);
          }
        }
        recordStream = composerRef.current!.getOutputStream();
      }

      const mimeType = type === "audio" ? "audio/webm" : "video/webm";
      const mr = new MediaRecorder(recordStream, { mimeType });
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
  }, [type, maxDurationSec, onMediaReady, stopAllTracks, toast, composerActive, blurEnabled, logoEnabled, orgLogoUrl]);

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

  const VideoOptions = type === "video" && !previewUrl ? (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border bg-background/60 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <Label htmlFor="blur-toggle" className="cursor-pointer text-xs font-normal">
          Flouter l'arrière-plan
        </Label>
        <Switch
          id="blur-toggle"
          checked={blurEnabled}
          disabled={!blurSupported}
          onCheckedChange={(v) => {
            if (!blurSupported && v) {
              toast({
                title: "Non supporté",
                description: "Votre navigateur ne supporte pas le flou en temps réel.",
                variant: "destructive",
              });
              return;
            }
            setBlurEnabled(v);
          }}
        />
        {!blurSupported && (
          <span className="text-[10px] text-muted-foreground">(non supporté)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <Label htmlFor="logo-toggle" className="cursor-pointer text-xs font-normal">
          Afficher mon logo
        </Label>
        <Switch
          id="logo-toggle"
          checked={logoEnabled && !!orgLogoUrl}
          disabled={!orgLogoUrl}
          onCheckedChange={(v) => setLogoEnabled(v)}
        />
        {!orgLogoUrl && (
          <a href="/settings" className="text-[10px] text-primary hover:underline">
            Ajouter un logo
          </a>
        )}
      </div>
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
              {/* Aperçu brut (caché si composer actif) */}
              <video
                ref={previewVideoRef}
                muted
                autoPlay
                playsInline
                className="w-full rounded-md border bg-black aspect-video object-cover"
                style={{
                  transform: "scaleX(-1)",
                  display: composerActive ? "none" : "block",
                }}
              />
              {/* Aperçu composé (canvas injecté) */}
              <div
                ref={canvasContainerRef}
                className="w-full rounded-md border bg-black aspect-video overflow-hidden"
                style={{ display: composerActive ? "block" : "none" }}
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

          {VideoOptions}

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
