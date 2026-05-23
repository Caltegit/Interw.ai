import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvidenceLinkProps {
  quote?: string | null;
  messageId?: string | null;
  startSeconds?: number | null;
  questionNumber?: number | null;
  onGoToMessage?: (messageId: string, startSeconds?: number) => void;
  compact?: boolean;
}

const MIN_WORDS = 10;
const MAX_CHARS = 140;

function truncate(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  const words = clean.split(" ");
  if (words.length <= MIN_WORDS) return clean;
  // Au moins MIN_WORDS mots, puis on étend jusqu'à MAX_CHARS si possible.
  let out = words.slice(0, MIN_WORDS).join(" ");
  for (let i = MIN_WORDS; i < words.length; i++) {
    const next = out + " " + words[i];
    if (next.length > MAX_CHARS) break;
    out = next;
  }
  return out.replace(/[,;:.!?]+$/, "") + "…";
}

function formatSeconds(s: number) {
  const total = Math.max(0, Math.round(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Affiche une citation du candidat avec, si possible, un bouton play en tête
 * de phrase pour aller au moment exact dans la vidéo, accompagné du repère
 * "Qn t.ss" (numéro de question + position dans la réponse).
 */
export function EvidenceLink({
  quote,
  messageId,
  startSeconds,
  questionNumber,
  onGoToMessage,
  compact = false,
}: EvidenceLinkProps) {
  if (!quote) return null;
  const canJump = !!(messageId && onGoToMessage);
  const shortQuote = truncate(quote, MAX_QUOTE_CHARS);
  const hasMarker =
    typeof questionNumber === "number" && typeof startSeconds === "number" && startSeconds >= 0;

  return (
    <div className={compact ? "mt-1" : "mt-2"}>
      <blockquote className="flex items-center gap-2 border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground">
        {canJump && hasMarker ? (
          <button
            type="button"
            onClick={() => onGoToMessage!(messageId!, startSeconds ?? undefined)}
            title="Moment dans la réponse à cette question"
            aria-label="Voir le moment dans la vidéo"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 not-italic font-medium text-primary tabular-nums transition-colors hover:bg-primary/10 hover:border-primary/50"
          >
            <Play className="h-3 w-3 fill-current" />
            Q{questionNumber} · {formatSeconds(startSeconds!)}
          </button>
        ) : canJump ? (
          <button
            type="button"
            onClick={() => onGoToMessage!(messageId!, startSeconds ?? undefined)}
            title="Voir le moment dans la vidéo"
            aria-label="Voir le moment dans la vidéo"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-primary transition-colors hover:bg-primary/10 hover:border-primary/50"
          >
            <Play className="h-3 w-3 fill-current" />
          </button>
        ) : null}
        <span className="truncate">« {shortQuote} »</span>
      </blockquote>
    </div>
  );
}
