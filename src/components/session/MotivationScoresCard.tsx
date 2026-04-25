import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface MotivationScores {
  company_knowledge?: number; // 0-100
  role_fit?: number;
  enthusiasm?: number;
  long_term_intent?: number;
  comment?: string;
}

const LABELS: Record<keyof MotivationScores, string> = {
  company_knowledge: "Connaissance de l'entreprise",
  role_fit: "Adéquation au poste",
  enthusiasm: "Enthousiasme",
  long_term_intent: "Projection long terme",
  comment: "",
};

export function MotivationScoresCard({ scores }: { scores?: MotivationScores | null }) {
  if (!scores) return null;
  const entries = (["company_knowledge", "role_fit", "enthusiasm", "long_term_intent"] as const)
    .filter((k) => typeof scores[k] === "number");

  if (entries.length === 0 && !scores.comment) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4" /> Motivation & adéquation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((k) => {
          const score = Math.max(0, Math.min(100, scores[k] as number));
          return (
            <div key={k}>
              <div className="flex justify-between text-sm">
                <span>{LABELS[k]}</span>
                <span className="font-medium">{score}/100</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-success transition-all" style={{ width: `${score}%` }} />
              </div>
            </div>
          );
        })}
        {scores.comment && (
          <p className="text-xs text-muted-foreground leading-relaxed">{scores.comment}</p>
        )}
      </CardContent>
    </Card>
  );
}
