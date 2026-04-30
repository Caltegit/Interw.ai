import { cn } from "@/lib/utils";

export type FeedbackStatus = "open" | "in_progress" | "archived";

const CONFIG: Record<FeedbackStatus, { label: string; className: string }> = {
  open: {
    label: "Nouveau",
    className: "bg-success/15 text-success border-success/30",
  },
  in_progress: {
    label: "En cours",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  archived: {
    label: "Archivé",
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export function getFeedbackStatusConfig(status: FeedbackStatus) {
  return CONFIG[status] ?? CONFIG.open;
}

interface Props {
  status: FeedbackStatus;
  className?: string;
}

export function FeedbackStatusBadge({ status, className }: Props) {
  const cfg = getFeedbackStatusConfig(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        cfg.className,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
