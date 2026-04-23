import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, SkipForward, Trophy } from "lucide-react";

export interface HighlightClip {
  video_url: string;
  question: string;
  score: number;
  question_index?: number;
  /** Optionnel : durée maximale lue (s). Défaut 20s. */
  max_seconds?: number;
}

interface HighlightReelPlayerProps {
  clips: HighlightClip[];
}

const DEFAULT_MAX = 20;

export function HighlightReelPlayer({ clips }: HighlightReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const current = clips[index];
  const maxSec = current?.max_seconds ?? DEFAULT_MAX;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !current) return;

    const onTimeUpdate = () => {
      if (v.currentTime >= maxSec) {
        next();
      }
    };
    const onEnded = () => next();

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, maxSec]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    if (playing) {
      v.play().catch(() => setPlaying(false));
    }
  }, [index, playing]);

  const start = () => {
    setIndex(0);
    setPlaying(true);
  };

  const next = () => {
    if (index + 1 < clips.length) {
      setIndex(index + 1);
    } else {
      setPlaying(false);
      setIndex(0);
    }
  };

  if (!clips || clips.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Best-of indisponible pour cette session.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
          <video
            ref={videoRef}
            src={current.video_url}
            playsInline
            controls={false}
            className="h-full w-full object-contain"
            preload="metadata"
          />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            Question {(current.question_index ?? index) + 1} · {current.score}/10
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs backdrop-blur">
            {index + 1} / {clips.length}
          </div>
          {!playing && (
            <button
              type="button"
              onClick={start}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition hover:bg-black/40"
              aria-label="Lancer le best-of"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Play className="h-7 w-7 fill-current" />
              </span>
            </button>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{current.question}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {clips.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-8 rounded-full ${i === index ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          {playing && (
            <Button variant="ghost" size="sm" onClick={next}>
              <SkipForward className="mr-1 h-4 w-4" /> Suivant
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
