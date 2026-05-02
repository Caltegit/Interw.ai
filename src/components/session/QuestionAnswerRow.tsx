import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestionAnswerData {
  index: number;
  questionText: string;
  videoUrl?: string | null;
  score: number | null;
  summary?: string | null;
  comment?: string | null;
  keyQuote?: string | null;
  depthLevel?: "surface" | "concret" | "expert" | null;
  hadFollowup?: boolean;
  followupHelped?: boolean;
  candidateAnswerText?: string | null;
}

interface Props {
  data: QuestionAnswerData;
  defaultOpen?: boolean;
}

const depthLabel: Record<string, string> = {
  surface: "Réponse en surface",
  concret: "Exemples concrets",
  expert: "Niveau expert",
};
const depthTone: Record<string, string> = {
  surface: "border-warning/50 text-warning",
  concret: "border-primary/50 text-primary",
  expert: "border-success/50 text-success",
};

function scoreColor(score: number | null) {
  if (score === null) return "border-muted text-muted-foreground";
  if (score >= 7) return "border-success/60 text-success";
  if (score >= 4) return "border-warning/60 text-warning";
  return "border-destructive/60 text-destructive";
}

export function QuestionAnswerRow({ data, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start gap-3">
          <ChevronIcon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Q{data.index + 1}
              </span>
              <h3 className="text-sm font-medium leading-snug">{data.questionText}</h3>
            </div>
            {data.summary && (
              <p className="text-sm leading-relaxed text-foreground">{data.summary}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Badge variant="outline" className={cn("tabular-nums", scoreColor(data.score))}>
                {data.score !== null ? `${data.score}/10` : "Non évalué"}
              </Badge>
              {data.depthLevel && (
                <Badge variant="outline" className={depthTone[data.depthLevel]}>
                  {depthLabel[data.depthLevel]}
                </Badge>
              )}
              {data.hadFollowup && (
                <Badge variant="outline" className="border-primary/40 text-primary gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {data.followupHelped ? "Relance utile" : "Relance"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t bg-muted/20 p-4">
          {data.videoUrl && (
            <div className="overflow-hidden rounded-lg bg-black aspect-video">
              <video
                src={data.videoUrl}
                controls
                preload="metadata"
                className="h-full w-full object-contain"
              />
            </div>
          )}

          {data.candidateAnswerText && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Réponse retranscrite
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.candidateAnswerText}</p>
            </div>
          )}

          {data.keyQuote && (
            <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-foreground">
              « {data.keyQuote} »
            </blockquote>
          )}

          {data.comment && (
            <div className="rounded-md bg-card p-3">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" /> Analyse IA
              </p>
              <p className="text-sm leading-relaxed text-foreground">{data.comment}</p>
            </div>
          )}

          {!data.candidateAnswerText && !data.comment && !data.keyQuote && (
            <p className="text-xs italic text-muted-foreground">
              Aucun détail supplémentaire disponible pour cette réponse.
            </p>
          )}

          {data.hadFollowup && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                const evt = new CustomEvent("session-detail:open-transcript", {
                  detail: { questionIndex: data.index },
                });
                window.dispatchEvent(evt);
              }}
            >
              Voir le détail des relances dans la transcription
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
