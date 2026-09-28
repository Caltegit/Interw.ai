import { useEffect, useState, type RefObject } from "react";
import { Slider } from "@/components/ui/slider";

function formatTime(seconds: number): string {
  const total = Math.floor(Math.max(0, seconds));
  const minutes = Math.floor(total / 60);
  const hours = Math.floor(minutes / 60);
  const rest = `${total % 60}`.padStart(2, "0");
  return hours > 0
    ? `${hours}:${`${minutes % 60}`.padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

interface VideoTimelineProps {
  videoRef: RefObject<HTMLVideoElement>;
  duration: number | null;
  clipKey: string;
  compact?: boolean;
}

/** A separate, touch-friendly seek bar; native controls remain available for sound/fullscreen. */
export function VideoTimeline({ videoRef, duration, clipKey, compact = false }: VideoTimelineProps) {
  const [position, setPosition] = useState(0);
  const [draft, setDraft] = useState<number | null>(null);
  const validDuration = duration !== null && Number.isFinite(duration) && duration > 0 ? duration : null;

  useEffect(() => {
    setPosition(0);
    setDraft(null);
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setPosition(Number.isFinite(video.currentTime) ? video.currentTime : 0);
    video.addEventListener("timeupdate", sync);
    video.addEventListener("seeked", sync);
    video.addEventListener("loadedmetadata", sync);
    return () => {
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("seeked", sync);
      video.removeEventListener("loadedmetadata", sync);
    };
  }, [clipKey, videoRef]);

  const displayed = Math.min(draft ?? position, validDuration ?? 0);
  const seek = (value: number[]) => {
    const video = videoRef.current;
    if (video && validDuration !== null && Number.isFinite(value[0])) {
      const target = Math.max(0, Math.min(value[0], Math.max(0, validDuration - 0.1)));
      try {
        video.currentTime = target;
        setPosition(target);
      } catch { /* Keep playback available if the file is not seekable. */ }
    }
    setDraft(null);
  };

  return (
    <div className={compact ? "flex min-w-0 items-center gap-2 px-1" : "flex min-w-0 items-center gap-3 px-1 py-1"}>
      <Slider
        aria-label="Position dans la vidéo"
        aria-valuetext={`${formatTime(displayed)} sur ${validDuration === null ? "durée inconnue" : formatTime(validDuration)}`}
        min={0}
        max={validDuration ?? 1}
        step={0.1}
        value={[displayed]}
        onValueChange={(value) => setDraft(value[0] ?? 0)}
        onValueCommit={seek}
        disabled={validDuration === null}
        className="min-w-0 flex-1 py-2.5"
      />
      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground" aria-live="off">
        {formatTime(position)} / {validDuration === null ? "—" : formatTime(validDuration)}
      </span>
    </div>
  );
}