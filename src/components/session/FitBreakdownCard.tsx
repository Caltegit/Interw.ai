import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { EvidenceLink } from "./EvidenceLink";
import { cn } from "@/lib/utils";

export interface FitItem {
  criterion: string;
  score: number; // 0-100
  level?: "excellent" | "solid" | "partial" | "gap";
  statement?: string;
  quote?: string;
  message_id?: string;
}

interface Props {
  items?: FitItem[] | null;
  // Fallback ancien format : criteria_scores { id: { label, score, max, comment } }
  legacyCriteriaScores?: Record<string, { label?: string; score: number; max: number; comment?: string }> | null;
  onGoToMessage?: (id: string) => void;
}

const levelLabel: Record<string, string> = {
  excellent: "Excellent",
  solid: "Solide",
  partial: "Partiel",
  gap: "Manquant",
};

const levelTone: Record<string, string> = {
  excellent: "border-success text-success",
  solid: "border-primary text-primary",
  partial: "border-warning text-warning",
  gap: "border-destructive text-destructive",
};

function inferLevel(score: number): FitItem["level"] {
  if (score >= 80) return "excellent";
  if (score >= 60) return "solid";
  if (score >= 40) return "partial";
  return "gap";
}

function barColor(level?: FitItem["level"]) {
  switch (level) {
    case "excellent": return "bg-success";
    case "solid": return "bg-primary";
    case "partial": return "bg-warning";
    case "gap": return "bg-destructive";
    default: return "bg-primary";
  }
}

export function FitBreakdownCard({ items, legacyCriteriaScores, onGoToMessage }: Props) {
  let list: FitItem[] = [];
  if (items && items.length > 0) {
    list = items.map((it) => ({ ...it, level: it.level ?? inferLevel(it.score) }));
  } else if (legacyCriteriaScores) {
    list = Object.values(legacyCriteriaScores).map((c) => {
      const pct = Math.round((c.score / Math.max(1, c.max)) * 100);
      return {
        criterion: c.label || "Critère",
        score: pct,
        level: inferLevel(pct),
        statement: c.comment || undefined,
      };
    });
  }

  if (list.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" /> Adéquation au poste
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.map((item, i) => {
          const level = item.level ?? inferLevel(item.score);
          const score = Math.max(0, Math.min(100, item.score));
          return (
            <div key={i}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{item.criterion}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", levelTone[level])}>
                    {levelLabel[level]}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums text-muted-foreground">{score}%</span>
                </div>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted">
                <div
                  className={cn("h-2 rounded-full transition-all", barColor(level))}
                  style={{ width: `${score}%` }}
                />
              </div>
              {item.statement && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.statement}</p>
              )}
              <EvidenceLink
                quote={item.quote}
                messageId={item.message_id}
                onGoToMessage={onGoToMessage}
                compact
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
