import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface Props {
  summary: string;
}

export function ExecutiveSummaryCard({ summary }: Props) {
  if (!summary) return null;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-start gap-3 py-4">
        <div className="rounded-full bg-primary/15 p-2">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Résumé en 30 secondes</p>
          <p className="text-sm leading-relaxed text-foreground">{summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
