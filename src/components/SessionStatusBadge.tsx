import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-muted text-muted-foreground" },
  video_viewed: { label: "Vidéo vue", className: "bg-primary/10 text-primary" },
  in_progress: { label: "En cours", className: "bg-warning/10 text-warning" },
  completed: { label: "Complété", className: "bg-success/10 text-success" },
  expired: { label: "Expiré", className: "bg-destructive/10 text-destructive" },
};

export function SessionStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
