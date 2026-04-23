import { cn } from "@/lib/utils";

interface RecordingStatusBadgeProps {
  pendingUploads: number;
  recording: boolean;
}

/**
 * Pastille discrète en bas à droite indiquant l'état d'enregistrement.
 * Toujours montée pour éviter tout reflow / clignotement de la page.
 * Le texte est exposé via aria-label / title (tooltip natif au survol).
 */
export function RecordingStatusBadge({
  pendingUploads,
  recording,
}: RecordingStatusBadgeProps) {
  const saving = pendingUploads > 0;
  const visible = recording || saving;

  const label = saving
    ? "Sauvegarde en cours"
    : recording
      ? "Enregistrement en cours"
      : "Tout est sauvegardé";

  return (
    <div
      className={cn(
        "fixed bottom-3 right-3 z-40 flex items-center transition-opacity duration-300 pointer-events-none",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!visible}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full pointer-events-auto",
          saving
            ? "bg-warning animate-pulse"
            : recording
              ? "bg-destructive animate-pulse"
              : "bg-success",
        )}
        role="status"
        aria-label={label}
        title={label}
      />
    </div>
  );
}
