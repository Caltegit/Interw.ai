import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Play, Pause, RotateCcw, FileText, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QuestionMediaPlayerHandle {
  play: () => void;
  stop: () => void;
  restart: () => void;
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

const typeConfig = {
  written: { icon: FileText, label: "Texte", color: "text-blue-400" },
  audio: { icon: Mic, label: "Audio", color: "text-amber-400" },
  video: { icon: Video, label: "Vidéo", color: "text-emerald-400" },
};

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number>();
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { icon: Icon, label, color } = typeConfig[type];

  const getEl = () => type === "video" ? videoPlayerRef.current : audioRef.current;

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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

  const doPlay = () => {
    const el = getEl();
    if (!el) return;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => {
        console.warn("[QuestionMediaPlayer] play() rejected — falling back to onPlaybackEnd", err);
        // Autoplay blocked or other failure → unblock parent flow
        setTimeout(() => onPlaybackEnd?.(), 300);
      });
    }
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  // Fallback: if media stalls/suspends for too long, force the end event
  const armStallTimer = () => {
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    stallTimerRef.current = setTimeout(() => {
      console.warn("[QuestionMediaPlayer] media stalled — forcing onPlaybackEnd");
      onPlaybackEnd?.();
    }, 5000);
  };
  const clearStallTimer = () => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  const handleMediaError = (e: any) => {
    console.warn("[QuestionMediaPlayer] media error — forcing onPlaybackEnd", e);
    clearStallTimer();
    setIsPlaying(false);
    setHasFinished(true);
    onPlaybackEnd?.();
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
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
    }
    setIsPlaying(false);
    setProgress(0);
    setHasFinished(false);
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

  const restart = () => doRestart();

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    setHasFinished(true);
    onPlaybackEnd?.();
  };

  const handleLoadedMetadata = (el: HTMLAudioElement | HTMLVideoElement) => {
    setDuration(el.duration);
  };

  // Expose play/stop/restart via ref
  useImperativeHandle(ref, () => ({
    play: () => doPlay(),
    stop: () => doStop(),
    restart: () => doRestart(),
  }));

  // Auto-play + reset finished state when media changes
  useEffect(() => {
    setHasFinished(false);
    setProgress(0);
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
    // VIDEO featured: just the video, no wrapper/badge/description
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
              onStalled={armStallTimer}
              onSuspend={armStallTimer}
              onPlaying={clearStallTimer}
              onWaiting={armStallTimer}
              className="w-full h-full object-cover"
              preload="metadata"
            />
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
              onStalled={armStallTimer}
              onSuspend={armStallTimer}
              onPlaying={clearStallTimer}
              preload="metadata"
            />
            <div className="flex items-center gap-3">
              {!hasFinished ? (
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
                {duration > 0 && (
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {hasFinished
                      ? "Lecture terminée"
                      : `${formatTime((progress / 100) * duration)} / ${formatTime(duration)}`}
                  </span>
                )}
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
