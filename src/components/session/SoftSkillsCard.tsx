import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem } from "lucide-react";
import { EvidenceLink } from "./EvidenceLink";

interface SoftSkill {
  skill: string;
  score?: number; // 0-10
  quote?: string;
  evidence_message_id?: string;
}

interface Props {
  skills?: SoftSkill[] | null;
  onGoToMessage?: (messageId: string) => void;
}

export function SoftSkillsCard({ skills, onGoToMessage }: Props) {
  if (!skills || skills.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gem className="h-4 w-4" /> Soft skills observées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs italic text-muted-foreground">
            Données insuffisantes dans la transcription.
          </p>
        </CardContent>
      </Card>
    );
  }
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
            <EvidenceLink
              quote={s.quote}
              messageId={s.evidence_message_id}
              onGoToMessage={onGoToMessage}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
