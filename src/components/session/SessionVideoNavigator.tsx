import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, RotateCcw, RotateCw } from "lucide-react";

export interface SessionVideoClip {
  url: string;
  questionLabel: string;
  questionText: string;
  isFollowUp: boolean;
  messageId?: string;
}

export interface SessionVideoNavigatorHandle {
  /** Joue le clip lié à `messageId`, positionné à `startSeconds - 5s` (≥ 0). Retourne false si aucun clip ne correspond. */
  playMessage: (messageId: string, startSeconds?: number) => boolean;
}

interface Props {
  clips: SessionVideoClip[];
}

function formatMinutes(s: number): string {
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}.${sec.toString().padStart(2, "0")}min`;
}

export const SessionVideoNavigator = forwardRef<SessionVideoNavigatorHandle, Props>(function SessionVideoNavigator({ clips }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const [index, setIndex] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const [durationSec, setDurationSec] = useState<number | null>(null);
  // Position en secondes à appliquer au prochain chargement de clip (0 par défaut).
  const pendingSeekRef = useRef<number>(0);

  useEffect(() => {
    if (index > clips.length - 1) setIndex(0);
  }, [clips.length, index]);

  // Coupe proprement la vidéo en cours (annule un play() en attente puis pause)
  const stopCurrent = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
        playPromiseRef.current = null;
      }
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* noop */
      }
    } catch {
      /* noop */
    }
  };

  const safePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const p = v.play();
      if (p && typeof p.then === "function") {
        playPromiseRef.current = p;
        p.catch(() => {}).finally(() => {
          playPromiseRef.current = null;
        });
      }
    } catch {
      /* noop */
    }
  };

  // Répare la durée pour les WebM MediaRecorder (duration = Infinity)
  const fixDuration = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.duration === Infinity) {
      const onTime = () => {
        v.removeEventListener("timeupdate", onTime);
        const real = v.duration;
        try {
          v.currentTime = 0;
        } catch {
          /* noop */
        }
        if (Number.isFinite(real)) setDurationSec(real);
        if (shouldAutoPlay) safePlay();
      };
      v.addEventListener("timeupdate", onTime);
      try {
        v.currentTime = 1e9;
      } catch {
        /* noop */
      }
    } else if (Number.isFinite(v.duration)) {
      setDurationSec(v.duration);
    }
  };

  // Reset position + autoplay au changement de clip uniquement
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setDurationSec(null);
    const apply = () => {
      try {
        v.playbackRate = rateRef.current;
      } catch {
        /* noop */
      }
      if (v.duration === Infinity) {
        fixDuration();
      } else {
        try {
          v.currentTime = 0;
        } catch {
          /* noop */
        }
        if (Number.isFinite(v.duration)) setDurationSec(v.duration);
        if (shouldAutoPlay) safePlay();
      }
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
    return () => {
      v.removeEventListener("loadedmetadata", apply);
      // Coupe l'audio résiduel sur l'élément démonté
      try {
        v.pause();
      } catch {
        /* noop */
      }
    };
  }, [index, shouldAutoPlay]);

  // Vitesse appliquée à chaud sans toucher à currentTime
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
  }, [rate]);

  if (!clips || clips.length === 0) return null;

  const current = clips[index];

  const goTo = async (newIndex: number, autoplay: boolean) => {
    if (newIndex === index) return;
    await stopCurrent();
    setShouldAutoPlay(autoplay);
    setIndex(newIndex);
  };

  const prev = () => goTo(Math.max(0, index - 1), true);
  const next = () => goTo(Math.min(clips.length - 1, index + 1), true);

  const handleEnded = () => {
    if (index < clips.length - 1) {
      goTo(index + 1, true);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select
              value={String(index)}
              onValueChange={(v) => goTo(Number(v), true)}
            >
              <SelectTrigger className="h-8 w-auto gap-1 border-none px-1 text-sm font-semibold shadow-none focus:ring-0">
                <SelectValue>
                  Question {index + 1} / {clips.length}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-w-[22rem]">
                {clips.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">Q{i + 1}</span>
                      <span className="truncate text-muted-foreground">— {c.questionText}</span>
                      {c.isFollowUp && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          Relance
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              {current.isFollowUp && (
                <Badge variant="outline" className="text-xs">
                  Relance
                </Badge>
              )}
              {durationSec ? (
                <span className="text-sm font-semibold tabular-nums">
                  {formatMinutes(durationSec)}
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{current.questionText}</p>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
          <video
            key={current.url}
            ref={videoRef}
            src={current.url}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d)) setDurationSec(d);
              else if (d === Infinity) fixDuration();
            }}
            onEnded={handleEnded}
            className="h-full w-full object-contain"
          />
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center gap-2">
            <button
              type="button"
              aria-label="Reculer de 10 secondes"
              disabled={durationSec === null}
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                v.currentTime = Math.max(0, v.currentTime - 10);
              }}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              10s
            </button>
            <button
              type="button"
              aria-label="Avancer de 10 secondes"
              disabled={durationSec === null}
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                const d = Number.isFinite(v.duration) ? v.duration : (durationSec ?? 0);
                v.currentTime = Math.min(Math.max(0, d - 0.1), v.currentTime + 10);
              }}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-80 hover:opacity-100 disabled:opacity-40 transition-opacity"
            >
              10s
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>


        <div className="flex items-center justify-between gap-2">
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
          <div className="flex items-center gap-1">
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
