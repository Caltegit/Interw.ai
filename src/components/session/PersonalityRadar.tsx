import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, ChevronDown, ChevronUp, Play } from "lucide-react";

interface Evidence {
  quote?: string;
  message_id?: string;
}

interface Trait {
  score: number; // 0-100
  interpretation?: string;
  confidence?: "low" | "medium" | "high";
  evidences?: Evidence[];
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

const confidenceColor: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-warning",
  high: "text-success",
};

const confidenceLabel: Record<string, string> = {
  low: "Confiance faible",
  medium: "Confiance moyenne",
  high: "Confiance élevée",
};

interface Props {
  profile?: Profile | null;
  onGoToMessage?: (messageId: string) => void;
  /** Moyenne du projet (Big Five) à superposer en marqueur. */
  projectAverages?: Partial<Record<keyof Profile, number>>;
}

export function PersonalityRadar({ profile, onGoToMessage, projectAverages }: Props) {
  const [showLow, setShowLow] = useState(false);

  if (!profile) return null;
  const all = (Object.keys(LABELS) as Array<keyof Profile>)
    .map((key) => ({ key, label: LABELS[key], trait: profile[key] }))
    .filter((e) => e.trait && typeof e.trait.score === "number");

  if (all.length === 0) return null;

  const highConfidence = all.filter((e) => (e.trait?.confidence ?? "medium") !== "low");
  const lowConfidence = all.filter((e) => e.trait?.confidence === "low");
  const visible = showLow ? all : highConfidence.length > 0 ? highConfidence : all;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4" /> Profil de personnalité (Big Five)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map(({ key, label, trait }) => {
          const score = Math.max(0, Math.min(100, trait!.score));
          const confidence = trait!.confidence ?? "medium";
          const avg = projectAverages?.[key];
          return (
            <div key={key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{label}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className={`text-[11px] ${confidenceColor[confidence]}`}>
                    {confidenceLabel[confidence]}
                  </span>
                  <span className="font-medium text-foreground">{score}/100</span>
                </span>
              </div>
              <div className="relative mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${score}%` }}
                />
                {typeof avg === "number" && (
                  <div
                    className="absolute top-[-2px] h-3 w-[2px] bg-foreground/60"
                    style={{ left: `${Math.max(0, Math.min(100, avg))}%` }}
                    title={`Moyenne du projet : ${Math.round(avg)}/100`}
                  />
                )}
              </div>
              {trait!.interpretation && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{trait!.interpretation}</p>
              )}
              {trait!.evidences && trait!.evidences.length > 0 && (
                <div className="mt-1 space-y-1">
                  {trait!.evidences.slice(0, 2).map((ev, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <blockquote className="flex-1 border-l-2 border-primary/40 pl-2 text-[11px] italic text-muted-foreground">
                        « {ev.quote} »
                      </blockquote>
                      {ev.message_id && onGoToMessage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-primary"
                          onClick={() => onGoToMessage(ev.message_id!)}
                          title="Voir le moment"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {lowConfidence.length > 0 && highConfidence.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowLow((v) => !v)}
          >
            {showLow ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showLow
              ? "Masquer les traits à faible confiance"
              : `Voir ${lowConfidence.length} trait${lowConfidence.length > 1 ? "s" : ""} à faible confiance`}
          </Button>
        )}
        {projectAverages && Object.keys(projectAverages).length > 0 && (
          <p className="pt-1 text-[11px] text-muted-foreground">
            Le repère vertical sur chaque barre indique la moyenne du projet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
