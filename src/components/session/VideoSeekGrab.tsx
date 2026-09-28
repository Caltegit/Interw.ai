import { useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

interface VideoSeekGrabProps {
  videoRef: RefObject<HTMLVideoElement>;
  duration: number | null;
  /** Mode épinglé compact : vidéo plus petite, on laisse plus de place aux contrôles natifs à droite. */
  compact?: boolean;
}

/**
 * Bande de préhension invisible alignée sur la barre de progression native
 * (bas de la vidéo). Les contrôles natifs restent inchangés : cette bande sert
 * uniquement à saisir et déplacer le curseur plus facilement, à la souris, au
 * doigt et au clavier. Inactive si la durée est inconnue (anciens WebM) : la
 * lecture et la barre native restent disponibles, sans saut forcé dans le
 * fichier.
 */
export function VideoSeekGrab({ videoRef, duration, compact = false }: VideoSeekGrabProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const validDuration = duration !== null && Number.isFinite(duration) && duration > 0 ? duration : null;

  if (validDuration === null) return null;

  const seekToRatio = (ratio: number) => {
    const v = videoRef.current;
    if (!v) return;
    const target = Math.max(0, Math.min(ratio, 1)) * Math.max(0, validDuration - 0.1);
    try { v.currentTime = target; } catch { /* Le fichier n'est pas déplaçable : la lecture reste disponible. */ }
  };

  const ratioFromEvent = (clientX: number): number => {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return (clientX - rect.left) / rect.width;
  };

  return (
    <div
      ref={stripRef}
      role="slider"
      tabIndex={0}
      aria-label="Position dans la vidéo (bande de déplacement)"
      aria-valuemin={0}
      aria-valuemax={Math.round(validDuration)}
      aria-valuetext="Flèches gauche et droite pour reculer ou avancer de 5 secondes"
      onPointerDown={(e) => {
        e.preventDefault();
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
        draggingRef.current = true;
        setDragging(true);
        seekToRatio(ratioFromEvent(e.clientX));
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) seekToRatio(ratioFromEvent(e.clientX));
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        setDragging(false);
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      }}
      onKeyDown={(e) => {
        const v = videoRef.current;
        if (!v) return;
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const delta = e.key === "ArrowLeft" ? -5 : 5;
        try {
          v.currentTime = Math.max(0, Math.min(validDuration - 0.1, v.currentTime + delta));
        } catch { /* noop */ }
      }}
      className={cn(
        "group/grab absolute bottom-0 z-10 cursor-pointer touch-none outline-none",
        // À droite, on laisse les boutons natifs (volume, plein écran, menu)
        // utilisables tels quels.
        compact ? "left-0 right-20 h-9" : "left-0 right-40 h-10",
        dragging ? "bg-white/5" : "bg-transparent hover:bg-white/5",
        "focus-visible:ring-2 focus-visible:ring-white/60",
      )}
    />
  );
}
