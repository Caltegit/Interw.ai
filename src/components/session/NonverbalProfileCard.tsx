import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceLink } from "./EvidenceLink";

interface NonverbalDim {
  score?: number;
  comment?: string;
  evidence_message_id?: string;
  evidence_start_seconds?: number;
}

export interface NonverbalProfile {
  eye_contact?: NonverbalDim;
  posture?: NonverbalDim;
  gestures?: NonverbalDim;
  facial_expressivity?: NonverbalDim;
}

export interface MicroTension {
  message_id: string;
  description: string;
  start_seconds?: number;
}

export interface NonverbalAnalysis {
  profile?: NonverbalProfile | null;
  micro_tensions?: MicroTension[];
  summary?: string | null;
  segments_analyzed?: number;
  status?: string;
}

const DIMENSIONS: { key: keyof NonverbalProfile; label: string }[] = [
  { key: "eye_contact", label: "Contact visuel" },
  { key: "posture", label: "Posture" },
  { key: "gestures", label: "Gestuelle" },
  { key: "facial_expressivity", label: "Expressivité du visage" },
];

function scoreColor(score?: number) {
  if (typeof score !== "number") return "bg-muted";
  if (score >= 7) return "bg-success";
  if (score >= 5) return "bg-primary";
  if (score >= 3) return "bg-warning";
  return "bg-destructive";
}

interface Props {
  analysis?: NonverbalAnalysis | null;
  onGoToMessage?: (id: string, startSeconds?: number) => void;
  questionNumberByMessageId?: Record<string, number>;
  transcriptsByMessageId?: Record<string, string>;
  /**
   * Résout le `message_id` d'une evidence vers le `message_id` du clip
   * vidéo de la même question. Permet au bouton « Voir » d'ouvrir le
   * bon clip dans le lecteur, qui ne référence que les messages vidéo.
   */
  resolveVideoMessageId?: (messageId: string) => string | undefined;
}

export function NonverbalProfileCard({
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

  const tensions = (analysis.micro_tensions ?? []).filter((t) => t?.description);

  const resolve = (id?: string | null) =>
    id ? (resolveVideoMessageId?.(id) ?? undefined) : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-left">
          <User className="h-4 w-4 text-primary" /> Attitude et langage corporel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
        )}
        <div className="space-y-2.5">
          {dims.map(({ key, label }) => {
            const dim = profile[key]!;
            const videoMessageId = resolve(dim.evidence_message_id);
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
                  quote={dim.evidence_message_id ? transcriptsByMessageId?.[dim.evidence_message_id] : undefined}
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

        {tensions.length > 0 && (
          <div className="space-y-2 rounded-md border border-warning/30 bg-warning/5 p-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-warning">
              <AlertCircle className="h-3.5 w-3.5" /> Points d'attention
            </div>
            <ul className="space-y-1.5">
              {tensions.map((t, i) => {
                const videoMessageId = resolve(t.message_id);
                return (
                  <li key={i}>
                    <EvidenceLink
                      quote={t.description}
                      messageId={videoMessageId}
                      startSeconds={undefined}
                      questionNumber={videoMessageId ? questionNumberByMessageId?.[videoMessageId] : undefined}
                      onGoToMessage={videoMessageId ? onGoToMessage : undefined}
                      compact
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
