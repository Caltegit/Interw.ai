import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, ThumbsDown, ThumbsUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceLink } from "./EvidenceLink";

export interface DecisionDriver {
  label: string;
  sentiment?: "positive" | "neutral" | "negative";
  quote?: string;
  message_id?: string;
  start_seconds?: number;
}

interface Props {
  drivers?: DecisionDriver[] | null;
  // Fallbacks pour les anciens rapports
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  onGoToMessage?: (id: string, startSeconds?: number) => void;
}

const sentimentMap = {
  positive: { icon: ThumbsUp, tone: "border-success/40 bg-success/5", iconColor: "text-success" },
  negative: { icon: ThumbsDown, tone: "border-destructive/40 bg-destructive/5", iconColor: "text-destructive" },
  neutral: { icon: Minus, tone: "border-muted bg-muted/30", iconColor: "text-muted-foreground" },
} as const;

export function DecisionDriversCard({ drivers, strengths, weaknesses, onGoToMessage }: Props) {
  // Fallback : reconstruire des drivers à partir des anciens champs
  let list: DecisionDriver[] = [];
  if (drivers && drivers.length > 0) {
    list = drivers;
  } else {
    if (strengths) {
      list.push(...strengths.slice(0, 2).map((s) => ({ label: s, sentiment: "positive" as const })));
    }
    if (weaknesses) {
      list.push(...weaknesses.slice(0, 2).map((s) => ({ label: s, sentiment: "negative" as const })));
    }
  }

  if (list.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-left">
          <Lightbulb className="h-4 w-4 text-primary" /> Pourquoi cette recommandation
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {list.map((d, i) => {
          const conf = sentimentMap[d.sentiment ?? "neutral"];
          const Icon = conf.icon;
          return (
            <div key={i} className={cn("rounded-lg border p-3", conf.tone)}>
              <div className="flex items-start gap-2">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", conf.iconColor)} />
                <p className="text-sm font-medium leading-snug">{d.label}</p>
              </div>
              <EvidenceLink
                quote={d.quote}
                messageId={d.message_id}
                startSeconds={d.start_seconds}
                onGoToMessage={onGoToMessage}
                compact
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
