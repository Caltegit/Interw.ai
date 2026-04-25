import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";

interface Trait {
  score: number; // 0-100
  interpretation?: string;
}

interface Profile {
  openness?: Trait;
  conscientiousness?: Trait;
  extraversion?: Trait;
  agreeableness?: Trait;
  emotional_stability?: Trait;
}

const LABELS: Record<keyof Profile, string> = {
  openness: "Ouverture",
  conscientiousness: "Rigueur",
  extraversion: "Extraversion",
  agreeableness: "Coopération",
  emotional_stability: "Stabilité émotionnelle",
};

export function PersonalityRadar({ profile }: { profile?: Profile | null }) {
  if (!profile) return null;
  const entries = (Object.keys(LABELS) as Array<keyof Profile>)
    .map((key) => ({ key, label: LABELS[key], trait: profile[key] }))
    .filter((e) => e.trait && typeof e.trait.score === "number");

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4" /> Profil de personnalité (Big Five)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(({ key, label, trait }) => {
          const score = Math.max(0, Math.min(100, trait!.score));
          return (
            <div key={key}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{score}/100</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${score}%` }}
                />
              </div>
              {trait!.interpretation && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{trait!.interpretation}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
