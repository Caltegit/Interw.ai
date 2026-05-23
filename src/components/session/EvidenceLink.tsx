import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvidenceLinkProps {
  quote?: string | null;
  messageId?: string | null;
  startSeconds?: number | null;
  onGoToMessage?: (messageId: string, startSeconds?: number) => void;
  compact?: boolean;
}

const MAX_QUOTE_CHARS = 20;

function truncate(text: string, max: number) {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

/**
 * Affiche une citation du candidat avec, si possible, un bouton play en tête
 * de phrase pour aller au moment exact dans la vidéo.
 */
export function EvidenceLink({ quote, messageId, startSeconds, onGoToMessage, compact = false }: EvidenceLinkProps) {
  if (!quote) return null;
  const canJump = !!(messageId && onGoToMessage);
  const shortQuote = truncate(quote, MAX_QUOTE_CHARS);

  return (
    <div className={compact ? "mt-1" : "mt-2"}>
      <blockquote className="flex items-center gap-2 border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground">
        {canJump && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-primary hover:text-primary"
            onClick={() => onGoToMessage!(messageId!, startSeconds ?? undefined)}
            title="Voir le moment dans la vidéo"
            aria-label="Voir le moment dans la vidéo"
          >
            <Play className="h-3 w-3" />
          </Button>
        )}
        <span className="truncate">« {shortQuote} »</span>
      </blockquote>
    </div>
  );
}
