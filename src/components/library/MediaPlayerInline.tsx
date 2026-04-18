import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Mic, Video } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MediaPlayerInlineProps {
  audioUrl: string | null;
  videoUrl: string | null;
}

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Lecteur audio compact pour affichage inline dans une liste. */
export function InlineAudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onLoaded = () => setDuration(a.duration || 0);
    const onTime = () => setCurrent(a.currentTime || 0);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [url]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      await a.play();
      setPlaying(true);
    }
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1">
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <Mic className="h-3 w-3 text-muted-foreground" />
      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={toggle}>
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </Button>
      <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">
        {formatTime(playing ? current : duration)}
      </span>
    </div>
  );
}

/** Lecteur vidéo compact : bouton qui ouvre un popover avec lecteur. */
export function InlineVideoPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs hover:bg-muted"
        >
          <Video className="h-3 w-3 text-muted-foreground" />
          <Play className="h-3 w-3" />
          <span className="text-muted-foreground">Vidéo</span>
          {duration > 0 && (
            <span className="tabular-nums text-muted-foreground">· {formatTime(duration)}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <video
          ref={videoRef}
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full rounded"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        />
      </PopoverContent>
    </Popover>
  );
}

export function MediaPlayerInline({ audioUrl, videoUrl }: MediaPlayerInlineProps) {
  if (audioUrl) return <InlineAudioPlayer url={audioUrl} />;
  if (videoUrl) return <InlineVideoPlayer url={videoUrl} />;
  return null;
}
