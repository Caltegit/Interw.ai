import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface SessionVideoClip {
  url: string;
  questionLabel: string;
  questionText: string;
  isFollowUp: boolean;
}

interface Props {
  clips: SessionVideoClip[];
}

export function SessionVideoNavigator({ clips }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    if (index > clips.length - 1) setIndex(0);
  }, [clips.length, index]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const apply = () => {
      try {
        v.currentTime = 0;
        v.playbackRate = rate;
      } catch {
        /* noop */
      }
      if (shouldAutoPlay) {
        v.play().catch(() => {});
      }
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
    return () => v.removeEventListener("loadedmetadata", apply);
  }, [index, shouldAutoPlay, rate]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
  }, [rate]);

  if (!clips || clips.length === 0) return null;

  const current = clips[index];
  const prev = () => {
    setShouldAutoPlay(true);
    setIndex((i) => Math.max(0, i - 1));
  };
  const next = () => {
    setShouldAutoPlay(true);
    setIndex((i) => Math.min(clips.length - 1, i + 1));
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{current.questionLabel}</span>
            {current.isFollowUp && (
              <Badge variant="outline" className="text-xs">
                Relance
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{current.questionText}</p>
        </div>

        <div className="overflow-hidden rounded-lg bg-black aspect-video">
          <video
            key={current.url}
            ref={videoRef}
            src={current.url}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex items-center justify-center gap-1">
          {[1, 1.5, 2].map((r) => (
            <Button
              key={r}
              type="button"
              variant={rate === r ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setRate(r)}
            >
              {r}×
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={prev}
            disabled={index === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Précédent
          </Button>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {index + 1} / {clips.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={next}
            disabled={index === clips.length - 1}
          >
            Suivant
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
