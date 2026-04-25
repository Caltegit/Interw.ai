import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface MotivationScores {
  company_knowledge?: number;
  company_knowledge_evidence?: string;
  role_fit?: number;
  role_fit_evidence?: string;
  enthusiasm?: number;
  enthusiasm_evidence?: string;
  long_term_intent?: number;
  long_term_intent_evidence?: string;
  comment?: string;
}

const FIELDS: Array<{ key: keyof MotivationScores; evKey: keyof MotivationScores; label: string }> = [
  { key: "company_knowledge", evKey: "company_knowledge_evidence", label: "Connaissance de l'entreprise" },
  { key: "role_fit", evKey: "role_fit_evidence", label: "Adéquation au poste" },
  { key: "enthusiasm", evKey: "enthusiasm_evidence", label: "Enthousiasme" },
  { key: "long_term_intent", evKey: "long_term_intent_evidence", label: "Projection long terme" },
];

export function MotivationScoresCard({ scores }: { scores?: MotivationScores | null }) {
  if (!scores) return null;
  const visible = FIELDS.filter((f) => typeof scores[f.key] === "number");

  if (visible.length === 0 && !scores.comment) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4" /> Motivation & adéquation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map((f) => {
          const score = Math.max(0, Math.min(100, scores[f.key] as number));
          const evidence = scores[f.evKey] as string | undefined;
          return (
            <div key={f.key}>
              <div className="flex justify-between text-sm">
                <span>{f.label}</span>
                <span className="font-medium">{score}/100</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-success transition-all" style={{ width: `${score}%` }} />
              </div>
              {evidence && (
                <p className="mt-1 text-xs italic text-muted-foreground">« {evidence} »</p>
              )}
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
