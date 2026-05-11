import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvidenceLinkProps {
  quote?: string | null;
  messageId?: string | null;
  startSeconds?: number | null;
  onGoToMessage?: (messageId: string, startSeconds?: number) => void;
  compact?: boolean;
}

/**
 * Affiche une citation du candidat avec, si possible, un bouton pour aller
 * écouter / lire le moment exact dans la vidéo.
 */
export function EvidenceLink({ quote, messageId, startSeconds, onGoToMessage, compact = false }: EvidenceLinkProps) {
  if (!quote) return null;
  const canJump = !!(messageId && onGoToMessage);

  return (
    <div className={compact ? "mt-1" : "mt-2"}>
      <blockquote className="border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground">
        « {quote} »
      </blockquote>
      {canJump && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-6 gap-1 px-2 text-xs text-primary hover:text-primary"
          onClick={() => onGoToMessage!(messageId!, startSeconds ?? undefined)}
        >
          <Play className="h-3 w-3" /> Voir le moment
        </Button>
      )}
    </div>
  );
}
