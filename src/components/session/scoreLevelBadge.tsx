import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ScoreLevel = "excellent" | "solid" | "partial" | "gap";

export const levelLabel: Record<ScoreLevel, string> = {
  excellent: "Excellent",
  solid: "Solide",
  partial: "Partiel",
  gap: "Manquant",
};

const levelTone: Record<ScoreLevel, string> = {
  excellent: "border-success text-success",
  solid: "border-primary text-primary",
  partial: "border-warning text-warning",
  gap: "border-destructive text-destructive",
};

export function inferLevel(pct: number): ScoreLevel {
  if (pct >= 80) return "excellent";
  if (pct >= 60) return "solid";
  if (pct >= 40) return "partial";
  return "gap";
}

export function levelBarColor(level: ScoreLevel) {
  switch (level) {
    case "excellent": return "bg-success";
    case "solid": return "bg-primary";
    case "partial": return "bg-warning";
    case "gap": return "bg-destructive";
  }
}

export function ScoreLevelBadge({ pct, className }: { pct: number; className?: string }) {
  const level = inferLevel(pct);
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", levelTone[level], className)}>
      {levelLabel[level]}
    </Badge>
  );
}
