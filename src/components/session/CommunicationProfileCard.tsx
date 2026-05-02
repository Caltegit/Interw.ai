import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, MessageCircle, Sparkles } from "lucide-react";
import { EvidenceLink } from "./EvidenceLink";
import { cn } from "@/lib/utils";

interface Dimension {
  score?: number; // 0-10
  comment?: string;
  quote?: string;
  message_id?: string;
}

export interface CommunicationProfile {
  clarity?: Dimension;
  structure?: Dimension;
  concision?: Dimension;
  posture?: Dimension;
  energy?: Dimension;
}

interface Props {
  profile?: CommunicationProfile | null;
  onGoToMessage?: (id: string) => void;
}

const groups = [
  {
    title: "Communication",
    icon: MessageCircle,
    keys: ["clarity", "structure", "concision"] as const,
    labels: { clarity: "Clarté", structure: "Structure", concision: "Concision" },
  },
  {
    title: "Posture",
    icon: Activity,
    keys: ["posture"] as const,
    labels: { posture: "Assurance & écoute" },
  },
  {
    title: "Énergie",
    icon: Sparkles,
    keys: ["energy"] as const,
    labels: { energy: "Engagement & enthousiasme" },
  },
];

function scoreColor(score?: number) {
  if (typeof score !== "number") return "bg-muted";
  if (score >= 7) return "bg-success";
  if (score >= 5) return "bg-primary";
  if (score >= 3) return "bg-warning";
  return "bg-destructive";
}

export function CommunicationProfileCard({ profile, onGoToMessage }: Props) {
  if (!profile) return null;
  const hasAny = Object.values(profile).some((d) => d && typeof d.score === "number");
  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-primary" /> Communication & posture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map((g) => {
          const dims = g.keys
            .map((k) => ({ key: k, label: (g.labels as any)[k], dim: (profile as any)[k] as Dimension | undefined }))
            .filter((d) => d.dim && typeof d.dim.score === "number");
          if (dims.length === 0) return null;
          const Icon = g.icon;
          return (
            <div key={g.title}>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3 w-3" /> {g.title}
              </div>
              <div className="space-y-2.5">
                {dims.map(({ key, label, dim }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{label}</span>
                      <span className="font-medium tabular-nums">{dim!.score}/10</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className={cn("h-1.5 rounded-full transition-all", scoreColor(dim!.score))}
                        style={{ width: `${(dim!.score! / 10) * 100}%` }}
                      />
                    </div>
                    {dim!.comment && (
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">{dim!.comment}</p>
                    )}
                    <EvidenceLink
                      quote={dim!.quote}
                      messageId={dim!.message_id}
                      onGoToMessage={onGoToMessage}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
