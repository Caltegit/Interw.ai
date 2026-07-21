import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-muted text-muted-foreground" },
  video_viewed: { label: "Vidéo vue", className: "bg-primary/10 text-primary" },
  in_progress: { label: "RDV", className: "bg-warning/10 text-warning" },
  completed: { label: "Complété", className: "bg-success/10 text-success" },
  cancelled: { label: "Annulé", className: "bg-muted text-muted-foreground" },
  expired: { label: "Expiré", className: "bg-destructive/10 text-destructive" },
};

export type SessionStatusOverride = "unusable";

export function SessionStatusBadge({
  status,
  override,
}: {
  status: string;
  override?: SessionStatusOverride;
}) {
  if (override === "unusable") {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive gap-1"
        title="Session inexploitable : audio ou rapport défectueux"
      >
        <AlertTriangle className="h-3 w-3" />
        Incomplet
      </Badge>
    );
  }
  const config = statusConfig[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
