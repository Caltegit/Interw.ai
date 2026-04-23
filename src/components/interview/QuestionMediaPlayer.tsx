import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Play, Pause, FileText, Mic, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QuestionMediaPlayerHandle {
  play: () => void;
  stop: () => void;
  restart: () => void;
  /** Précharge le média (sans lecture) jusqu'à canplaythrough. Résout true si prêt. */
  prepare: () => Promise<boolean>;
}

interface QuestionMediaPlayerProps {
  type: "written" | "audio" | "video";
  content: string;
  audioUrl?: string | null;
  videoUrl?: string | null;
  variant: "featured" | "inline";
  autoPlay?: boolean;
  onPlaybackEnd?: () => void;
}

const QuestionMediaPlayer = forwardRef<QuestionMediaPlayerHandle, QuestionMediaPlayerProps>(({
  type,
  content,
  audioUrl,
  videoUrl,
  variant,
  autoPlay = false,
  onPlaybackEnd,
}, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number>();
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canplayWaitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True dès que l'élément a réellement émis « playing » au moins une fois.
  const hasEverPlayedRef = useRef(false);

  const STALL_TIMEOUT_MS = 20000; // 20 s — laisse le temps au mobile de bufferiser
  const CANPLAY_TIMEOUT_MS = 10000; // 10 s — attente de canplaythrough avant lecture

  const getEl = () => type === "video" ? videoPlayerRef.current : audioRef.current;

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      if (canplayWaitRef.current) clearTimeout(canplayWaitRef.current);
    };
  }, []);

  const updateProgress = () => {
    const el = getEl();
    if (el) {
      setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
      if (!el.paused) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    }
  };

  // Watchdog : si le média ne progresse plus assez longtemps, on bascule en
  // « manual play ». Important : on ne déclare jamais la lecture « terminée »
  // par stall — on laisse le parent décider.
  const armStallTimer = () => {
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = setTimeout(() => {
      console.warn("[QuestionMediaPlayer] media stalled — showing manual play");
      setIsBuffering(false);
      // Si on n'a JAMAIS joué, on propose un bouton manuel et on n'appelle pas onPlaybackEnd.
      // Si on a déjà joué (lecture interrompue), idem : le parent décidera via son propre watchdog.
      setNeedsManualPlay(true);
    }, STALL_TIMEOUT_MS);
  };
  const clearStallTimer = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  const startPlayback = () => {
    const el = getEl();
    if (!el) return;
    setNeedsManualPlay(false);
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => {
        console.warn("[QuestionMediaPlayer] play() rejected", err);
        setIsBuffering(false);
        setNeedsManualPlay(true);
      });
    }
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const doPlay = () => {
    const el = getEl();
    if (!el) return;

    // Si déjà prêt à lire jusqu'au bout, on démarre immédiatement
    if (el.readyState >= 4) {
      setIsBuffering(false);
      startPlayback();
      armStallTimer();
      return;
    }

    // Sinon on attend canplaythrough (avec garde de 10s) — plus sûr que canplay
    // car le navigateur estime pouvoir lire jusqu'à la fin sans rebuffering.
    setIsBuffering(true);
    if (canplayWaitRef.current) clearTimeout(canplayWaitRef.current);

    const onReady = () => {
      if (canplayWaitRef.current) clearTimeout(canplayWaitRef.current);
      el.removeEventListener("canplaythrough", onReady);
      el.removeEventListener("canplay", onReady);
      setIsBuffering(false);
      startPlayback();
      armStallTimer();
    };
    el.addEventListener("canplaythrough", onReady);
    // Filet de sécurité : sur certains navigateurs canplaythrough n'arrive jamais.
    el.addEventListener("canplay", onReady);

    canplayWaitRef.current = setTimeout(() => {
      el.removeEventListener("canplaythrough", onReady);
      el.removeEventListener("canplay", onReady);
      console.warn("[QuestionMediaPlayer] canplaythrough timeout — showing manual play");
      setIsBuffering(false);
      setNeedsManualPlay(true);
    }, CANPLAY_TIMEOUT_MS);

    // Force le chargement
    try { el.load(); } catch {}
  };

  /** Précharge le média jusqu'à canplaythrough sans déclencher la lecture. */
  const prepareMedia = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const el = getEl();
      if (!el) {
        resolve(false);
        return;
      }
      if (el.readyState >= 4) {
        resolve(true);
        return;
      }
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        el.removeEventListener("canplaythrough", onReady);
        el.removeEventListener("canplay", onReady);
        clearTimeout(timer);
        resolve(ok);
      };
      const onReady = () => finish(true);
      el.addEventListener("canplaythrough", onReady);
      el.addEventListener("canplay", onReady);
      const timer = setTimeout(() => finish(false), CANPLAY_TIMEOUT_MS);
      try { el.load(); } catch {}
    });
  };

  const handleMediaError = (e: any) => {
    console.warn("[QuestionMediaPlayer] media error", e);
    clearStallTimer();
    if (canplayWaitRef.current) clearTimeout(canplayWaitRef.current);
    setIsBuffering(false);
    setIsPlaying(false);
    setNeedsManualPlay(true);
  };

  const doPause = () => {
    const el = getEl();
    if (!el) return;
    el.pause();
    setIsPlaying(false);
  };

  const doStop = () => {
    const el = getEl();
    clearStallTimer();
    if (canplayWaitRef.current) clearTimeout(canplayWaitRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
    }
    hasEverPlayedRef.current = false;
    setIsPlaying(false);
    setProgress(0);
    setHasFinished(false);
    setIsBuffering(false);
    setNeedsManualPlay(false);
  };

  const doRestart = () => {
    const el = getEl();
    if (!el) return;
    try { el.currentTime = 0; } catch {}
    setProgress(0);
    setHasFinished(false);
    doPlay();
  };

  const togglePlay = () => {
    const el = getEl();
    if (!el) return;
    if (el.paused) doPlay();
    else doPause();
  };

  const handleEnded = () => {
    clearStallTimer();
    setIsPlaying(false);
    setProgress(100);
    setHasFinished(true);
    onPlaybackEnd?.();
  };

  const handleLoadedMetadata = (el: HTMLAudioElement | HTMLVideoElement) => {
    setDuration(el.duration);
  };

  const handleWaiting = () => {
    setIsBuffering(true);
    armStallTimer();
  };
  const handlePlaying = () => {
    hasEverPlayedRef.current = true;
    setIsBuffering(false);
    clearStallTimer();
  };
  const handleProgress = () => {
    // Tant que le buffer se remplit, on réarme le watchdog
    armStallTimer();
  };

  // Expose play/stop/restart/prepare via ref
  useImperativeHandle(ref, () => ({
    play: () => doPlay(),
    stop: () => doStop(),
    restart: () => doRestart(),
    prepare: () => prepareMedia(),
  }));

  // Auto-play + reset finished state when media changes
  useEffect(() => {
    setHasFinished(false);
    setProgress(0);
    setNeedsManualPlay(false);
    hasEverPlayedRef.current = false;
    if (autoPlay && type !== "written") {
      const timer = setTimeout(() => doPlay(), 200);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, type, audioUrl, videoUrl]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ─── FEATURED variant ───
  if (variant === "featured") {
    // VIDEO featured
    if (type === "video" && videoUrl) {
      return (
        <div className="w-full">
          <div className="relative w-full overflow-hidden bg-black aspect-video rounded-2xl border border-border/40 shadow-xl">
            <video
              ref={videoPlayerRef}
              src={videoUrl}
              onEnded={handleEnded}
              onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
              onError={handleMediaError}
              onStalled={handleWaiting}
              onWaiting={handleWaiting}
              onPlaying={handlePlaying}
              onProgress={handleProgress}
              className="w-full h-full object-cover"
              preload="auto"
              playsInline
            />
            {isBuffering && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Loader2 className="h-8 w-8 text-white/80 animate-spin" />
                <span className="text-xs text-white/80">Chargement…</span>
              </div>
            )}
            {needsManualPlay && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Button onClick={doPlay} size="lg" className="gap-2">
                  <Play className="h-5 w-5" />
                  Lire la question
                </Button>
              </div>
            )}
            {hasFinished && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                <span className="text-xs text-white/70 uppercase tracking-wide">Lecture terminée</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full candidate-progress-fill rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 sm:p-6">
        {type === "written" && (
          <div className="border-l-2 pl-4" style={{ borderColor: "hsl(var(--l-accent) / 0.5)" }}>
            <p className="text-base sm:text-lg md:text-xl font-medium leading-relaxed">{content}</p>
          </div>
        )}

        {type === "audio" && audioUrl && (
          <div className="space-y-3">
            <div className="border-l-2 pl-4" style={{ borderColor: "hsl(var(--l-accent) / 0.5)" }}>
              <p className="text-base sm:text-lg italic mb-2 opacity-90">{content}</p>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleEnded}
              onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
              onError={handleMediaError}
              onStalled={handleWaiting}
              onWaiting={handleWaiting}
              onPlaying={handlePlaying}
              onProgress={handleProgress}
              preload="auto"
            />
            <div className="flex items-center gap-3">
              {needsManualPlay ? (
                <Button onClick={doPlay} size="sm" className="gap-2">
                  <Play className="h-4 w-4" />
                  Lire la question
                </Button>
              ) : isBuffering ? (
                <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !hasFinished ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  style={{ background: "hsl(var(--l-accent) / 0.15)" }}
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" style={{ color: "hsl(var(--l-accent))" }} />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" style={{ color: "hsl(var(--l-accent))" }} />
                  )}
                </Button>
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full candidate-progress-fill rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {isBuffering ? (
                  <span className="text-[10px] text-muted-foreground mt-1 block">Chargement audio…</span>
                ) : duration > 0 ? (
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {hasFinished
                      ? "Lecture terminée"
                      : `${formatTime((progress / 100) * duration)} / ${formatTime(duration)}`}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── INLINE variant ───
  return (
    <div>
      {type === "written" && (
        <div className="flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs sm:text-sm">{content}</p>
        </div>
      )}

      {type === "audio" && audioUrl && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <Mic className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm text-muted-foreground italic">{content}</p>
          </div>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleEnded}
            onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
            preload="metadata"
          />
          <div className="flex items-center gap-2 ml-5">
            {!hasFinished ? (
              <button
                className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center hover:bg-amber-500/20 transition-colors"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3 text-amber-400" />
                ) : (
                  <Play className="h-3 w-3 text-amber-400 ml-px" />
                )}
              </button>
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted/40 flex items-center justify-center">
                <Mic className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[120px]">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            {duration > 0 && (
              <span className="text-[9px] text-muted-foreground">{hasFinished ? "terminé" : formatTime(duration)}</span>
            )}
          </div>
        </div>
      )}

      {type === "video" && videoUrl && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <Video className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs sm:text-sm text-muted-foreground italic">{content}</p>
          </div>
          <div className="ml-5 relative rounded-md overflow-hidden bg-black aspect-video max-w-[180px]">
            <video
              ref={videoPlayerRef}
              src={videoUrl}
              onEnded={handleEnded}
              onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
              className="w-full h-full object-cover"
              preload="metadata"
              playsInline
            />
            {!isPlaying && !hasFinished && (
              <button
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40"
                onClick={togglePlay}
              >
                <div className="h-7 w-7 rounded-full bg-emerald-500/80 flex items-center justify-center">
                  <Play className="h-3.5 w-3.5 text-white ml-px" />
                </div>
              </button>
            )}
            {isPlaying && (
              <button className="absolute inset-0" onClick={togglePlay} />
            )}
            {hasFinished && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                <span className="text-[9px] text-white/70 uppercase tracking-wide">Terminé</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

QuestionMediaPlayer.displayName = "QuestionMediaPlayer";
export default QuestionMediaPlayer;
