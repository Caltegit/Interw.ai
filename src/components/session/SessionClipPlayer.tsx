import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMp4Download } from "@/hooks/useMp4Download";
import { useToast } from "@/hooks/use-toast";
import { useRefreshableMediaUrl } from "@/lib/mediaUrl";

interface Props {
  url: string;
  /** Titre court affiché en overlay bas (tronqué à 30 caractères). */
  questionTitle?: string | null;
  /** Texte long de la question — utilisé uniquement pour générer le nom de fichier MP4. */
  questionText?: string | null;
  /** Index 1-based de la question dans la session — utilisé pour le nom de fichier MP4. */
  questionIndex?: number;
  /** Si fourni, ouvre la page d'export dédiée plutôt qu'une conversion inline. */
  sessionId?: string;
  /** Masque le bouton de téléchargement MP4 (rapports partagés). */
  hideDownload?: boolean;
  onEnded?: () => void;
  /** Si true, joue automatiquement au chargement du clip (après un changement d'index). */
  autoPlayOnLoad?: boolean;
}

function truncate(text: string, max = 30): string {
  const t = (text ?? "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

function slugForFilename(text: string, fallback: string): string {
  const safe = (text || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
  return safe || fallback;
}

/**
 * Player vidéo unifié pour les clips de session (vue tableau et vue rapport).
 * Visuels : gros bouton Play, ±10s, sélecteur de vitesse, téléchargement MP4,
 * overlay « titre de question » en bas (visible quand le curseur n'est pas
 * sur le player).
 */
export function SessionClipPlayer({
  url,
  questionTitle,
  questionText,
  questionIndex,
  sessionId,
  hideDownload,
  onEnded,
  autoPlayOnLoad,
}: Props) {
  // Les enregistrements sont privés : on résout un lien temporaire.
  const { url: playableUrl, refresh } = useRefreshableMediaUrl(url);
  const retriedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const autoPlayRef = useRef(!!autoPlayOnLoad);
  autoPlayRef.current = !!autoPlayOnLoad;
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const hideOverlayTimerRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);

  const { download: downloadMp4, status: dlStatus, progress: dlProgress } = useMp4Download();
  const { toast } = useToast();

  const safePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    const wasMuted = v.muted;
    v.muted = true;
    try {
      const p = v.play();
      if (p && typeof p.then === "function") {
        playPromiseRef.current = p;
        p.then(() => {
          if (!wasMuted) {
            try { v.muted = false; } catch { /* noop */ }
          }
        })
          .catch(() => { /* swallow */ })
          .finally(() => { playPromiseRef.current = null; });
      } else if (!wasMuted) {
        v.muted = false;
      }
    } catch { /* noop */ }
  };

  const pauseOnly = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
        playPromiseRef.current = null;
      }
      v.pause();
    } catch { /* noop */ }
  };

  // Durée des WebM MediaRecorder : souvent Infinity. On ne force plus la
  // détection par un saut à 1e9, qui faisait échouer le décodage de certains
  // fichiers. La lecture reste prioritaire ; seule la durée est indisponible.
  const fixDuration = () => {
    const v = videoRef.current;
    if (!v) return;
    try { v.playbackRate = rateRef.current; } catch { /* noop */ }
    if (Number.isFinite(v.duration)) setDurationSec(v.duration);
    else setDurationSec(null);
    if (autoPlayRef.current) safePlay();
  };

  // Réinitialise le player quand l'URL change.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setDurationSec(null);
    setIsPlaying(false);
    setOverlayVisible(true);
    const apply = () => {
      try { v.playbackRate = rateRef.current; } catch { /* noop */ }
      if (v.duration === Infinity) {
        fixDuration();
      } else {
        try { v.currentTime = 0; } catch { /* noop */ }
        if (Number.isFinite(v.duration)) setDurationSec(v.duration);
        if (autoPlayRef.current) safePlay();
      }
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
    return () => {
      v.removeEventListener("loadedmetadata", apply);
      try { v.pause(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playableUrl]);

  // Vitesse appliquée à chaud.
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
  }, [rate]);

  // Sync play/pause pour l'overlay.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => {
      setIsPlaying(true);
      if (hideOverlayTimerRef.current) window.clearTimeout(hideOverlayTimerRef.current);
      hideOverlayTimerRef.current = window.setTimeout(() => setOverlayVisible(false), 1200);
    };
    const onPause = () => {
      setIsPlaying(false);
      setOverlayVisible(true);
      if (hideOverlayTimerRef.current) {
        window.clearTimeout(hideOverlayTimerRef.current);
        hideOverlayTimerRef.current = null;
      }
    };
    const onEndedEvt = () => {
      setIsPlaying(false);
      setOverlayVisible(true);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEndedEvt);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEndedEvt);
    };
  }, [playableUrl]);

  const showOverlayTemporarily = () => {
    setOverlayVisible(true);
    if (hideOverlayTimerRef.current) window.clearTimeout(hideOverlayTimerRef.current);
    if (isPlaying) {
      hideOverlayTimerRef.current = window.setTimeout(() => setOverlayVisible(false), 1500);
    }
  };

  const togglePlayPause = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) safePlay();
    else pauseOnly();
  };

  const handleDownload = async () => {
    const idx = questionIndex ?? 1;
    const fallback = `question-${idx}`;
    const filename = `entretien-${String(idx).padStart(2, "0")}-${slugForFilename(questionText || "", fallback)}.mp4`;
    if (sessionId) {
      const exportUrl = `/sessions/${sessionId}/export?question=${idx}`;
      window.open(exportUrl, "_blank", "noopener");
      return;
    }
    try {
      await downloadMp4(playableUrl ?? url, filename);
    } catch (err) {
      toast({
        title: "Téléchargement impossible",
        description: (err as Error)?.message || "Réessayez plus tard.",
        variant: "destructive",
      });
    }
  };

  const titleDisplay = truncate(questionTitle ?? "", 30);

  return (
    <div
      className="group relative overflow-hidden rounded-lg bg-black aspect-video"
      onMouseEnter={() => setHovered(true)}
      onMouseMove={showOverlayTemporarily}
      onMouseLeave={() => {
        setHovered(false);
        if (isPlaying) setOverlayVisible(false);
      }}
    >
      <video
        ref={videoRef}
        src={playableUrl ?? undefined}
        controls
        controlsList="nodownload"
        playsInline
        preload="metadata"
        onError={(e) => {
          // Renouvellement d'adresse uniquement pour une erreur réseau (2) ou
          // une source refusée/introuvable (4), et une seule fois.
          const code = e.currentTarget.error?.code ?? null;
          if (code !== 2 && code !== 4) return;
          if (retriedRef.current) return;
          retriedRef.current = true;
          const position = videoRef.current?.currentTime ?? 0;
          void refresh().then((next) => {
            const video = videoRef.current;
            if (!video || !next) return;
            video.src = next;
            video.addEventListener("loadedmetadata", () => {
              try { video.currentTime = position; } catch { /* noop */ }
            }, { once: true });
            video.load();
          });
        }}
        onLoadedMetadata={(e) => {
          // Pas de remise à zéro de retriedRef ici : les métadonnées se
          // chargent avant l'échec de décodage, ce qui rendait les tentatives
          // illimitées.
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDurationSec(d);
          else fixDuration();
        }}
        onEnded={() => {
          setIsPlaying(false);
          setOverlayVisible(true);
          onEnded?.();
        }}
        className="h-full w-full object-contain"
      />

      {/* Gros bouton Play / Pause central */}
      <button
        type="button"
        aria-label={isPlaying ? "Mettre en pause" : "Lire"}
        onClick={togglePlayPause}
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "flex h-20 w-20 items-center justify-center rounded-full",
          "bg-black/50 text-white backdrop-blur-sm transition-opacity duration-200",
          "hover:bg-black/70",
          overlayVisible ? "opacity-90" : "opacity-0 pointer-events-none",
        )}
      >
        {isPlaying ? (
          <Pause className="h-9 w-9" fill="currentColor" />
        ) : (
          <Play className="h-9 w-9 translate-x-[2px]" fill="currentColor" />
        )}
      </button>

      {/* ±10s en haut centre */}
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

      {/* Vitesse en haut-gauche */}
      <div className="pointer-events-none absolute top-2 left-2 flex flex-col items-start gap-[2px]">
        {[2, 1.5, 1].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRate(r)}
            className={cn(
              "pointer-events-auto inline-flex h-[25px] w-[32px] items-center justify-center rounded-full text-[11px] font-medium transition-opacity",
              rate === r
                ? "bg-white text-black opacity-100"
                : "bg-black/50 text-white opacity-80 hover:opacity-100",
            )}
          >
            {r}×
          </button>
        ))}
      </div>

      {/* Download MP4 en haut-droite */}
      {!hideDownload && (
        <div className="pointer-events-none absolute top-2 right-2">
          <button
            type="button"
            aria-label="Télécharger en MP4"
            disabled={dlStatus === "downloading" || dlStatus === "converting"}
            onClick={handleDownload}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-80 hover:opacity-100 disabled:opacity-60 transition-opacity"
          >
            {!sessionId && (dlStatus === "downloading" || dlStatus === "converting") ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {Math.round(dlProgress)}%
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                MP4
              </>
            )}
          </button>
        </div>
      )}

      {/* Overlay titre de question en bas */}
      {titleDisplay && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 flex justify-center",
            "bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2",
            "transition-opacity duration-200",
            hovered ? "opacity-0" : "opacity-100",
          )}
        >
          <span className="truncate text-xs font-medium text-white drop-shadow">
            {titleDisplay}
          </span>
        </div>
      )}
    </div>
  );
}
