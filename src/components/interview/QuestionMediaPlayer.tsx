import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Play, Pause, RotateCcw, FileText, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QuestionMediaPlayerHandle {
  play: () => void;
  stop: () => void;
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
    el.play().catch(() => {});
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const doPause = () => {
    const el = getEl();
    if (!el) return;
    el.pause();
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const el = getEl();
    if (!el) return;
    if (el.paused) doPlay();
    else doPause();
  };

  const restart = () => {
    const el = getEl();
    if (!el) return;
    el.currentTime = 0;
    doPlay();
    setProgress(0);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    setHasFinished(true);
    onPlaybackEnd?.();
  };

  const handleLoadedMetadata = (el: HTMLAudioElement | HTMLVideoElement) => {
    setDuration(el.duration);
  };

  // Expose play/stop via ref
  useImperativeHandle(ref, () => ({
    play: () => doPlay(),
    stop: () => doPause(),
  }));

  // Auto-play when prop changes
  useEffect(() => {
    if (autoPlay && type !== "written") {
      // Small delay to ensure element is mounted
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
          <div className="relative w-full overflow-hidden bg-black aspect-video rounded-xl">
            <video
              ref={videoPlayerRef}
              src={videoUrl}
              onEnded={handleEnded}
              onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
              className="w-full h-full object-cover"
              preload="metadata"
            />
            {!isPlaying && (
              <button
                className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
                onClick={togglePlay}
              >
                <div className="h-12 w-12 rounded-full bg-emerald-500/80 flex items-center justify-center">
                  <Play className="h-6 w-6 text-white ml-0.5" />
                </div>
              </button>
            )}
            {isPlaying && (
              <button className="absolute inset-0" onClick={togglePlay} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={restart}>
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 sm:p-5">
        {/* Badge */}

        {type === "written" && (
          <div className="border-l-2 border-primary/40 pl-4">
            <p className="text-sm sm:text-base font-medium leading-relaxed">{content}</p>
          </div>
        )}

        {type === "audio" && audioUrl && (
          <div className="space-y-3">
            <div className="border-l-2 border-amber-400/40 pl-4">
              <p className="text-sm text-muted-foreground italic mb-2">{content}</p>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleEnded}
              onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
              preload="metadata"
            />
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-amber-500/10 hover:bg-amber-500/20"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-amber-400" />
                ) : (
                  <Play className="h-5 w-5 text-amber-400 ml-0.5" />
                )}
              </Button>
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {duration > 0 && (
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {formatTime((progress / 100) * duration)} / {formatTime(duration)}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={restart}>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </Button>
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
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[120px]">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            {duration > 0 && (
              <span className="text-[9px] text-muted-foreground">{formatTime(duration)}</span>
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
            {!isPlaying && (
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
          </div>
        </div>
      )}
    </div>
  );
});

QuestionMediaPlayer.displayName = "QuestionMediaPlayer";
export default QuestionMediaPlayer;
