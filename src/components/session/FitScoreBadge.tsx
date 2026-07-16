import { MicOff } from "lucide-react";

interface Props {
  score?: number | null;
  size?: number;
  audioFailed?: boolean;
}

export function FitScoreBadge({ score, size = 22, audioFailed }: Props) {
  if (audioFailed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full border border-destructive/40 bg-destructive/15 text-destructive"
        style={{ width: size, height: size }}
        title="Audio défaillant — note non calculée"
      >
        <MicOff style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    );
  }
  const value =
    typeof score === "number" && !Number.isNaN(score)
      ? Math.round(Math.max(0, Math.min(100, score)))
      : null;
  const colorClass =
    value === null
      ? "bg-muted text-muted-foreground border-border"
      : value >= 70
      ? "bg-success/15 text-success border-success/30"
      : value >= 45
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-semibold leading-none ${colorClass}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) }}
      title={
        value === null
          ? "Score non disponible"
          : `Fit Poste : ${value}/100 — moyenne pondérée des critères issue du détail question par question`
      }
    >
      {value === null ? "—" : value}
    </span>
  );
}
