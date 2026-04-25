import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, SkipForward, Trophy, Sparkles, AlertTriangle } from "lucide-react";

export interface HighlightClip {
  video_url: string;
  question: string;
  score: number;
  question_index?: number;
  /** Borne de début (s). Défaut 0. */
  start_seconds?: number;
  /** Borne de fin (s). Si absent, on retombe sur max_seconds (legacy). */
  end_seconds?: number;
  /** Compat ancienne génération : durée max depuis 0. */
  max_seconds?: number;
  /** Type de moment sélectionné par l'IA. */
  kind?: "force" | "personnalite" | "vigilance";
  /** Titre court IA, ex. "Exemple concret de leadership". */
  label?: string | null;
  /** Phrase d'explication IA. */
  why?: string | null;
}

const KIND_META: Record<
  NonNullable<HighlightClip["kind"]>,
  { label: string; icon: typeof Trophy; className: string }
> = {
  force: { label: "Point fort", icon: Trophy, className: "text-primary" },
  personnalite: { label: "Personnalité", icon: Sparkles, className: "text-accent-foreground" },
  vigilance: { label: "Vigilance", icon: AlertTriangle, className: "text-warning" },
};

function getClipBounds(clip: HighlightClip) {
  const start = Math.max(0, clip.start_seconds ?? 0);
  const end =
    clip.end_seconds !== undefined && clip.end_seconds > start
      ? clip.end_seconds
      : start + (clip.max_seconds ?? 20);
  return { start, end };
}

export function HighlightReelPlayer({ clips }: { clips: HighlightClip[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const current = clips[index];
  const { start, end } = current ? getClipBounds(current) : { start: 0, end: 20 };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !current) return;

    const onTimeUpdate = () => {
      if (v.currentTime >= end) next();
    };
    const onEnded = () => next();

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, end]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const seek = () => {
      try {
        v.currentTime = start;
      } catch {
        /* noop */
      }
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });

    if (playing) v.play().catch(() => setPlaying(false));
    return () => v.removeEventListener("loadedmetadata", seek);
  }, [index, playing, start]);

  const startReel = () => {
    setIndex(0);
    setPlaying(true);
  };

  const next = () => {
    if (index + 1 < clips.length) setIndex(index + 1);
    else {
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

  const kindMeta = current.kind ? KIND_META[current.kind] : KIND_META.force;
  const KindIcon = kindMeta.icon;
  const badgeText = current.label ?? kindMeta.label;

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
          <div className="absolute left-3 top-3 flex max-w-[70%] items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
            <KindIcon className={`h-3.5 w-3.5 ${kindMeta.className}`} />
            <span className="truncate">{badgeText}</span>
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs backdrop-blur">
            {index + 1} / {clips.length}
          </div>
          {!playing && (
            <button
              type="button"
              onClick={startReel}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition hover:bg-black/40"
              aria-label="Lancer le best-of"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Play className="h-7 w-7 fill-current" />
              </span>
            </button>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium line-clamp-2">
            Q{(current.question_index ?? index) + 1} · {current.question}
          </p>
          {current.why && (
            <p className="text-xs text-muted-foreground">{current.why}</p>
          )}
        </div>

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
