import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceLink } from "./EvidenceLink";

interface ParaverbalDim {
  score?: number;
  comment?: string;
  evidence_message_id?: string;
  evidence_start_seconds?: number;
  evidence_quote?: string;
}

export interface ParaverbalProfile {
  fluency?: ParaverbalDim;
  hesitation?: ParaverbalDim;
  intonation?: ParaverbalDim;
  energy?: ParaverbalDim;
  vocal_confidence?: ParaverbalDim;
  vocal_stress?: ParaverbalDim;
}

export interface ParaverbalAnalysis {
  profile?: ParaverbalProfile | null;
  summary?: string | null;
  segments_analyzed?: number;
}

const DIMENSIONS: { key: keyof ParaverbalProfile; label: string }[] = [
  { key: "fluency", label: "Fluidité du débit" },
  { key: "hesitation", label: "Maîtrise des hésitations" },
  { key: "intonation", label: "Intonation" },
  { key: "energy", label: "Énergie vocale" },
  { key: "vocal_confidence", label: "Assurance vocale" },
  { key: "vocal_stress", label: "Sérénité" },
];

function scoreColor(score?: number) {
  if (typeof score !== "number") return "bg-muted";
  if (score >= 7) return "bg-success";
  if (score >= 5) return "bg-primary";
  if (score >= 3) return "bg-warning";
  return "bg-destructive";
}

interface Props {
  analysis?: ParaverbalAnalysis | null;
  onGoToMessage?: (id: string, startSeconds?: number) => void;
  questionNumberByMessageId?: Record<string, number>;
  transcriptsByMessageId?: Record<string, string>;
  /**
   * L'analyse paraverbale peut s'appuyer sur un segment audio seul.
   * Pour que le bouton « Voir » ouvre le clip vidéo de la même question,
   * on résout le message_id vers le message vidéo équivalent (même
   * `question_id`). Retourne `undefined` si aucune vidéo n'existe.
   */
  resolveVideoMessageId?: (messageId: string) => string | undefined;
}

export function ParaverbalProfileCard({
  analysis,
  onGoToMessage,
  questionNumberByMessageId,
  transcriptsByMessageId,
  resolveVideoMessageId,
}: Props) {
  if (!analysis?.profile) return null;
  const profile = analysis.profile;
  const dims = DIMENSIONS.filter((d) => {
    const v = profile[d.key];
    return v && typeof v.score === "number";
  });
  if (dims.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-left">
          <Mic className="h-4 w-4 text-primary" /> Communication orale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
        )}
        <div className="space-y-2.5">
          {dims.map(({ key, label }) => {
            const dim = profile[key]!;
            const videoMessageId = dim.evidence_message_id
              ? resolveVideoMessageId?.(dim.evidence_message_id)
              : undefined;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-medium tabular-nums">{dim.score}/10</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className={cn("h-1.5 rounded-full transition-all", scoreColor(dim.score))}
                    style={{ width: `${(Math.max(0, Math.min(10, dim.score!)) / 10) * 100}%` }}
                  />
                </div>
                {dim.comment && (
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{dim.comment}</p>
                )}
                <EvidenceLink
                  quote={dim.evidence_quote || (dim.evidence_message_id ? transcriptsByMessageId?.[dim.evidence_message_id] : undefined)}
                  messageId={videoMessageId}
                  startSeconds={undefined}
                  questionNumber={videoMessageId ? questionNumberByMessageId?.[videoMessageId] : undefined}
                  onGoToMessage={videoMessageId ? onGoToMessage : undefined}
                  compact
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
