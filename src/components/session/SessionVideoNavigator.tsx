import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

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
  transcripts?: Record<string, string>;
  /** Cible DOM où afficher le lecteur via portail. Permet de le déplacer entre la position normale et la barre fixe sans démonter `<video>`. */
  portalTarget?: HTMLElement | null;
  /** Mode compact (mini-vidéo dans la barre fixe). */
  compact?: boolean;
}

function formatMinutes(s: number): string {
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}.${sec.toString().padStart(2, "0")}min`;
}

export const SessionVideoNavigator = forwardRef<SessionVideoNavigatorHandle, Props>(function SessionVideoNavigator({ clips, transcripts, portalTarget, compact }, ref) {
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
  // Empêche les doubles attaches de timeupdate (inline onLoadedMetadata + effet).
  const fixingDurationRef = useRef(false);

  useEffect(() => {
    if (index > clips.length - 1) setIndex(0);
  }, [clips.length, index]);

  // Annule un play() en attente puis pause, sans toucher à currentTime.
  const pauseOnly = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
        playPromiseRef.current = null;
      }
      v.pause();
    } catch {
      /* noop */
    }
  };

  // Coupe proprement la vidéo en cours (annule un play() en attente puis pause + reset à 0).
  // Utilisé uniquement lors d'un changement de clip.
  const stopCurrent = async () => {
    await pauseOnly();
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = 0;
    } catch {
      /* noop */
    }
  };

  const safePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    // Chrome bloque l'autoplay non-mute après un délai depuis le geste utilisateur.
    // On force mute avant play() puis on restaure le son une fois lecture lancée.
    const wasMuted = v.muted;
    v.muted = true;
    try {
      const p = v.play();
      if (p && typeof p.then === "function") {
        playPromiseRef.current = p;
        p.then(() => {
          if (!wasMuted) {
            // Restaure le son après démarrage effectif.
            try {
              v.muted = false;
            } catch {
              /* noop */
            }
          }
        })
          .catch(() => {
            // Si play() échoue, on laisse mute pour éviter un état incohérent.
          })
          .finally(() => {
            playPromiseRef.current = null;
          });
      } else if (!wasMuted) {
        v.muted = false;
      }
    } catch {
      /* noop */
    }
  };

  // Applique le seek en attente, en bornant à la durée connue.
  // Idempotent : ne fait rien si pendingSeekRef est déjà consommé (=0).
  // Évite que deux invocations concurrentes (inline onLoadedMetadata + effet)
  // ne fassent retomber currentTime à 0.
  const applyPendingSeek = (v: HTMLVideoElement, duration: number) => {
    const pending = pendingSeekRef.current;
    if (pending <= 0) return;
    const target = Math.max(0, Math.min(pending, Math.max(0, duration - 0.1)));
    try {
      v.currentTime = target;
    } catch {
      /* noop */
    }
    pendingSeekRef.current = 0;
  };

  // Répare la durée pour les WebM MediaRecorder (duration = Infinity).
  // Protégé contre les doubles invocations dans le même cycle de chargement.
  const fixDuration = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.duration === Infinity) {
      if (fixingDurationRef.current) return;
      fixingDurationRef.current = true;
      const onTime = () => {
        v.removeEventListener("timeupdate", onTime);
        fixingDurationRef.current = false;
        const real = v.duration;
        const safeDur = Number.isFinite(real) ? real : 0;
        // Après le scrub à 1e9 pour forcer la détection de la durée, la tête
        // de lecture est collée à la fin. On la repositionne explicitement
        // avant tout play(), sinon la vidéo se termine immédiatement et
        // `onEnded` enchaîne au clip suivant (effet « ça saute »).
        const pending = pendingSeekRef.current;
        const target = pending > 0
          ? Math.max(0, Math.min(pending, Math.max(0, safeDur - 0.1)))
          : 0;
        try {
          v.currentTime = target;
        } catch {
          /* noop */
        }
        pendingSeekRef.current = 0;
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
    fixingDurationRef.current = false;
    const apply = () => {
      try {
        v.playbackRate = rateRef.current;
      } catch {
        /* noop */
      }
      if (v.duration === Infinity) {
        fixDuration();
      } else {
        applyPendingSeek(v, Number.isFinite(v.duration) ? v.duration : 0);
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

  useImperativeHandle(
    ref,
    () => ({
      playMessage: (messageId, startSeconds) => {
        const i = clips.findIndex((c) => c.messageId === messageId);
        if (i === -1) return false;
        // Marge adaptative : ~15 % du timestamp, bornée entre 0,5 s et 3 s.
        const raw = Math.max(0, startSeconds ?? 0);
        const margin = Math.min(3, Math.max(0.5, raw * 0.15));
        const seek = Math.max(0, raw - margin);
        if (i === index) {
          // Même clip : pause sans reset, puis seek + play.
          pauseOnly().then(() => {
            const v = videoRef.current;
            if (!v) return;
            const dur = v.duration;
            if (!Number.isFinite(dur) || dur <= 0) {
              // Durée pas encore connue (WebM Infinity) : passe par le mécanisme
              // pendingSeekRef + fixDuration, qui seek puis play après timeupdate.
              pendingSeekRef.current = seek;
              setShouldAutoPlay(true);
              fixDuration();
              return;
            }
            const target = Math.min(seek, Math.max(0, dur - 0.1));
            try {
              v.currentTime = target;
            } catch {
              /* noop */
            }
            safePlay();
          });
        } else {
          // Autre clip : on charge, l'effet de chargement appliquera pendingSeekRef.
          pendingSeekRef.current = seek;
          stopCurrent().then(() => {
            setShouldAutoPlay(true);
            setIndex(i);
          });
        }
        return true;
      },
    }),
    [clips, index, durationSec],
  );

  // Conteneur DOM stable créé une seule fois. On le déplace via `appendChild`
  // entre la position « normale » et la barre fixe pour préserver l'élément
  // `<video>` (pas de démontage React → la lecture continue).
  const stableHostRef = useRef<HTMLDivElement | null>(null);
  if (stableHostRef.current === null && typeof document !== "undefined") {
    const el = document.createElement("div");
    el.style.height = "100%";
    el.style.width = "100%";
    stableHostRef.current = el;
  }
  useLayoutEffect(() => {
    const host = stableHostRef.current;
    if (!host || !portalTarget) return;
    portalTarget.appendChild(host);
    return () => {
      if (host.parentElement === portalTarget) {
        portalTarget.removeChild(host);
      }
    };
  }, [portalTarget]);

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

  const content = (
    <Card className={cn(compact && "border-primary/30 shadow-md")}>
      <CardContent
        className={cn(
          compact ? "space-y-1 p-1.5" : "space-y-1.5 px-3 pb-3 pt-3",
        )}
      >
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
          {!compact && (
            <>
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
              <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-[2px]">
                {[2, 1.5, 1].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRate(r)}
                    className={`pointer-events-auto inline-flex h-[25px] w-[32px] items-center justify-center rounded-full text-[11px] font-medium transition-opacity ${
                      rate === r
                        ? "bg-white text-black opacity-100"
                        : "bg-black/50 text-white opacity-80 hover:opacity-100"
                    }`}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!compact && current.isFollowUp && (
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              Relance
            </Badge>
          </div>
        )}

        <div className={cn("grid items-center", compact ? "grid-cols-[auto_1fr_auto] gap-1" : "grid-cols-3")}>
          <div className="justify-self-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("h-6 text-xs", compact ? "px-1" : "px-2")}
              onClick={prev}
              disabled={index === 0}
            >
              <ChevronLeft className={cn("h-3 w-3", compact ? "" : "mr-1")} />
              {!compact && "Préc."}
            </Button>
          </div>
          <div className="justify-self-center">
            <Select
              value={String(index)}
              onValueChange={(v) => goTo(Number(v), true)}
            >
              <SelectTrigger className="h-6 w-auto gap-1 border-none px-1 text-xs font-semibold shadow-none focus:ring-0">
                <SelectValue>
                  Question {index + 1}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-w-[22rem]">
                {clips.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">Question {i + 1}</span>
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
          </div>
          <div className="justify-self-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("h-6 text-xs", compact ? "px-1" : "px-2")}
              onClick={next}
              disabled={index === clips.length - 1}
            >
              {!compact && "Suiv."}
              <ChevronRight className={cn("h-3 w-3", compact ? "" : "ml-1")} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!stableHostRef.current) return null;
  return createPortal(content, stableHostRef.current);
});
