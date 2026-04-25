import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem } from "lucide-react";

interface SoftSkill {
  skill: string;
  score?: number; // 0-10
  quote?: string;
}

export function SoftSkillsCard({ skills }: { skills?: SoftSkill[] | null }) {
  if (!skills || skills.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gem className="h-4 w-4" /> Soft skills observées
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {skills.map((s, i) => (
          <div key={i} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{s.skill}</span>
              {typeof s.score === "number" && (
                <Badge variant="outline">{s.score}/10</Badge>
              )}
            </div>
            {s.quote && (
              <blockquote className="mt-2 border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground">
                « {s.quote} »
              </blockquote>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
