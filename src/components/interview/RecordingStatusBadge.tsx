import { Cloud, CloudCheck, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordingStatusBadgeProps {
  pendingUploads: number;
  recording: boolean;
}

export function RecordingStatusBadge({
  pendingUploads,
  recording,
}: RecordingStatusBadgeProps) {
  if (!recording && pendingUploads === 0) return null;

  const saving = pendingUploads > 0;
  const Icon = saving ? CloudUpload : recording ? Cloud : CloudCheck;
  const label = saving
    ? "Sauvegarde en cours…"
    : recording
      ? "Enregistrement en cours"
      : "Tout est sauvegardé";

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs shadow-md backdrop-blur",
        saving
          ? "border-warning/40 text-warning"
          : recording
            ? "border-primary/40 text-primary"
            : "border-success/40 text-success",
      )}
      aria-live="polite"
    >
      <Icon
        className={cn("h-3.5 w-3.5", saving && "animate-pulse")}
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
