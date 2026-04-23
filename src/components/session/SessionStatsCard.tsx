import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface SessionStatsCardProps {
  stats?: Record<string, any> | null;
  questionEvaluations?: Record<string, any> | null;
}

export function SessionStatsCard({ stats, questionEvaluations }: SessionStatsCardProps) {
  const s = stats ?? {};
  const evals = questionEvaluations ?? {};
  const evalEntries = Object.entries(evals);

  const bestIdx = typeof s.best_question_idx === "number" ? s.best_question_idx : null;
  const worstIdx = typeof s.worst_question_idx === "number" ? s.worst_question_idx : null;
  const bestScore = bestIdx !== null ? evals[String(bestIdx)]?.score : null;
  const worstScore = worstIdx !== null ? evals[String(worstIdx)]?.score : null;

  const items: Array<{ label: string; value: string }> = [];
  if (typeof s.ai_followups === "number") {
    items.push({ label: "Relances IA", value: String(s.ai_followups) });
  }
  if (typeof s.candidate_speech_chars === "number") {
    items.push({
      label: "Volume de parole",
      value: `${Math.round(s.candidate_speech_chars / 1000)} k caractères`,
    });
  }
  if (typeof s.avg_criteria_score === "number") {
    items.push({
      label: "Score moyen / critère",
      value: `${s.avg_criteria_score.toFixed(1)} / 5`,
    });
  }
  if (bestIdx !== null && bestScore !== undefined) {
    items.push({
      label: "Meilleure question",
      value: `Q${bestIdx + 1} · ${bestScore}/10`,
    });
  }
  if (worstIdx !== null && worstScore !== undefined && evalEntries.length > 1) {
    items.push({
      label: "Question la plus faible",
      value: `Q${worstIdx + 1} · ${worstScore}/10`,
    });
  }

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> En chiffres
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{it.label}</span>
            <span className="font-medium">{it.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
