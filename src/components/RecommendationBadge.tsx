import { Badge } from "@/components/ui/badge";

const recConfig: Record<string, { label: string; className: string }> = {
  strong_yes: { label: "Fortement recommandé", className: "bg-success text-success-foreground" },
  yes: { label: "Recommandé", className: "bg-success/80 text-success-foreground" },
  maybe: { label: "À étudier", className: "bg-warning text-warning-foreground" },
  no: { label: "Non retenu", className: "bg-destructive text-destructive-foreground" },
};

export function RecommendationBadge({ recommendation }: { recommendation: string | null }) {
  if (!recommendation) return null;
  const config = recConfig[recommendation] ?? { label: recommendation, className: "" };
  return <Badge className={config.className}>{config.label}</Badge>;
}
