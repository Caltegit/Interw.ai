import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageSquareQuote } from "lucide-react";
import { EvidenceLink } from "./EvidenceLink";
import { cn } from "@/lib/utils";

export interface Signal {
  label: string;
  description?: string;
  severity?: "low" | "medium" | "high";
  quote?: string;
  message_id?: string;
  start_seconds?: number;
  suggested_question?: string;
}

interface Props {
  signals?: Signal[] | null;
  // Fallbacks anciens rapports
  legacyRedFlags?: Array<{
    type?: string;
    severity?: "low" | "medium" | "high";
    description: string;
    evidence?: string;
    evidence_message_id?: string;
  }> | null;
  legacyFollowups?: Array<{ question: string; rationale?: string }> | null;
  onGoToMessage?: (id: string, startSeconds?: number) => void;
}

const sevTone: Record<string, string> = {
  low: "border-warning/40 text-warning",
  medium: "border-warning text-warning",
  high: "border-destructive text-destructive",
};
const sevLabel: Record<string, string> = {
  low: "À noter",
  medium: "À creuser",
  high: "Important",
};

export function SignalsCard({ signals, legacyRedFlags, legacyFollowups, onGoToMessage }: Props) {
  let list: Signal[] = [];
  if (signals && signals.length > 0) {
    list = signals;
  } else {
    if (legacyRedFlags) {
      list.push(
        ...legacyRedFlags.map((f) => ({
          label: f.type || "Signal",
          description: f.description,
          severity: f.severity ?? "medium",
          quote: f.evidence,
          message_id: f.evidence_message_id,
        })),
      );
    }
    if (legacyFollowups) {
      list.push(
        ...legacyFollowups.map((q) => ({
          label: "Question à poser en entretien",
          description: q.rationale,
          severity: "low" as const,
          suggested_question: q.question,
        })),
      );
    }
  }

  if (list.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-left">
          <AlertTriangle className="h-4 w-4 text-warning" /> Signaux à creuser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.map((s, i) => {
          const sev = s.severity ?? "medium";
          return (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{s.label}</p>
                <Badge variant="outline" className={cn("shrink-0", sevTone[sev])}>
                  {sevLabel[sev]}
                </Badge>
              </div>
              {s.description && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.description}</p>
              )}
              <EvidenceLink
                quote={s.quote}
                messageId={s.message_id}
                startSeconds={s.start_seconds}
                onGoToMessage={onGoToMessage}
                compact
              />
              {s.suggested_question && (
                <div className="mt-2 flex items-start gap-2 rounded-md bg-primary/5 p-2">
                  <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      À demander en entretien
                    </p>
                    <p className="text-xs leading-snug text-foreground">{s.suggested_question}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
