import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

interface FollowupQuestion {
  question: string;
  rationale?: string;
}

export function FollowupQuestionsCard({ questions }: { questions?: FollowupQuestion[] | null }) {
  if (!questions || questions.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-4 w-4" /> Questions à creuser en entretien
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="rounded-lg border bg-card p-3">
            <p className="text-sm font-medium text-foreground">
              {i + 1}. {q.question}
            </p>
            {q.rationale && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{q.rationale}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
