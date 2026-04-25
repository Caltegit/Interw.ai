import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreCircle } from "@/components/ScoreCircle";
import { RecommendationBadge } from "@/components/RecommendationBadge";
import { Clock, MessageSquare, Video, Target, HelpCircle } from "lucide-react";

interface OverviewHeaderProps {
  candidateName: string;
  candidateEmail?: string;
  jobTitle?: string;
  projectTitle?: string;
  createdAt?: string | null;
  durationSeconds?: number | null;
  messagesCount: number;
  videoAnswersCount: number;
  criteriaCount: number;
  questionsEvaluatedCount: number;
  overallScore?: number | null;
  overallGrade?: string | null;
  recommendation?: string | null;
}

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${s.toString().padStart(2, "0")} s`;
};

export function OverviewHeader(props: OverviewHeaderProps) {
  const {
    candidateName,
    candidateEmail,
    jobTitle,
    projectTitle,
    createdAt,
    durationSeconds,
    messagesCount,
    videoAnswersCount,
    criteriaCount,
    questionsEvaluatedCount,
    overallScore,
    overallGrade,
    recommendation,
  } = props;

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const subtitleParts = [jobTitle, projectTitle, formattedDate].filter(Boolean);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-5">
          {typeof overallScore === "number" && <ScoreCircle score={overallScore} />}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold leading-tight">{candidateName}</h2>
            {subtitleParts.length > 0 && (
              <p className="text-sm text-muted-foreground">{subtitleParts.join(" · ")}</p>
            )}
            {candidateEmail && (
              <p className="text-xs text-muted-foreground">{candidateEmail}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {recommendation && <RecommendationBadge recommendation={recommendation} />}
              {overallGrade && <Badge variant="outline">{overallGrade}</Badge>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat icon={Clock} label="Durée" value={formatDuration(durationSeconds)} />
          <Stat icon={MessageSquare} label="Échanges" value={String(messagesCount)} />
          <Stat icon={Video} label="Réponses vidéo" value={String(videoAnswersCount)} />
          <Stat icon={Target} label="Critères" value={String(criteriaCount)} />
          <Stat icon={HelpCircle} label="Questions évaluées" value={String(questionsEvaluatedCount)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
