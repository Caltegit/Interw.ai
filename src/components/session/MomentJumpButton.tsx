import { Play } from "lucide-react";

interface Props {
  messageId?: string | null;
  startSeconds?: number | null;
  questionNumber?: number | null;
  onGoToMessage?: (messageId: string, startSeconds?: number) => void;
  className?: string;
}

function formatSeconds(s: number) {
  const total = Math.max(0, Math.round(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Petit bouton « ▶ Qn · m:ss » uniformisé pour pointer vers un moment précis
 * dans les enregistrements vidéo, partagé entre les cartes du rapport.
 */
export function MomentJumpButton({
  messageId,
  startSeconds,
  questionNumber,
  onGoToMessage,
  className,
}: Props) {
  if (!messageId || !onGoToMessage) return null;
  const hasTime = typeof startSeconds === "number" && startSeconds >= 0;
  return (
    <button
      type="button"
      onClick={() => onGoToMessage(messageId, hasTime ? startSeconds! : undefined)}
      title="Moment dans la réponse à cette question"
      className={
        "mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline tabular-nums " +
        (className ?? "")
      }
    >
      <Play className="h-3 w-3" />
      {typeof questionNumber === "number" ? `Q${questionNumber}` : "Voir"}
      {hasTime ? ` · ${formatSeconds(startSeconds!)}` : ""}
    </button>
  );
}
