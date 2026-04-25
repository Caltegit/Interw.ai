import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Users } from "lucide-react";
import type { ProjectAverages } from "@/hooks/queries/useProjectAverages";

interface Props {
  candidateScore: number | null;
  averages: ProjectAverages;
  candidateCriteria: Record<string, { label?: string; score: number; max: number }>;
}

/**
 * Carte comparant le candidat à la moyenne du projet.
 * Masquée tant qu'on n'a pas au moins 3 candidats avec rapport (sinon pas assez de signal).
 */
export function ProjectComparisonCard({ candidateScore, averages, candidateCriteria }: Props) {
  if (averages.count < 3 || candidateScore === null || averages.overallScore === null) {
    return null;
  }

  const delta = candidateScore - averages.overallScore;
  const positive = delta >= 0;

  // Critères du candidat avec moyenne projet correspondante (par label)
  const criteriaRows = Object.values(candidateCriteria)
    .map((c) => {
      const label = c.label || "Critère";
      const candidatePct = (c.score / c.max) * 100;
      const avgPct = averages.criteriaByLabel[label]?.avgPercent;
      return { label, candidatePct, avgPct };
    })
    .filter((r) => typeof r.avgPct === "number");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" /> Comparaison avec les autres candidats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-semibold">{candidateScore}/100</span>
          <span className="text-sm text-muted-foreground">
            moyenne du projet : {averages.overallScore}/100
          </span>
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              positive ? "text-success" : "text-destructive"
            }`}
          >
            {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {positive ? "+" : ""}
            {delta} pts
          </span>
          <span className="text-xs text-muted-foreground">
            (sur {averages.count} candidat{averages.count > 1 ? "s" : ""})
          </span>
        </div>

        {criteriaRows.length > 0 && (
          <div className="space-y-2">
            {criteriaRows.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground">
                    {Math.round(row.candidatePct)}% · moyenne {Math.round(row.avgPct!)}%
                  </span>
                </div>
                <div className="relative mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, row.candidatePct))}%` }}
                  />
                  <div
                    className="absolute top-[-2px] h-3 w-[2px] bg-foreground/60"
                    style={{ left: `${Math.max(0, Math.min(100, row.avgPct!))}%` }}
                    title={`Moyenne du projet : ${Math.round(row.avgPct!)}%`}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-muted-foreground">
              Le repère vertical indique la moyenne du projet pour ce critère.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
